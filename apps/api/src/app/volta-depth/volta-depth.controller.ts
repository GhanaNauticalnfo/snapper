// apps/api/src/app/volta-depth/volta-depth.controller.ts
import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    HttpCode,
    HttpStatus,
    Logger, // Import Logger
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { Express } from 'express'; // Import Express types
  import { VoltaDepthService } from './volta-depth.service';
  import { UploadResponseDto } from './dto/upload-response.dto';
  import { CommitUploadDto } from './dto/commit-upload.dto';
  import { TileInfoDto } from './dto/tile-info.dto';
  
  @Controller('volta-depth') // Base path for all routes in this controller
  export class VoltaDepthController {
    private readonly logger = new Logger(VoltaDepthController.name); // Instantiate Logger
  
    constructor(private readonly voltaDepthService: VoltaDepthService) {}
  
    /**
     * Stage 1: Upload GeoJSON, validate, store temporarily.
     */
    @Post('upload') // Route: POST /volta-depth/upload
    @UseInterceptors(FileInterceptor('file')) // Expect a multipart field named 'file'
    async uploadFile(
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            // Adjust maxSize as needed (e.g., 50MB)
            new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
            // Basic check, service does deeper validation
            new FileTypeValidator({ fileType: 'application/json' }),
          ],
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        }),
      ) file: Express.Multer.File,
    ): Promise<UploadResponseDto> {
      this.logger.log(`Received file upload: ${file.originalname}, Size: ${file.size} bytes`);
      // Service handles parsing, validation, tile deduction, temp storage
      return this.voltaDepthService.processUpload(file);
    }
  
    /**
     * Stage 2: Commit the temporarily stored upload to the database.
     */
    @Post('commit') // Route: POST /volta-depth/commit
    @HttpCode(HttpStatus.OK) // Return 200 OK on successful commit/replacement
    async commitUpload(
      @Body() commitDto: CommitUploadDto, // Validate request body using DTO
    ): Promise<{ message: string; tileId: string }> {
      this.logger.log(`Received commit request for upload ID: ${commitDto.uploadId}`);
      // Service handles retrieving cached data, transaction, persistence, cache cleanup
      const resultTile = await this.voltaDepthService.commitUpload(commitDto.uploadId);
      return { message: 'Tile data committed successfully.', tileId: resultTile.id };
    }
  
    /**
     * Get list of tiles that have been uploaded.
     * Uses plural noun convention for the collection resource.
     */
    @Get('tiles') // Route: GET /volta-depth/tiles
    async listTiles(): Promise<TileInfoDto[]> {
      this.logger.log('Request received to list all tiles');
      return this.voltaDepthService.listTiles();
    }
  
    /**
     * Get details for a specific uploaded tile.
     * Uses plural noun + ID convention for specific resource.
     */
    @Get('tiles/:tileId') // Route: GET /volta-depth/tiles/AA (example)
    async getTileInfo(@Param('tileId') tileId: string): Promise<TileInfoDto> {
      this.logger.log(`Request received for tile info: ${tileId}`);
      return this.voltaDepthService.getTileInfo(tileId);
    }
  }