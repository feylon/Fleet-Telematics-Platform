import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@fleet/database';
import { ROLES_KEY } from '../common/decorators';
import { AuthUser } from '../common/auth-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) return true;
    if (!roles.includes(user.role)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
