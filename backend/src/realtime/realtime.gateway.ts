import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  DRIVER_REQUEST_EVENT,
  DRIVER_REQUESTS_CHANNEL,
  GATEWAY_PAYLOAD_KIND,
  RIDE_EVENT,
  RIDE_EVENTS_CHANNEL,
} from './realtime.constants';

/**
 * Socket.IO gateway — clients join `ride.events` / `driver.requests` rooms (see `handleJoin`).
 * TODO: Validate `handshake.auth.token` (same JWT as HTTP Bearer) before allowing joins.
 * TODO: Emit envelopes with `kind` + `eventType` per `GatewayRidePayloadDto` / `GatewayDriverRequestPayloadDto`.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as { token?: string } | undefined)?.token ??
      (client.handshake.query?.token as string | undefined);
    void token;
    // TODO: verify JWT; reject connection if invalid (keep mock-lenient for local dev).
    this.logger.debug(`Client connected: ${client.id}`);
  }

  /** Client subscribes to a contract channel (room name = `RIDE_EVENTS_CHANNEL` | `DRIVER_REQUESTS_CHANNEL`). */
  @SubscribeMessage('join')
  handleJoin(client: Socket, payload: { channel: string }) {
    const ch = payload?.channel;
    if (ch === RIDE_EVENTS_CHANNEL || ch === DRIVER_REQUESTS_CHANNEL) {
      void client.join(ch);
    }
    return { ok: true, channel: ch };
  }

  /** Placeholder broadcast — call from services when ride state changes. */
  emitRideSample(rideId: string) {
    this.server.to(RIDE_EVENTS_CHANNEL).emit('event', {
      kind: GATEWAY_PAYLOAD_KIND.RIDE,
      rideId,
      eventType: RIDE_EVENT.MATCHING,
      occurredAt: new Date().toISOString(),
    });
  }

  /** Placeholder broadcast for driver queue. */
  emitDriverRequestSample() {
    this.server.to(DRIVER_REQUESTS_CHANNEL).emit('event', {
      kind: GATEWAY_PAYLOAD_KIND.DRIVER_REQUEST,
      eventType: DRIVER_REQUEST_EVENT.INCOMING,
      occurredAt: new Date().toISOString(),
    });
  }
}
