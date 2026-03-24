import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppStateModule } from './app-state/app-state.module';
import { AuthModule } from './auth/auth.module';
import { DriverModule } from './driver/driver.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RidesModule } from './rides/rides.module';
import { AdminController } from './admin/admin.controller';

@Module({
  imports: [PrismaModule, AppStateModule, AuthModule, RidesModule, DriverModule, RealtimeModule],
  controllers: [AppController, AdminController],
})
export class AppModule {}
