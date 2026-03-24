import { Controller, Get } from '@nestjs/common';
import { AppStateService } from '../app-state/app-state.service';

/**
 * Read-only admin overview — same `AppStateService` as mobile rider/driver.
 * No auth in demo; tighten before production.
 */
@Controller('admin')
export class AdminController {
  constructor(private readonly appState: AppStateService) {}

  @Get('overview')
  overview() {
    return this.appState.getAdminOverview();
  }
}
