import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FareEstimateDto } from '../../common/dto/fare-estimate.dto';
import { LatLngDto } from '../../common/dto/lat-lng.dto';
import { RideStopDto } from '../../common/dto/ride-stop.dto';
import { ProfileType } from '../../common/enums/profile-type.enum';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

/** Matches mobile `RequestRideRequest`. */
export class RequestRideDto {
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
