import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { nextStatuses, orderTotals, type OrderDto } from '@foodhub/shared';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import type { AuthUser } from '../../common/decorators';
import { serialize } from '../../common/response.interceptor';
import { MenuInvalidator } from '../../common/revalidate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { evaluateCoupon } from '../coupons/coupons.module';
import { AdminOrderQuery, CreateOrderDto } from './dto/orders.dto';
import { OrdersGateway } from './orders.gateway';
import { priceLines, PricingProduct } from './pricing';

const ORDER_INCLUDE = { items: { orderBy: { createdAt: 'asc' } } } satisfies Prisma.OrderInclude;
type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

// Bỏ ký tự dễ nhầm (0/O, 1/I/L) để khách đọc mã qua điện thoại
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(now = new Date()) {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  return `FH${ymd}${rand}`;
}

export function toOrderDto(order: OrderWithItems): OrderDto {
  const o = serialize<Record<string, unknown> & OrderWithItems>(order);
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    deliveryType: o.deliveryType,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    address: (o.addressSnapshot as Record<string, string> | null) ?? null,
    subtotal: o.subtotal as unknown as number,
    discount: o.discount as unknown as number,
    shippingFee: o.shippingFee as unknown as number,
    total: o.total as unknown as number,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    note: o.note,
    createdAt: o.createdAt as unknown as string,
    updatedAt: o.updatedAt as unknown as string,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      unitPrice: i.unitPrice as unknown as number,
      quantity: i.quantity,
      options: i.optionsSnapshot as OrderDto['items'][number]['options'],
      lineTotal: i.lineTotal as unknown as number,
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrdersGateway,
    private readonly menu: MenuInvalidator,
  ) {}

  async create(dto: CreateOrderDto, user?: AuthUser) {
    const products = await this.loadProducts(dto.items.map((i) => i.productId));
    const { lines, subtotal } = priceLines(dto.items, products);

    const order = await this.prisma.$transaction(async (tx) => {
      let discount = 0;
      let couponId: string | undefined;

      if (dto.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: dto.couponCode } });
        discount = evaluateCoupon(coupon, subtotal);
        couponId = coupon!.id;
        // Trừ lượt có điều kiện ngay trong transaction: hai đơn đồng thời không thể vượt usage_limit
        const updated = await tx.$executeRaw`
          UPDATE coupons SET used_count = used_count + 1, updated_at = now()
          WHERE id = ${couponId}::uuid AND (usage_limit IS NULL OR used_count < usage_limit)`;
        if (updated === 0) throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
      }

      const totals = orderTotals({ subtotal, discount, deliveryType: dto.deliveryType });
      const data: Prisma.OrderUncheckedCreateInput = {
        code: generateCode(),
        userId: user?.id,
        deliveryType: dto.deliveryType,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone,
        addressSnapshot:
          dto.deliveryType === 'DELIVERY' && dto.address ? { ...dto.address } : Prisma.JsonNull,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingFee: totals.shippingFee,
        total: totals.total,
        couponId,
        paymentMethod: dto.paymentMethod,
        note: dto.note?.trim() || null,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            optionsSnapshot: l.optionsSnapshot,
            lineTotal: l.lineTotal,
          })),
        },
      };
      return tx.order.create({ data, include: ORDER_INCLUDE });
    });

    const result = toOrderDto(order);
    this.gateway.orderCreated(result);
    return result;
  }

  async byCode(code: string, user?: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { code: code.toUpperCase() }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';
    if (order.userId && order.userId !== user?.id && !isStaff) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }
    return toOrderDto(order);
  }

  async mine(userId: string, page: number, limit: number) {
    const where = { userId };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: orders.map(toOrderDto), total };
  }

  async adminList(q: AdminOrderQuery) {
    const where: Prisma.OrderWhereInput = q.status ? { status: q.status } : {};
    const term = q.q?.trim();
    if (term) {
      // Tên khách tìm không dấu ("khach" khớp "Khách") nhờ f_unaccent (migration search_extensions)
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM orders
        WHERE code LIKE '%' || upper(${term}) || '%'
           OR customer_phone LIKE '%' || ${term.replace(/\s/g, '')} || '%'
           OR f_unaccent(lower(customer_name)) LIKE '%' || f_unaccent(lower(${term})) || '%'
        ORDER BY created_at DESC
        LIMIT 500`;
      where.id = { in: rows.map((r) => r.id) };
    }
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: orders.map(toOrderDto), total };
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
      if (!current) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (!nextStatuses(current.status, current.deliveryType).includes(status)) {
        throw new BadRequestException(`Không thể chuyển đơn từ ${current.status} sang ${status}`);
      }
      // Đơn VNPay/MoMo chỉ được nhận làm khi tiền đã về
      if (status === 'CONFIRMED' && current.paymentMethod !== 'COD' && current.paymentStatus !== 'PAID') {
        throw new BadRequestException('Đơn chưa được thanh toán online, chưa thể xác nhận');
      }

      if (status === 'COMPLETED') {
        for (const item of current.items) {
          if (!item.productId) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { soldCount: { increment: item.quantity } },
          });
        }
      }
      if (status === 'CANCELLED' && current.couponId) {
        await tx.coupon.update({ where: { id: current.couponId }, data: { usedCount: { decrement: 1 } } });
      }
      if (status === 'CANCELLED') {
        await tx.payment.updateMany({ where: { orderId: id, status: 'UNPAID' }, data: { status: 'FAILED' } });
      }

      return tx.order.update({
        where: { id },
        data: {
          status,
          // COD: thu tiền khi giao xong
          ...(status === 'COMPLETED' && current.paymentMethod === 'COD' ? { paymentStatus: 'PAID' } : {}),
        },
        include: ORDER_INCLUDE,
      });
    });

    const result = toOrderDto(order);
    this.gateway.orderUpdated(result);
    if (status === 'COMPLETED') await this.menu.menuChanged(['menu']); // cập nhật "bán chạy"
    return result;
  }

  /** Phát lại trạng thái đơn cho khách và nhân viên (dùng khi trạng thái thanh toán thay đổi). */
  async notify(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (order) this.gateway.orderUpdated(toOrderDto(order));
  }

  private async loadProducts(ids: string[]) {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(ids)] }, deletedAt: null },
      select: {
        id: true,
        name: true,
        basePrice: true,
        isAvailable: true,
        optionGroups: {
          select: {
            id: true,
            name: true,
            isRequired: true,
            maxSelect: true,
            options: { select: { id: true, name: true, extraPrice: true } },
          },
        },
      },
    });
    return new Map(rows.map((r) => [r.id, serialize<PricingProduct>(r)]));
  }
}
