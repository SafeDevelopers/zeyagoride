import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AppStateModule } from './app-state/app-state.module';
import { AuthModule } from './auth/auth.module';
import { DriverModule } from './driver/driver.module';
import { validateEnvConfig } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RidesModule } from './rides/rides.module';
import { StorageModule } from './storage/storage.module';
import { AdminController } from './admin/admin.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvConfig,
      ignoreEnvFile: true,
    }),
    PrismaModule,
    AuditModule,
    StorageModule,
    HealthModule,
    AppStateModule,
    AuthModule,
    RidesModule,
    DriverModule,
    RealtimeModule,
  ],
  controllers: [AppController, AdminController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AppModule {}
