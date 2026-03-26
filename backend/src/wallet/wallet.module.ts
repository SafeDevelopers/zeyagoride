import { Global, Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletService } from './wallet.service';

@Global()
@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
