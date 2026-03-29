import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * SmartOPD Real-time Events Gateway
 *
 * Namespaces:
 * - /queue     — OPD queue token updates (Reception, Nurse, Doctor screens)
 * - /beds      — Live bed occupancy board (Room module)
 * - /alerts    — Critical value alerts (Nurse → Doctor)
 * - /ot        — OT schedule changes
 *
 * Client auth: pass JWT as handshake.auth.token or query.token
 */
@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV !== 'production' ? '*' : process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialised');
  }

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      (client.handshake.query?.token as string);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'smartopd-secret-key'),
      });

      // Store user info on socket for room routing
      (client as any).user = payload;

      // Auto-join facility room so facility-scoped broadcasts work
      if (payload.facilityId) {
        void client.join(`facility:${payload.facilityId}`);
      }

      this.logger.debug(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ─── Queue Events ──────────────────────────────────────────────────────────

  /** Client joins the queue room for a facility */
  @SubscribeMessage('queue:join')
  handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { facilityId: string },
  ) {
    void client.join(`queue:${data.facilityId}`);
    return { event: 'queue:joined', data: { facilityId: data.facilityId } };
  }

  /** Broadcast queue update to all screens watching a facility's queue */
  emitQueueUpdate(facilityId: string, payload: QueueUpdatePayload) {
    this.server.to(`facility:${facilityId}`).emit('queue:updated', payload);
  }

  /** Emit when a visit token is called */
  emitTokenCalled(facilityId: string, payload: TokenCalledPayload) {
    this.server.to(`facility:${facilityId}`).emit('queue:token-called', payload);
  }

  // ─── Bed Board Events ──────────────────────────────────────────────────────

  /** Client joins the bed board room */
  @SubscribeMessage('beds:join')
  handleJoinBedBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { facilityId: string },
  ) {
    void client.join(`beds:${data.facilityId}`);
    return { event: 'beds:joined', data: { facilityId: data.facilityId } };
  }

  /** Broadcast bed status change to all bed board watchers */
  emitBedStatusChanged(facilityId: string, payload: BedStatusPayload) {
    this.server.to(`facility:${facilityId}`).emit('beds:status-changed', payload);
  }

  // ─── Critical Value Alerts ─────────────────────────────────────────────────

  /** Broadcast critical vitals alert to doctors/nurses in facility */
  emitCriticalAlert(facilityId: string, payload: CriticalAlertPayload) {
    this.server.to(`facility:${facilityId}`).emit('alert:critical-vitals', payload);
    this.logger.warn(
      `Critical alert for patient ${payload.patientId} in facility ${facilityId}: ${payload.flags.join(', ')}`,
    );
  }

  // ─── OT Events ─────────────────────────────────────────────────────────────

  /** OT booking created/updated/cancelled */
  emitOtUpdate(facilityId: string, payload: OtUpdatePayload) {
    this.server.to(`facility:${facilityId}`).emit('ot:updated', payload);
  }

  // ─── Notification Events ───────────────────────────────────────────────────

  /** Push in-app notification to a specific user */
  emitUserNotification(userId: string, payload: UserNotificationPayload) {
    this.server.to(`user:${userId}`).emit('notification:received', payload);
  }

  @SubscribeMessage('user:join')
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const socketUser = (client as any).user;
    if (socketUser?.sub === data.userId) {
      void client.join(`user:${data.userId}`);
    }
    return { event: 'user:joined' };
  }
}

// ─── Event Payload Types ───────────────────────────────────────────────────

export interface QueueUpdatePayload {
  visitId: string;
  patientId: string;
  patientName: string;
  tokenNumber: number;
  status: string;
  doctorId?: string;
  timestamp: string;
}

export interface TokenCalledPayload {
  tokenNumber: number;
  patientName: string;
  doctorName: string;
  roomNumber: string;
  timestamp: string;
}

export interface BedStatusPayload {
  bedId: string;
  bedNumber: string;
  wardName: string;
  status: string;
  patientId?: string;
  patientName?: string;
  timestamp: string;
}

export interface CriticalAlertPayload {
  visitId: string;
  patientId: string;
  patientName: string;
  flags: string[];
  vitalsId: string;
  recordedById: string;
  timestamp: string;
}

export interface OtUpdatePayload {
  bookingId: string;
  action: 'created' | 'started' | 'completed' | 'cancelled' | 'postponed';
  surgeonId: string;
  scheduledAt: string;
  timestamp: string;
}

export interface UserNotificationPayload {
  id: string;
  title: string;
  body: string;
  type: string;
  relatedEntityId?: string;
  timestamp: string;
}
