import { Controller, Get } from '@nestjs/common';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationService,
  ) {}

  @Get()
  async get() {
    return this.buildHealthPayload();
  }

  @Get('live')
  live() {
    return { status: 'ok', ok: true, timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    return this.buildHealthPayload();
  }

  private async buildHealthPayload() {
    let dbOk = false;
    let dbDetail: string | undefined;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch (e) {
      dbDetail = e instanceof Error ? e.message : String(e);
    }

    const storage = await this.storage.healthCheck();
    const notifications = await this.notifications.healthCheck();

    const ok = dbOk && storage.ok && notifications.ok;
    return {
      status: ok ? 'ok' : 'degraded',
      ok,
      database: { ok: dbOk, detail: dbDetail },
      storage,
      notifications,
      timestamp: new Date().toISOString(),
    };
  }
}
