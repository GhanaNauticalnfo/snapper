import { PartialType } from '@nestjs/swagger';
import { CreateLandingSiteDto } from './create-landing-site.dto';

export class UpdateLandingSiteDto extends PartialType(CreateLandingSiteDto) {}