import { ForbiddenException } from '@nestjs/common';
import { Role } from '@fleet/database';
import { resolveOrganizationId, paginationOf } from './tenant';
import { AuthUser } from './auth-user';

const user = (role: Role, organizationId: string | null): AuthUser => ({
  sub: 'u1',
  login: 'user',
  role,
  organizationId,
  sessionId: 's1',
  fullName: 'User',
  locale: 'uz',
});

describe('resolveOrganizationId', () => {
  it('returns the tenant of a dispatcher', () => {
    expect(resolveOrganizationId(user(Role.DISPATCHER, 'org-a'))).toBe('org-a');
  });

  it('rejects a dispatcher requesting another tenant', () => {
    expect(() => resolveOrganizationId(user(Role.DISPATCHER, 'org-a'), 'org-b')).toThrow(ForbiddenException);
  });

  it('requires superadmin to name a tenant', () => {
    expect(() => resolveOrganizationId(user(Role.SUPERADMIN, null))).toThrow(ForbiddenException);
    expect(resolveOrganizationId(user(Role.SUPERADMIN, null), 'org-b')).toBe('org-b');
  });

  it('rejects a user without organization', () => {
    expect(() => resolveOrganizationId(user(Role.DRIVER, null))).toThrow(ForbiddenException);
  });
});

describe('paginationOf', () => {
  it('clamps values', () => {
    expect(paginationOf('0', '1000')).toEqual({ page: 1, pageSize: 200 });
    expect(paginationOf(undefined, undefined)).toEqual({ page: 1, pageSize: 25 });
    expect(paginationOf('3', '10')).toEqual({ page: 3, pageSize: 10 });
  });
});
