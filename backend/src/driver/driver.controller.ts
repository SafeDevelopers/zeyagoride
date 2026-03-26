import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUserDto } from '../common/dto/session-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SessionUserRole } from '../common/enums/session-user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { DriverAvailabilityDto } from './dto/driver-availability.dto';
import { AcceptRideDto } from './dto/accept-ride.dto';
import { CompleteTripDto } from './dto/complete-trip.dto';
import { CreateTopUpDto } from './dto/create-top-up.dto';
import { DeclineRideDto } from './dto/decline-ride.dto';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { DriverService } from './driver.service';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SessionUserRole.Driver)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Put('availability')
  setAvailability(@CurrentUser() user: SessionUserDto, @Body() body: DriverAvailabilityDto) {
    return this.driverService.setAvailability(user.id, body.online);
  }

  @Get('profile')
  profile(@CurrentUser() user: SessionUserDto) {
    return this.driverService.getProfile(user.id);
  }

  @Get('incoming-requests')
  incomingRequests(@CurrentUser() user: SessionUserDto) {
    return this.driverService.listIncomingRequests(user.id);
  }

  @Post('requests/:requestId/accept')
  accept(
    @CurrentUser() user: SessionUserDto,
    @Param('requestId') requestId: string,
    @Body() body: AcceptRideDto,
  ) {
    return this.driverService.accept(user.id, requestId, body);
  }

  @Post('requests/:requestId/decline')
  decline(
    @CurrentUser() user: SessionUserDto,
    @Param('requestId') requestId: string,
    @Body() body: DeclineRideDto,
  ) {
    return this.driverService.decline(user.id, requestId, body);
  }

  @Get('trips/:tripId')
  getTrip(@CurrentUser() user: SessionUserDto, @Param('tripId') tripId: string) {
    return this.driverService.getTrip(user.id, tripId);
  }

  @Post('trips/:tripId/arrive')
  arriveAtPickup(@CurrentUser() user: SessionUserDto, @Param('tripId') tripId: string) {
    return this.driverService.arriveAtPickup(user.id, tripId);
  }

  @Post('trips/:tripId/start')
  startTrip(@CurrentUser() user: SessionUserDto, @Param('tripId') tripId: string) {
    return this.driverService.startTrip(user.id, tripId);
  }

  @Post('trips/:tripId/complete')
  completeTrip(
    @CurrentUser() user: SessionUserDto,
    @Param('tripId') tripId: string,
    @Body() body: CompleteTripDto,
  ) {
    return this.driverService.completeTrip(user.id, tripId, body);
  }

  @Get('wallet')
  wallet(@CurrentUser() user: SessionUserDto) {
    return this.driverService.getWallet(user.id);
  }

  @Put('vehicle')
  updateVehicle(
    @CurrentUser() user: SessionUserDto,
    @Body()
    body: {
      make: string;
      model: string;
      color: string;
      capacity: number;
      tagNumber: string;
      insuranceExpiry?: string;
    },
  ) {
    return this.driverService.updateVehicle(user.id, body);
  }

  @Get('wallet/transactions')
  walletTransactions(@CurrentUser() user: SessionUserDto) {
    return this.driverService.listWalletTransactions(user.id);
  }

  @Post('wallet/top-up-requests')
  submitTopUp(@CurrentUser() user: SessionUserDto, @Body() body: CreateTopUpDto) {
    return this.driverService.submitTopUp(user.id, body);
  }

  @Get('wallet/top-up-requests')
  listTopUpRequests(@CurrentUser() user: SessionUserDto) {
    return this.driverService.listTopUpRequests(user.id);
  }

  @Put('wallet/top-up-requests/:requestId/proof')
  @UseInterceptors(
    FileInterceptor('proof', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadTopUpProof(
    @CurrentUser() user: SessionUserDto,
    @Param('requestId') requestId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('proof_required');
    }
    return this.driverService.uploadTopUpProof(user.id, requestId, file);
  }

  @Get('notifications')
  listNotifications(@CurrentUser() user: SessionUserDto) {
    return this.driverService.listNotifications(user.id);
  }

  @Put('notifications/read')
  markNotificationsRead(@CurrentUser() user: SessionUserDto, @Body() body: MarkNotificationsReadDto) {
    return this.driverService.markNotificationsRead(user.id, body);
  }
}
