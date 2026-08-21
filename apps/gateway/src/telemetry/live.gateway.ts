import { Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { AlertMessage, FleetEventMessage, PlatformEnv } from '@fleet/common';
import { Role } from '@fleet/database';
import { ENV } from '../common/env.provider';
import { AuthUser } from '../common/auth-user';
import { AuthService } from '../auth/auth.service';
import { LastPing, VehicleLiveStatus } from './status';

export const orgRoom = (organizationId: string): string => `org:${organizationId}`;

export interface LiveTelemetryEvent extends LastPing {
  status: VehicleLiveStatus;
}

const LIVE_ROLES = new Set<Role>([Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER]);
const SESSION_RECHECK_MS = 30000;

@WebSocketGateway({ namespace: 'live', cors: { origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((item) => item.trim()) : true, credentials: true }, transports: ['websocket', 'polling'] })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(LiveGateway.name);

  private readonly recheck: NodeJS.Timeout;

  constructor(private readonly jwt: JwtService, @Inject(ENV) private readonly env: PlatformEnv, private readonly auth: AuthService) {
    this.recheck = setInterval(() => void this.dropRevokedClients(), SESSION_RECHECK_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.recheck);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = (client.handshake.auth?.token as string | undefined) ?? (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const claims = this.jwt.verify<AuthUser & { exp?: number }>(token, { secret: this.env.jwt.accessSecret });
      const user = await this.auth.principal(claims.sessionId);
      if (!user || user.sub !== claims.sub || !LIVE_ROLES.has(user.role)) {
        client.disconnect(true);
        return;
      }
      client.data.user = user;
      client.data.expiresAt = (claims.exp ?? 0) * 1000;
      if (user.organizationId) client.join(orgRoom(user.organizationId));
      client.emit('ready', { organizationId: user.organizationId, role: user.role });
    } catch {
      client.disconnect(true);
    }
  }

  private async dropRevokedClients(): Promise<void> {
    if (!this.server?.sockets) return;
    for (const socket of this.server.sockets.values()) {
      const user = socket.data.user as AuthUser | undefined;
      if (!user) continue;
      const expired = typeof socket.data.expiresAt === 'number' && socket.data.expiresAt > 0 && socket.data.expiresAt < Date.now();
      const principal = expired ? null : await this.auth.principal(user.sessionId);
      if (!principal || !LIVE_ROLES.has(principal.role)) socket.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`client disconnected ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { organizationId?: string }): { ok: boolean } {
    const user = client.data.user as AuthUser | undefined;
    if (!user || user.role !== Role.SUPERADMIN || !body?.organizationId) return { ok: false };
    for (const room of client.rooms) {
      if (room.startsWith('org:')) client.leave(room);
    }
    client.join(orgRoom(body.organizationId));
    return { ok: true };
  }

  broadcastTelemetry(event: LiveTelemetryEvent): void {
    this.server.to(orgRoom(event.organizationId)).emit('telemetry', event);
  }

  broadcastAlert(alert: AlertMessage): void {
    this.server.to(orgRoom(alert.organizationId)).emit('alert', alert);
  }

  broadcastEvent(event: FleetEventMessage): void {
    this.server.to(orgRoom(event.organizationId)).emit('fleet.event', event);
  }

  connectedClients(): number {
    return this.server?.sockets?.size ?? 0;
  }
}
