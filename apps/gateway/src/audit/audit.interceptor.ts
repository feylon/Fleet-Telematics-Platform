import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { SKIP_AUDIT_KEY, extractRequestMeta } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { AuditService, redactPayload } from './audit.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const resourceFromPath = (path: string): { resource: string; resourceId: string | null } => {
  const clean = path.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  const withoutPrefix = parts[0] === 'api' ? parts.slice(1) : parts;
  const uuidLike = /^[0-9a-f-]{36}$/i;
  const resourceParts = withoutPrefix.filter((part) => !uuidLike.test(part));
  const idPart = withoutPrefix.find((part) => uuidLike.test(part)) ?? null;
  return { resource: resourceParts.join('.') || 'root', resourceId: idPart };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditService, private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [context.getHandler(), context.getClass()]);
    const user = request.user as AuthUser | undefined;
    if (skip || !user || !MUTATING.has(request.method) || request.path.startsWith('/api/device')) return next.handle();
    return next.handle().pipe(
      tap({
        next: () => this.write(request, response.statusCode, user),
        error: (error: { status?: number }) => this.write(request, error?.status ?? 500, user),
      }),
    );
  }

  private write(request: { method: string; path: string; originalUrl: string; body: unknown; headers: Record<string, string> }, statusCode: number, user: AuthUser): void {
    const { resource, resourceId } = resourceFromPath(request.originalUrl ?? request.path);
    const meta = extractRequestMeta(request as never);
    this.audit
      .record({
        organizationId: user.organizationId,
        userId: user.sub,
        userLogin: user.login,
        action: `${request.method} ${resource}`,
        resource,
        resourceId,
        method: request.method,
        path: (request.originalUrl ?? request.path).slice(0, 300),
        statusCode,
        payload: redactPayload(request.body),
        ip: meta.ip,
      })
      .catch((error: Error) => this.logger.error(`audit write failed: ${error.message}`));
  }
}
