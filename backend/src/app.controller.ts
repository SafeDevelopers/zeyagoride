import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppStateService } from './app-state/app-state.service';

/** Root URL — JSON service map (no hardcoded host; use API_PUBLIC_URL in env). */
@Controller()
export class AppController {
  constructor(
    private readonly appState: AppStateService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  root() {
    const apiPublicUrl = this.config.get<string>('API_PUBLIC_URL');
    return {
      name: 'zeyago-backend',
      ok: true,
      apiPublicUrl: apiPublicUrl ?? null,
      appPublicUrl: this.config.get<string>('APP_PUBLIC_URL') ?? null,
      adminPublicUrl: this.config.get<string>('ADMIN_PUBLIC_URL') ?? null,
      routes: {
        health: '/health',
        auth: '/auth',
        rides: '/rides',
        driver: '/driver',
        admin: '/admin',
        appSettings: '/app/settings',
        storage: '/storage',
      },
    };
  }

  @Get('app/settings')
  appSettings() {
    return this.appState.getAppSettings();
  }
}
