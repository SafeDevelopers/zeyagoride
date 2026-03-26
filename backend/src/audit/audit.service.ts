import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { getRequestId } from '../common/logging/request-context';
import { StructuredLogger } from '../common/logging/structured-logger';
import { SessionUserRole } from '../common/enums/session-user-role.enum';

type AuditActor = {
  id: string;
  role: SessionUserRole;
};

@Injectable()
export class AuditService {
  private readonly logger = new StructuredLogger(AuditService.name);

  async recordAdminAction(
    prisma: PrismaClient | Prisma.TransactionClient,
    input: {
      actor: AuditActor;
      action: string;
      targetType: string;
      targetId?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await prisma.adminAuditLog.create({
      data: {
        actorId: input.actor.id,
        actorRole: input.actor.role,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        requestId: getRequestId() ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });

    this.logger.log('audit.admin_action_recorded', {
      actorId: input.actor.id,
      actorRole: input.actor.role,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
    });
  }
}
