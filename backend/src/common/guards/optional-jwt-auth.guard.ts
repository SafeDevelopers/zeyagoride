import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

/**
 * Placeholder: allows all requests (mock-safe). When `Authorization: Bearer <token>`
 * is present, stores raw token on `req.authToken` for future JWT verification.
 * TODO: Replace with JwtAuthGuard + JwtStrategy verifying `verify-otp` issued tokens.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; authToken?: string }>();
    const auth = req.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      req.authToken = auth.slice('Bearer '.length).trim();
    }
    return true;
  }
}
