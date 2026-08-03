import { ForbiddenException } from '@nestjs/common';
import { Role } from '@fleet/database';
import { AuthUser } from './auth-user';

export const resolveOrganizationId = (user: AuthUser, requested?: string | null): string => {
  if (user.role === Role.SUPERADMIN) {
    if (!requested) throw new ForbiddenException('organizationId is required for superadmin requests');
    return requested;
  }
  if (!user.organizationId) throw new ForbiddenException('User is not bound to an organization');
  if (requested && requested !== user.organizationId) throw new ForbiddenException('Cross-tenant access denied');
  return user.organizationId;
};

export const paginationOf = (page?: string | number, pageSize?: string | number) => {
  const parsedPage = Math.max(1, Number.parseInt(String(page ?? 1), 10) || 1);
  const parsedSize = Math.min(200, Math.max(1, Number.parseInt(String(pageSize ?? 25), 10) || 25));
  return { page: parsedPage, pageSize: parsedSize };
};
