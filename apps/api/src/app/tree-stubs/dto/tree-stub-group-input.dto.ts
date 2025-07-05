import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class TreeStubGroupInputDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}