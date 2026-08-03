import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PlatformEnv } from '@fleet/common';
import { ENV } from '../common/env.provider';
import { IS_PUBLIC_KEY } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: PlatformEnv,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = header.slice(7);
    let user: AuthUser;
    try {
      user = this.jwt.verify<AuthUser>(token, { secret: this.env.jwt.accessSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (await this.auth.isSessionRevoked(user.sessionId)) throw new UnauthorizedException('Session terminated');
    request.user = user;
    return true;
  }
}
