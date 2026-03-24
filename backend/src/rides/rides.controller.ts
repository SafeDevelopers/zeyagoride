import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CancelRideBodyDto } from './dto/cancel-ride-body.dto';
import { RequestRideDto } from './dto/request-ride.dto';
import { RidesService } from './rides.service';

@Controller('rides')
@UseGuards(OptionalJwtAuthGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  create(@Body() body: RequestRideDto) {
    return this.ridesService.create(body);
  }

  @Get(':rideId')
  findOne(@Param('rideId') rideId: string) {
    return this.ridesService.findOne(rideId);
  }

  @Delete(':rideId')
  cancel(
    @Param('rideId') rideId: string,
    @Body() body?: CancelRideBodyDto,
  ) {
    return this.ridesService.cancel(rideId, body);
  }
}
