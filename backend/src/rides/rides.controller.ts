import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { SessionUserDto } from '../common/dto/session-user.dto';
import { SessionUserRole } from '../common/enums/session-user-role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CancelRideBodyDto } from './dto/cancel-ride-body.dto';
import { RequestRideDto } from './dto/request-ride.dto';
import { RidesService } from './rides.service';

@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SessionUserRole.Rider)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  create(@CurrentUser() user: SessionUserDto, @Body() body: RequestRideDto) {
    return this.ridesService.create(user.id, body);
  }

  @Get('notifications')
  listNotifications(@CurrentUser() user: SessionUserDto) {
    return this.ridesService.listNotifications(user.id);
  }

  @Get(':rideId')
  findOne(@CurrentUser() user: SessionUserDto, @Param('rideId') rideId: string) {
    return this.ridesService.findOne(user.id, rideId);
  }

  @Delete(':rideId')
  cancel(
    @CurrentUser() user: SessionUserDto,
    @Param('rideId') rideId: string,
    @Body() body?: CancelRideBodyDto,
  ) {
    return this.ridesService.cancel(user.id, rideId, body);
  }
}
