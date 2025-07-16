// apps/api/src/app/volta-depth/dto/commit-upload.dto.ts
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommitUpload } from '@ghanawaters/shared-models';

export class CommitUploadDto implements CommitUpload {
  @ApiProperty({
    description: 'The unique identifier for the upload session, received from the /upload endpoint response. Must be a valid Version 4 UUID.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
  })
  @IsUUID('4', { message: 'Invalid upload ID format.' }) // Validate as UUID v4
  @IsNotEmpty({ message: 'Upload ID cannot be empty.' }) // Ensure it's provided
  uploadId: string;
}