import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '@fleet/database';
import { AuthUser, RequestMeta } from './auth-user';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const SKIP_AUDIT_KEY = 'skipAudit';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser => {
  const request = context.switchToHttp().getRequest();
  return request.user as AuthUser;
});

export const extractRequestMeta = (request: { headers: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string } }): RequestMeta => {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
  const ip = forwardedIp || request.ip || request.socket?.remoteAddress || null;
  const userAgentHeader = request.headers['user-agent'];
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader ?? null;
  return { ip, userAgent: userAgent ? userAgent.slice(0, 400) : null };
};

export const ReqMeta = createParamDecorator((_: unknown, context: ExecutionContext): RequestMeta => {
  const request = context.switchToHttp().getRequest();
  return extractRequestMeta(request);
});
