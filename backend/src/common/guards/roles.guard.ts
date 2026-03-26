import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SessionUserRole } from '../enums/session-user-role.enum';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<SessionUserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new ForbiddenException('role_required');
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenException('insufficient_role');
    }
    return true;
  }
}
