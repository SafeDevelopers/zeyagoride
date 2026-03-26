import { SetMetadata } from '@nestjs/common';
import { SessionUserRole } from '../enums/session-user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: SessionUserRole[]) => SetMetadata(ROLES_KEY, roles);
