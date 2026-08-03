import { Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { AlertMessage, FleetEventMessage, PlatformEnv } from '@fleet/common';
import { Role } from '@fleet/database';
import { ENV } from '../common/env.provider';
import { AuthUser } from '../common/auth-user';
import { LastPing, VehicleLiveStatus } from './status';

export const orgRoom = (organizationId: string): string => `org:${organizationId}`;

export interface LiveTelemetryEvent extends LastPing {
  status: VehicleLiveStatus;
}

@WebSocketGateway({ namespace: 'live', cors: { origin: true, credentials: true }, transports: ['websocket', 'polling'] })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(LiveGateway.name);

  constructor(private readonly jwt: JwtService, @Inject(ENV) private readonly env: PlatformEnv) {}

  handleConnection(client: Socket): void {
    const token = (client.handshake.auth?.token as string | undefined) ?? (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const user = this.jwt.verify<AuthUser>(token, { secret: this.env.jwt.accessSecret });
      client.data.user = user;
      if (user.organizationId) client.join(orgRoom(user.organizationId));
      client.emit('ready', { organizationId: user.organizationId, role: user.role });
    } catch {
      client.disconnect(true);
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
