// apps/api/src/app/volta-depth/volta-depth.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { VoltaDepthService } from './volta-depth.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { CommitUploadDto } from './dto/commit-upload.dto';
import { TileInfoDto } from './dto/tile-info.dto';

@ApiTags('volta-depth')
@Controller('volta-depth')
export class VoltaDepthController {
  private readonly logger = new Logger(VoltaDepthController.name);

  constructor(private readonly voltaDepthService: VoltaDepthService) {}

  /**
   * Stage 1: Upload GeoJSON, validate, store temporarily.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // Adjust maxSize as needed (e.g., 50MB)
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          // Accept multiple JSON-related MIME types
          new FileTypeValidator({ 
            fileType: /(application\/json|application\/geo\+json|text\/plain)/,
          }),
        ],
        fileIsRequired: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
      }),
    ) file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    this.logger.log(`Received file upload: ${file.originalname}, Size: ${file.size} bytes, MIME: ${file.mimetype}`);
    
    // Additional check to ensure the file has JSON content, regardless of MIME type
    try {
      // Basic check that the file contains valid JSON
      const content = file.buffer.toString('utf8');
      JSON.parse(content);
    } catch (e) {
      this.logger.error(`File contains invalid JSON: ${e.message}`);
      throw new Error('The uploaded file does not contain valid JSON content');
    }
    
    // Service handles parsing, validation, tile deduction, temp storage
    return this.voltaDepthService.processUpload(file);
  }

  /**
   * Stage 2: Commit the temporarily stored upload to the database.
   */
  @Post('commit')
  @HttpCode(HttpStatus.OK)
  async commitUpload(
    @Body() commitDto: CommitUploadDto,
  ): Promise<{ message: string; tileId: string }> {
    this.logger.log(`Received commit request for upload ID: ${commitDto.uploadId}`);
    // Service handles retrieving cached data, transaction, persistence, cache cleanup
    const resultTile = await this.voltaDepthService.commitUpload(commitDto.uploadId);
    return { message: 'Tile data committed successfully.', tileId: resultTile.id };
  }

  /**
   * Get list of tiles that have been uploaded.
   */
  @Get('tiles')
  async listTiles(): Promise<TileInfoDto[]> {
    this.logger.log('Request received to list all tiles');
    return this.voltaDepthService.listTiles();
  }

  /**
   * Get details for a specific uploaded tile.
   */
  @Get('tiles/:tileId')
  async getTileInfo(@Param('tileId') tileId: string): Promise<TileInfoDto> {
    this.logger.log(`Request received for tile info: ${tileId}`);
    return this.voltaDepthService.getTileInfo(tileId);
  }

    /**
   * Delete a specific tile and all its features.
   */
    @Delete('tiles/:tileId')
    @HttpCode(HttpStatus.OK)
    async deleteTile(@Param('tileId') tileId: string): Promise<{ message: string; tileId: string }> {
      this.logger.log(`Request received to delete tile: ${tileId}`);
      await this.voltaDepthService.deleteTile(tileId);
      return { message: 'Tile and associated features deleted successfully.', tileId };
    }
}