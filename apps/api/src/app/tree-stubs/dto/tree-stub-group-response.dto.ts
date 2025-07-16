import { ApiProperty } from '@nestjs/swagger';
import { TreeStubGroupResponseDto as ITreeStubGroupResponseDto } from '@ghanawaters/shared-models';

export class TreeStubGroupResponseDto implements ITreeStubGroupResponseDto {
  @ApiProperty({ description: 'Unique identifier for the tree stub group' })
  id: number;

  @ApiProperty({ description: 'Name of the tree stub group' })
  name: string;

  @ApiProperty({ description: 'Whether the group is enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Timestamp when the group was created', type: String })
  created_at: string;

  @ApiProperty({ description: 'Timestamp when the group was last updated', type: String })
  updated_at: string;

  @ApiProperty({ description: 'Number of tree stubs in this group' })
  tree_stub_count: number;
}