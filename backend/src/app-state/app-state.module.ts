import { Global, Module } from '@nestjs/common';
import { AppStateService } from './app-state.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentProviderService } from '../payments/payment-provider.service';
import { WalletModule } from '../wallet/wallet.module';

@Global()
@Module({
  imports: [WalletModule, NotificationsModule],
  providers: [AppStateService, PaymentProviderService],
  exports: [AppStateService, PaymentProviderService],
})
export class AppStateModule {}
