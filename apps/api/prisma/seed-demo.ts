/**
 * Dữ liệu demo cho trang báo cáo: ~60 ngày đơn hàng giả.
 *   pnpm db:seed-demo          tạo (xóa bộ demo cũ trước)
 *   pnpm db:seed-demo --reset  chỉ xóa bộ demo
 * Mọi đơn demo có note = '[demo]' và mã bắt đầu bằng 'DM' — không đụng tới đơn thật.
 */
import { DeliveryType, OrderStatus, PaymentMethod, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const DEMO_NOTE = '[demo]';
const DAYS = 60;

// Bộ sinh số ngẫu nhiên có hạt giống: chạy lại ra cùng dữ liệu, dễ so sánh
let seed = 20261006;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
function weighted<T>(pairs: [T, number][]): T {
  let r = rand() * pairs.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
}

async function reset() {
  const { count } = await prisma.order.deleteMany({ where: { note: DEMO_NOTE, code: { startsWith: 'DM' } } });
  console.log(`Đã xóa ${count} đơn demo.`);
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Không chạy dữ liệu demo trên production');
  await reset();
  if (process.argv.includes('--reset')) return;

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, basePrice: true, soldCount: true },
  });
  if (!products.length) throw new Error('Chưa có món — chạy pnpm db:seed trước');
  // Món bán chạy (sold_count cao) được chọn nhiều hơn
  const productWeights = products.map((p) => [p, Math.max(1, p.soldCount)] as [typeof p, number]);

  const orders: Prisma.OrderCreateManyInput[] = [];
  const items: Prisma.OrderItemCreateManyInput[] = [];
  const now = Date.now();
  const names = ['Anh Tuấn', 'Chị Hoa', 'Minh Khang', 'Thu Trang', 'Quốc Bảo', 'Ngọc Ánh', 'Hải Đăng', 'Lan Anh'];

  for (let d = DAYS - 1; d >= 1; d--) {
    const day = new Date(now - d * 86_400_000);
    const weekend = [0, 6].includes(day.getUTCDay());
    // Tăng trưởng nhẹ theo thời gian + cuối tuần đông hơn
    const count = Math.round(between(8, 16) * (weekend ? 1.4 : 1) * (1 + (DAYS - d) / DAYS / 2));

    for (let k = 0; k < count; k++) {
      // Giờ cao điểm trưa (11–13h) và tối (17–20h) theo giờ Việt Nam
      const hourVn = weighted<number>([[between(7, 10), 2], [between(11, 13), 4], [between(14, 16), 1], [between(17, 20), 4], [21, 1]]);
      const createdAt = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hourVn - 7, between(0, 59)));
      const status = weighted<OrderStatus>([['COMPLETED', 88], ['CANCELLED', 8], ['DELIVERING', 4]]);
      const paymentMethod = weighted<PaymentMethod>([['COD', 60], ['VNPAY', 25], ['MOMO', 15]]);
      const deliveryType = weighted<DeliveryType>([['DELIVERY', 70], ['PICKUP', 30]]);
      const orderId = randomUUID();

      let subtotal = 0;
      const lineCount = weighted([[1, 4], [2, 4], [3, 2], [4, 1]]);
      for (let l = 0; l < lineCount; l++) {
        const p = weighted(productWeights);
        const quantity = weighted([[1, 6], [2, 3], [3, 1]]);
        const unit = p.basePrice.toNumber();
        subtotal += unit * quantity;
        items.push({ id: randomUUID(), orderId, productId: p.id, productName: p.name, unitPrice: unit, quantity, lineTotal: unit * quantity, optionsSnapshot: [], createdAt, updatedAt: createdAt });
      }
      const shippingFee = deliveryType === 'PICKUP' || subtotal >= 200_000 ? 0 : 15_000;
      const paid = status === 'COMPLETED' || (status !== 'CANCELLED' && paymentMethod !== 'COD');
      orders.push({
        id: orderId,
        code: `DM${createdAt.toISOString().slice(2, 10).replace(/-/g, '')}${String(orders.length).padStart(5, '0')}`,
        status,
        deliveryType,
        customerName: pick(names),
        customerPhone: `09${between(10_000_000, 99_999_999)}`,
        addressSnapshot: deliveryType === 'DELIVERY' ? { street: `${between(1, 200)} Lê Lợi`, ward: 'Bến Nghé', district: 'Quận 1', city: 'TP. Hồ Chí Minh' } : Prisma.JsonNull,
        subtotal,
        discount: 0,
        shippingFee,
        total: subtotal + shippingFee,
        paymentMethod,
        paymentStatus: paid ? 'PAID' : 'UNPAID',
        note: DEMO_NOTE,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  await prisma.$transaction([prisma.order.createMany({ data: orders }), prisma.orderItem.createMany({ data: items })]);
  const done = orders.filter((o) => o.status === 'COMPLETED');
  const revenue = done.reduce((s, o) => s + Number(o.total), 0);
  console.log(`Tạo ${orders.length} đơn demo (${items.length} dòng món) trong ${DAYS - 1} ngày; ${done.length} hoàn thành, doanh thu ${revenue.toLocaleString('vi-VN')}đ.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
