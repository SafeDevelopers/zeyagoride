import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { RideStatus } from '../enums/ride-status.enum';
import { VehicleType } from '../enums/vehicle-type.enum';
import { ProfileType } from '../enums/profile-type.enum';
import { FareEstimateDto } from './fare-estimate.dto';
import { LatLngDto } from './lat-lng.dto';
import { RideStopDto } from './ride-stop.dto';

/** Matches mobile `RideSummary`. */
export class RideSummaryDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  riderId?: string | null;

  @IsOptional()
  @IsString()
  driverId?: string | null;

  @IsEnum(RideStatus)
  status!: RideStatus;

  @IsString()
  pickup!: string;

  @IsString()
  destination!: string;

  @IsString()
  pickupAddress!: string;

  @IsString()
  destinationAddress!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  pickupCoords!: LatLngDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  destinationCoords!: LatLngDto | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RideStopDto)
  stops!: RideStopDto[];

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsEnum(ProfileType)
  profileType!: ProfileType;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;

  @IsOptional()
  @IsNumber()
  distanceMeters?: number;

  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => FareEstimateDto)
  fareEstimate?: FareEstimateDto;
}
