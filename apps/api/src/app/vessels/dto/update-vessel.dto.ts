import { PartialType } from '@nestjs/swagger';
import { CreateVesselDto } from './create-vessel.dto';

export class UpdateVesselDto extends PartialType(CreateVesselDto) {}