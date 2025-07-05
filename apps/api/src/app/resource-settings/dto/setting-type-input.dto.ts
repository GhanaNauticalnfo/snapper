import { IsString, IsBoolean, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SettingTypeInputDto {
  @ApiProperty({ 
    description: 'User-friendly display name for the setting',
    example: 'Contact Number',
    maxLength: 100
  })
  @IsString()
  @MaxLength(100)
  display_name: string;

  @ApiPropertyOptional({ 
    description: 'Data type of the setting value',
    enum: ['string', 'number', 'boolean'],
    default: 'string'
  })
  @IsOptional()
  @IsString()
  @IsIn(['string', 'number', 'boolean'])
  data_type?: string = 'string';

  @ApiPropertyOptional({ 
    description: 'Whether this setting is required for the resource',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean = false;
}