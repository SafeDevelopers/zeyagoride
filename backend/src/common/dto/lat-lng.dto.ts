import { IsNumber } from 'class-validator';

/** WGS84 — matches mobile `LatLng`. */
export class LatLngDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}
