import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { DriverIncomingOfferDto } from './driver-incoming-offer.dto';

export class ListDriverRequestsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriverIncomingOfferDto)
  requests!: DriverIncomingOfferDto[];
}
