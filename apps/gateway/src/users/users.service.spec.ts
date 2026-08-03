import { Role } from '@fleet/database';
import { canManageRole } from './users.service';

describe('canManageRole', () => {
  it('lets superadmin manage every role', () => {
    expect(Object.values(Role).every((role) => canManageRole(Role.SUPERADMIN, role))).toBe(true);
  });

  it('lets fleet manager manage dispatchers and drivers only', () => {
    expect(canManageRole(Role.FLEET_MANAGER, Role.DRIVER)).toBe(true);
    expect(canManageRole(Role.FLEET_MANAGER, Role.DISPATCHER)).toBe(true);
    expect(canManageRole(Role.FLEET_MANAGER, Role.FLEET_MANAGER)).toBe(false);
    expect(canManageRole(Role.FLEET_MANAGER, Role.SUPERADMIN)).toBe(false);
  });

  it('denies dispatchers and drivers', () => {
    expect(canManageRole(Role.DISPATCHER, Role.DRIVER)).toBe(false);
    expect(canManageRole(Role.DRIVER, Role.DRIVER)).toBe(false);
  });
});
