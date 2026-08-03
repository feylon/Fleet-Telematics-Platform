import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@fleet/database';
import { RolesGuard } from './roles.guard';

const contextFor = (role: Role | undefined, required: Role[] | undefined): ExecutionContext => {
  const handler = () => undefined;
  const reflector = new Reflector();
  if (required) Reflect.defineMetadata('roles', required, handler);
  const context = {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
  return Object.assign(context, { reflector });
};

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows a matching role', () => {
    expect(guard.canActivate(contextFor(Role.DISPATCHER, [Role.DISPATCHER, Role.FLEET_MANAGER]))).toBe(true);
  });

  it('denies a non matching role', () => {
    expect(() => guard.canActivate(contextFor(Role.DRIVER, [Role.DISPATCHER]))).toThrow(ForbiddenException);
  });

  it('allows when no roles are required', () => {
    expect(guard.canActivate(contextFor(Role.DRIVER, undefined))).toBe(true);
  });
});
