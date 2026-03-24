import { Global, Module } from '@nestjs/common';
import { AppStateService } from './app-state.service';

@Global()
@Module({
  providers: [AppStateService],
  exports: [AppStateService],
})
export class AppStateModule {}
