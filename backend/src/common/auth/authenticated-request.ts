import type { Request } from 'express';
import type { SessionUserDto } from '../dto/session-user.dto';

export type AuthenticatedRequest = Request & {
  user?: SessionUserDto & { sessionId?: string };
  requestId?: string;
};
