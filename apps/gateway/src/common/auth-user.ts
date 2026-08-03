import { Role } from '@fleet/database';

export interface AuthUser {
  sub: string;
  login: string;
  role: Role;
  organizationId: string | null;
  sessionId: string;
  fullName: string;
  locale: string;
}

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}
