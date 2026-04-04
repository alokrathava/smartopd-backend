import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  EventsGateway,
  QueueUpdatePayload,
  TokenCalledPayload,
  BedStatusPayload,
  CriticalAlertPayload,
  OtUpdatePayload,
  UserNotificationPayload,
} from './events.gateway';

/**
 * Unit tests for EventsGateway.
 *
 * WebSocket testing at the network level is complex.  These tests verify:
 *  1. The gateway can be instantiated via the NestJS testing module.
 *  2. Connection lifecycle methods (handleConnection / handleDisconnect)
 *     handle the JWT auth flow correctly without a real Socket.IO server.
 *  3. Broadcast helpers (emitQueueUpdate, emitTokenCalled, etc.) delegate
 *     correctly to `this.server.to(...).emit(...)`.
 *  4. Room-join handlers (@SubscribeMessage) return the correct ack payloads.
 *
 * The Socket.IO `Server` and individual `Socket` instances are replaced with
 * plain jest mock objects.
 */

// ─── Mock socket factory ──────────────────────────────────────────────────────

const makeSocket = (token?: string): any => {
  const joinMock = jest.fn().mockResolvedValue(undefined);
  return {
    id: 'socket-id-1',
    handshake: {
      auth: token ? { token } : {},
      query: {},
    },
    join: joinMock,
    disconnect: jest.fn(),
    user: undefined,
  };
};

// ─── Mock Socket.IO server ────────────────────────────────────────────────────

const makeServer = () => {
  const emitMock = jest.fn();
  const toMock = jest.fn().mockReturnValue({ emit: emitMock });
  return { to: toMock, emit: emitMock, _toEmit: emitMock };
};

// ─── JWT / Config mocks ───────────────────────────────────────────────────────

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue: string) => {
    if (key === 'JWT_SECRET') return 'test-secret';
    return defaultValue;
  }),
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let mockServer: ReturnType<typeof makeServer>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockServer = makeServer();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);

    // Inject the mock server (normally set by @WebSocketServer())
    (gateway as any).server = mockServer;
  });

  // ─── Module sanity ────────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('exposes the correct handler methods', () => {
    expect(typeof gateway.handleConnection).toBe('function');
    expect(typeof gateway.handleDisconnect).toBe('function');
    expect(typeof gateway.afterInit).toBe('function');
    expect(typeof gateway.handleJoinQueue).toBe('function');
    expect(typeof gateway.handleJoinBedBoard).toBe('function');
    expect(typeof gateway.emitQueueUpdate).toBe('function');
    expect(typeof gateway.emitTokenCalled).toBe('function');
    expect(typeof gateway.emitBedStatusChanged).toBe('function');
    expect(typeof gateway.emitCriticalAlert).toBe('function');
    expect(typeof gateway.emitOtUpdate).toBe('function');
    expect(typeof gateway.emitUserNotification).toBe('function');
  });

  // ─── afterInit ────────────────────────────────────────────────────────────

  describe('afterInit()', () => {
    it('completes without throwing', () => {
      expect(() => gateway.afterInit()).not.toThrow();
    });
  });

  // ─── handleConnection ─────────────────────────────────────────────────────

  describe('handleConnection()', () => {
    it('disconnects a client that sends no token', () => {
      const socket = makeSocket(); // no token

      gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('accepts a client with a valid JWT and joins the facility room', () => {
      const payload = { sub: 'user-1', facilityId: 'fac-1', email: 'doc@h.com' };
      mockJwtService.verify.mockReturnValueOnce(payload);
      const socket = makeSocket('valid-jwt');

      gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('facility:fac-1');
      expect((socket as any).user).toEqual(payload);
    });

    it('disconnects a client whose JWT is invalid', () => {
      mockJwtService.verify.mockImplementationOnce(() => {
        throw new Error('jwt malformed');
      });
      const socket = makeSocket('bad-token');

      gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('does not call join() when payload has no facilityId', () => {
      const payload = { sub: 'user-1', email: 'super@admin.com' }; // no facilityId
      mockJwtService.verify.mockReturnValueOnce(payload);
      const socket = makeSocket('valid-jwt');

      gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('uses the token from handshake.query.token when handshake.auth.token is absent', () => {
      const payload = { sub: 'u1', facilityId: 'fac-2' };
      mockJwtService.verify.mockReturnValueOnce(payload);

      const socket = makeSocket(); // no auth token
      socket.handshake.query.token = 'query-token';

      gateway.handleConnection(socket);

      expect(mockJwtService.verify).toHaveBeenCalledWith('query-token', expect.any(Object));
      expect(socket.disconnect).not.toHaveBeenCalled();
    });
  });

  // ─── handleDisconnect ─────────────────────────────────────────────────────

  describe('handleDisconnect()', () => {
    it('completes without throwing for a normal disconnect', () => {
      const socket = makeSocket();

      expect(() => gateway.handleDisconnect(socket)).not.toThrow();
    });
  });

  // ─── Queue room messages ──────────────────────────────────────────────────

  describe('handleJoinQueue()', () => {
    it('joins the correct queue room and returns the ack payload', () => {
      const socket = makeSocket();
      const data = { facilityId: 'fac-1' };

      const result = gateway.handleJoinQueue(socket, data);

      expect(socket.join).toHaveBeenCalledWith('queue:fac-1');
      expect(result).toEqual({ event: 'queue:joined', data: { facilityId: 'fac-1' } });
    });
  });

  // ─── Bed board messages ───────────────────────────────────────────────────

  describe('handleJoinBedBoard()', () => {
    it('joins the correct beds room and returns the ack payload', () => {
      const socket = makeSocket();
      const data = { facilityId: 'fac-1' };

      const result = gateway.handleJoinBedBoard(socket, data);

      expect(socket.join).toHaveBeenCalledWith('beds:fac-1');
      expect(result).toEqual({ event: 'beds:joined', data: { facilityId: 'fac-1' } });
    });
  });

  // ─── User room messages ───────────────────────────────────────────────────

  describe('handleJoinUserRoom()', () => {
    it('joins the user room when the socket user matches the requested userId', () => {
      const socket = makeSocket('valid');
      (socket as any).user = { sub: 'user-42' };

      gateway.handleJoinUserRoom(socket, { userId: 'user-42' });

      expect(socket.join).toHaveBeenCalledWith('user:user-42');
    });

    it('does NOT join the user room when userId does not match socket user', () => {
      const socket = makeSocket('valid');
      (socket as any).user = { sub: 'user-42' };

      gateway.handleJoinUserRoom(socket, { userId: 'attacker-99' });

      expect(socket.join).not.toHaveBeenCalled();
    });

    it('returns { event: "user:joined" }', () => {
      const socket = makeSocket('valid');
      (socket as any).user = { sub: 'u1' };

      const result = gateway.handleJoinUserRoom(socket, { userId: 'u1' });

      expect(result).toEqual({ event: 'user:joined' });
    });
  });

  // ─── Broadcast helpers ────────────────────────────────────────────────────

  describe('emitQueueUpdate()', () => {
    it('broadcasts to the facility room with event "queue:updated"', () => {
      const payload: QueueUpdatePayload = {
        visitId: 'v-1',
        patientId: 'p-1',
        patientName: 'Raj Kumar',
        tokenNumber: 42,
        status: 'WAITING',
        timestamp: new Date().toISOString(),
      };

      gateway.emitQueueUpdate('fac-1', payload);

      expect(mockServer.to).toHaveBeenCalledWith('facility:fac-1');
      expect(mockServer._toEmit).toHaveBeenCalledWith('queue:updated', payload);
    });
  });

  describe('emitTokenCalled()', () => {
    it('broadcasts to the facility room with event "queue:token-called"', () => {
      const payload: TokenCalledPayload = {
        tokenNumber: 7,
        patientName: 'Priya Sharma',
        doctorName: 'Dr. Mehta',
        roomNumber: 'OPD-3',
        timestamp: new Date().toISOString(),
      };

      gateway.emitTokenCalled('fac-1', payload);

      expect(mockServer.to).toHaveBeenCalledWith('facility:fac-1');
      expect(mockServer._toEmit).toHaveBeenCalledWith('queue:token-called', payload);
    });
  });

  describe('emitBedStatusChanged()', () => {
    it('broadcasts to the facility room with event "beds:status-changed"', () => {
      const payload: BedStatusPayload = {
        bedId: 'bed-1',
        bedNumber: 'A101',
        wardName: 'General Ward',
        status: 'OCCUPIED',
        patientId: 'p-1',
        patientName: 'John Doe',
        timestamp: new Date().toISOString(),
      };

      gateway.emitBedStatusChanged('fac-1', payload);

      expect(mockServer.to).toHaveBeenCalledWith('facility:fac-1');
      expect(mockServer._toEmit).toHaveBeenCalledWith('beds:status-changed', payload);
    });
  });

  describe('emitCriticalAlert()', () => {
    it('broadcasts to the facility room with event "alert:critical-vitals"', () => {
      const payload: CriticalAlertPayload = {
        visitId: 'v-1',
        patientId: 'p-1',
        patientName: 'John Doe',
        flags: ['HIGH_BP', 'LOW_SPO2'],
        vitalsId: 'vit-1',
        recordedById: 'nurse-1',
        timestamp: new Date().toISOString(),
      };

      gateway.emitCriticalAlert('fac-1', payload);

      expect(mockServer.to).toHaveBeenCalledWith('facility:fac-1');
      expect(mockServer._toEmit).toHaveBeenCalledWith('alert:critical-vitals', payload);
    });
  });

  describe('emitOtUpdate()', () => {
    it('broadcasts to the facility room with event "ot:updated"', () => {
      const payload: OtUpdatePayload = {
        bookingId: 'ot-1',
        action: 'created',
        surgeonId: 'surg-1',
        scheduledAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      gateway.emitOtUpdate('fac-1', payload);

      expect(mockServer.to).toHaveBeenCalledWith('facility:fac-1');
      expect(mockServer._toEmit).toHaveBeenCalledWith('ot:updated', payload);
    });
  });

  describe('emitUserNotification()', () => {
    it('broadcasts to the user-specific room with event "notification:received"', () => {
      const payload: UserNotificationPayload = {
        id: 'notif-1',
        title: 'Appointment confirmed',
        body: 'Your OPD token is 12',
        type: 'OPD_TOKEN',
        timestamp: new Date().toISOString(),
      };

      gateway.emitUserNotification('user-42', payload);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-42');
      expect(mockServer._toEmit).toHaveBeenCalledWith('notification:received', payload);
    });
  });

  // ─── Broadcast isolation ──────────────────────────────────────────────────

  describe('broadcast isolation', () => {
    it('targets different facility rooms for different facilityIds', () => {
      const payload: QueueUpdatePayload = {
        visitId: 'v',
        patientId: 'p',
        patientName: 'Test',
        tokenNumber: 1,
        status: 'WAITING',
        timestamp: '',
      };

      gateway.emitQueueUpdate('fac-A', payload);
      gateway.emitQueueUpdate('fac-B', payload);

      const calls = mockServer.to.mock.calls.map((c: string[]) => c[0]);
      expect(calls).toContain('facility:fac-A');
      expect(calls).toContain('facility:fac-B');
    });
  });
});
