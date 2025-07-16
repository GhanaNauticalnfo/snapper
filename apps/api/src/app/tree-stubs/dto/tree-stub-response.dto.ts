import { ApiProperty } from '@nestjs/swagger';
import { TreeStubResponseDto as ITreeStubResponseDto } from '@ghanawaters/shared-models';

export class TreeStubResponseDto implements ITreeStubResponseDto {
  @ApiProperty({ description: 'Unique identifier for the tree stub' })
  id: number;

  @ApiProperty({ description: 'ID of the group this stub belongs to' })
  group_id: number;

  @ApiProperty({ description: 'Geometry data as GeoJSON or WKT string' })
  geometry: string;

  @ApiProperty({ description: 'Timestamp when the stub was created', type: String })
  created_at: string;

  @ApiProperty({ description: 'Timestamp when the stub was last updated', type: String })
  updated_at: string;
}