import { IsNumber, IsString } from 'class-validator';

export class TreeStubInputDto {
  @IsNumber()
  group_id: number;

  @IsString()
  geometry: string; // GeoJSON string or WKT
}