import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const raw = req.headers.authorization;
    if (!raw?.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing_bearer_token');
    }

    const token = raw.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('missing_bearer_token');
    }

    req.user = await this.authService.authenticateAccessToken(token);
    return true;
  }
}
