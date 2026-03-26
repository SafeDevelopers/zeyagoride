import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function isPrismaInitError(e: unknown): e is { message: string; errorCode?: string } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string' &&
    'clientVersion' in e
  );
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (e) {
      if (isPrismaInitError(e)) {
        this.log.error(
          `Prisma ${e.errorCode ?? 'init'}: ${e.message}. Check: Postgres is running; DATABASE_URL in repo root .env and/or backend/.env; user/database exist. On macOS, try 127.0.0.1 instead of localhost in DATABASE_URL.`,
        );
      }
      throw e;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
