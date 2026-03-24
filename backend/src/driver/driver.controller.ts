import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { DriverAvailabilityDto } from './dto/driver-availability.dto';
import { AcceptRideDto } from './dto/accept-ride.dto';
import { DeclineRideDto } from './dto/decline-ride.dto';
import { DriverService } from './driver.service';

@Controller('driver')
@UseGuards(OptionalJwtAuthGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Put('availability')
  setAvailability(@Body() body: DriverAvailabilityDto) {
    return this.driverService.setAvailability(body.online);
  }

  @Get('incoming-requests')
  incomingRequests() {
    return this.driverService.listIncomingRequests();
  }

  @Post('requests/:requestId/accept')
  accept(
    @Param('requestId') requestId: string,
    @Body() body: AcceptRideDto,
  ) {
    return this.driverService.accept(requestId, body);
  }

  @Post('requests/:requestId/decline')
  decline(
    @Param('requestId') requestId: string,
    @Body() body: DeclineRideDto,
  ) {
    return this.driverService.decline(requestId, body);
  }

  @Get('trips/:tripId')
  getTrip(@Param('tripId') tripId: string) {
    return this.driverService.getTrip(tripId);
  }

  @Post('trips/:tripId/arrive')
  arriveAtPickup(@Param('tripId') tripId: string) {
    return this.driverService.arriveAtPickup(tripId);
  }

  @Post('trips/:tripId/start')
  startTrip(@Param('tripId') tripId: string) {
    return this.driverService.startTrip(tripId);
  }

  @Post('trips/:tripId/complete')
  completeTrip(@Param('tripId') tripId: string) {
    return this.driverService.completeTrip(tripId);
  }
}
