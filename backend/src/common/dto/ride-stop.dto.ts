import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { LatLngDto } from './lat-lng.dto';

/** Matches mobile `RideStop`. */
export class RideStopDto {
  @IsString()
  address!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  coords!: LatLngDto | null;
}
