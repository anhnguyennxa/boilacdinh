import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SocketEvents } from '@foodhub/shared';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';

const STAFF_ROOM = 'staff';
const orderRoom = (code: string) => `order:${code}`;

/**
 * Khách join phòng order:<code> để theo dõi một đơn.
 * Nhân viên gửi access token trong handshake.auth.token để vào phòng "staff" nhận mọi đơn.
 */
@WebSocketGateway() // CORS cấu hình trong SocketIoAdapter (main.ts)
export class OrdersGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      client.data.user = payload;
      if (payload.role === 'STAFF' || payload.role === 'ADMIN') await client.join(STAFF_ROOM);
    } catch {
      this.logger.debug('Socket với token không hợp lệ, coi như khách');
    }
  }

  @SubscribeMessage(SocketEvents.JOIN_ORDER)
  async joinOrder(@ConnectedSocket() client: Socket, @MessageBody() body: { code?: string }) {
    const code = typeof body?.code === 'string' ? body.code.toUpperCase() : '';
    const order = code
      ? await this.prisma.order.findUnique({ where: { code }, select: { userId: true } })
      : null;
    const user = client.data.user as JwtPayload | undefined;
    const allowed =
      order && (!order.userId || order.userId === user?.sub || user?.role === 'STAFF' || user?.role === 'ADMIN');
    if (!allowed) return { ok: false };
    await client.join(orderRoom(code));
    return { ok: true };
  }

  orderCreated(order: { code: string }) {
    this.server.to(STAFF_ROOM).emit(SocketEvents.ORDER_CREATED, order);
  }

  orderUpdated(order: { code: string }) {
    this.server.to(orderRoom(order.code)).to(STAFF_ROOM).emit(SocketEvents.ORDER_UPDATED, order);
  }
}
