import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { OrderDto, ProductDetailDto } from '@foodhub/shared';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Luồng đặt hàng đầu-cuối trên API thật + PostgreSQL test (dữ liệu seed):
 * xem thực đơn → đặt món (khách vãng lai / thành viên) → mã giảm giá → thanh toán online → nhân viên xử lý đơn.
 */
describe('Luồng đặt hàng (e2e)', () => {
  let app: NestExpressApplication;
  let http: TestAgent;
  let prisma: PrismaService;

  const login = async (email: string, password: string) => {
    const res = await http.post('/api/v1/auth/login').send({ email, password }).expect(200);
    return res.body.data.accessToken as string;
  };
  const product = async (slug: string) =>
    (await http.get(`/api/v1/products/${slug}`).expect(200)).body.data as ProductDetailDto;
  const optionId = (p: ProductDetailDto, group: string, name: string) => {
    const option = p.optionGroups.find((g) => g.name === group)?.options.find((o) => o.name === name);
    if (!option) throw new Error(`Không có tùy chọn ${group}/${name} cho ${p.slug}`);
    return option.id;
  };
  /** Link tuyệt đối (API_PUBLIC_URL) → đường dẫn để gọi qua supertest */
  const path = (url: string) => {
    const u = new URL(url.replace(/&amp;/g, '&'));
    return u.pathname + u.search;
  };
  const guestOrder = (productId: string, paymentMethod: 'COD' | 'VNPAY' | 'MOMO', extra: object = {}) =>
    http.post('/api/v1/orders').send({
      items: [{ productId, quantity: 2, optionIds: [] }],
      deliveryType: 'PICKUP',
      paymentMethod,
      customerName: 'Khách E2E',
      customerPhone: '0901234567',
      ...extra,
    });

  let staffToken: string;
  let banhMi: ProductDetailDto;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true }));
    await app.init();
    http = request(app.getHttpServer());
    prisma = app.get(PrismaService);
    staffToken = await login('staff@foodhub.local', 'Staff@12345');
    banhMi = await product('banh-mi-thit-nuong');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('health check báo database và Redis', async () => {
    const res = await http.get('/api/v1/health').expect(200);
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'up' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('thực đơn: danh mục, danh sách món và tìm kiếm không dấu', async () => {
    const categories = (await http.get('/api/v1/categories').expect(200)).body.data;
    expect(categories.map((c: { slug: string }) => c.slug)).toEqual(
      expect.arrayContaining(['mon-chinh', 'ca-phe', 'tra-sua']),
    );

    const list = await http.get('/api/v1/products?limit=5').expect(200);
    expect(list.body.data).toHaveLength(5);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(20);

    const search = await http.get('/api/v1/products?q=pho bo').expect(200);
    expect(search.body.data.map((p: { slug: string }) => p.slug)).toContain('pho-bo-tai-nam');
  });

  it('khách vãng lai đặt món có tùy chọn + mã giảm giá — giá tính lại ở server', async () => {
    const traSua = await product('tra-sua-tran-chau-duong-den');
    const res = await http
      .post('/api/v1/orders')
      .send({
        items: [
          {
            productId: traSua.id,
            quantity: 2,
            optionIds: [
              optionId(traSua, 'Size', 'L'), // +8.000
              optionId(traSua, 'Đường', '70%'),
              optionId(traSua, 'Đá', 'Ít đá'),
              optionId(traSua, 'Topping', 'Trân châu đen'), // +5.000
            ],
          },
        ],
        deliveryType: 'DELIVERY',
        paymentMethod: 'COD',
        customerName: 'Khách E2E',
        customerPhone: '0901234567',
        address: { street: '12 Lê Lợi', ward: 'Bến Nghé', district: 'Quận 1', city: 'TP.HCM' },
        couponCode: 'chaoban',
      })
      .expect(201);

    const order: OrderDto = res.body.data;
    expect(order.code).toMatch(/^[A-Z0-9-]+$/);
    expect(order.items[0]).toMatchObject({ unitPrice: 52_000, quantity: 2, lineTotal: 104_000 });
    expect(order).toMatchObject({
      subtotal: 104_000,
      discount: 10_400, // CHAOBAN 10%
      shippingFee: 15_000, // chưa đủ 200k
      total: 108_600,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
    });

    // Khách vãng lai xem lại đơn bằng mã
    const view = await http.get(`/api/v1/orders/${order.code.toLowerCase()}`).expect(200);
    expect(view.body.data.id).toBe(order.id);
  });

  it('từ chối đơn sai: thiếu tùy chọn bắt buộc, món hết hàng, trường lạ, số điện thoại sai', async () => {
    const traSua = await product('tra-sua-tran-chau-duong-den');
    await guestOrder(traSua.id, 'COD').expect(400); // thiếu Size/Đường/Đá

    const hetHang = await prisma.product.findUniqueOrThrow({ where: { slug: 'mi-xao-hai-san' } });
    await guestOrder(hetHang.id, 'COD').expect(400);

    await guestOrder(banhMi.id, 'COD', { total: 1 }).expect(400); // forbidNonWhitelisted
    await guestOrder(banhMi.id, 'COD', { customerPhone: '12345' }).expect(400);
    await guestOrder(banhMi.id, 'COD', { deliveryType: 'DELIVERY' }).expect(400); // giao hàng thiếu địa chỉ
  });

  it('thành viên: đăng ký, đặt đơn gắn tài khoản, người khác không xem được', async () => {
    const reg = await http
      .post('/api/v1/auth/register')
      .send({ fullName: 'Thành viên E2E', email: `e2e-${Date.now()}@foodhub.local`, password: 'E2e@123456' })
      .expect(201);
    const token: string = reg.body.data.accessToken;
    expect(reg.headers['set-cookie']?.[0]).toMatch(/fh_rt=.+HttpOnly/);

    const created = await guestOrder(banhMi.id, 'COD').set('authorization', `Bearer ${token}`).expect(201);
    const code: string = created.body.data.code;

    const mine = await http.get('/api/v1/orders/me').set('authorization', `Bearer ${token}`).expect(200);
    expect(mine.body.data.map((o: OrderDto) => o.code)).toContain(code);

    const khach = await login('khach@foodhub.local', 'Khach@12345');
    await http.get(`/api/v1/orders/${code}`).set('authorization', `Bearer ${khach}`).expect(403);
    await http.get(`/api/v1/orders/${code}`).expect(403); // chưa đăng nhập
    await http.get(`/api/v1/orders/${code}`).set('authorization', `Bearer ${staffToken}`).expect(200);
  });

  it('refresh token xoay vòng qua cookie httpOnly; đăng xuất thì hết hiệu lực', async () => {
    // Khách chưa đăng nhập: không lỗi, chỉ không có phiên
    expect((await http.post('/api/v1/auth/refresh').expect(200)).body.data).toBeNull();
    await http.post('/api/v1/auth/refresh').set('cookie', 'fh_rt=token-gia').expect(401);

    const agent = request.agent(app.getHttpServer());
    const login = await agent.post('/api/v1/auth/login').send({ email: 'khach@foodhub.local', password: 'Khach@12345' });
    const oldCookie = login.headers['set-cookie'][0].split(';')[0];
    const refreshed = await agent.post('/api/v1/auth/refresh').expect(200);
    expect(refreshed.body.data.user.email).toBe('khach@foodhub.local');

    await agent.post('/api/v1/auth/logout').expect(200);
    // Cookie cũ (đã xoay vòng) không dùng lại được
    await http.post('/api/v1/auth/refresh').set('cookie', oldCookie).expect(401);
  });

  it('nhân viên xử lý đơn COD theo đúng thứ tự trạng thái', async () => {
    const order: OrderDto = (await guestOrder(banhMi.id, 'COD').expect(201)).body.data;
    const setStatus = (status: string, token = staffToken) =>
      http.patch(`/api/v1/admin/orders/${order.id}/status`).set('authorization', `Bearer ${token}`).send({ status });

    await setStatus('COMPLETED').expect(400); // không nhảy cóc
    const khach = await login('khach@foodhub.local', 'Khach@12345');
    await setStatus('CONFIRMED', khach).expect(403);
    await http.patch(`/api/v1/admin/orders/${order.id}/status`).send({ status: 'CONFIRMED' }).expect(401);

    for (const status of ['CONFIRMED', 'PREPARING', 'COMPLETED']) { // đơn nhận tại quầy: không qua DELIVERING
      const res = await setStatus(status).expect(200);
      expect(res.body.data.status).toBe(status);
    }
    await setStatus('CANCELLED').expect(400); // đơn đã xong không hủy được

    const search = await http
      .get(`/api/v1/admin/orders?q=${order.code}`)
      .set('authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(search.body.data[0].code).toBe(order.code);
  });

  it('VNPay (giả lập): chưa trả thì chưa xác nhận được; chữ ký sai bị từ chối; IPN lặp lại idempotent', async () => {
    const order: OrderDto = (await guestOrder(banhMi.id, 'VNPAY').expect(201)).body.data;
    expect(order).toMatchObject({ total: 60_000, paymentStatus: 'UNPAID' });

    const confirm = () =>
      http
        .patch(`/api/v1/admin/orders/${order.id}/status`)
        .set('authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' });
    await confirm().expect(400);
    await http.post(`/api/v1/payments/${order.id}/momo`).expect(400); // sai cổng so với đơn

    const init = await http.post(`/api/v1/payments/${order.id}/vnpay`).expect(200);
    const page = await http.get(path(init.body.data.payUrl)).expect(200);
    const [success] = [...page.text.matchAll(/href="([^"]+)"/g)].map((m) => path(m[1]));

    await http.get(success.replace(/vnp_Amount=\d+/, 'vnp_Amount=100')).expect(400); // sửa số tiền

    const ret = await http.get(success).expect(302);
    expect(ret.headers.location).toBe(`http://localhost:3001/don-hang/${order.code}?payment=success`);
    expect((await http.get(`/api/v1/orders/${order.code}`)).body.data.paymentStatus).toBe('PAID');

    const ipnPath = success.replace('/vnpay/return', '/vnpay/ipn');
    expect((await http.get(ipnPath).expect(200)).body.RspCode).toBe('02'); // đã ghi nhận trước đó
    expect(
      (await http.get(ipnPath.replace(/vnp_SecureHash=[0-9a-f]+/, 'vnp_SecureHash=deadbeef')).expect(200)).body.RspCode,
    ).toBe('97');

    expect(await prisma.payment.count({ where: { orderId: order.id, status: 'PAID' } })).toBe(1);
    await confirm().expect(200);
    await http.post(`/api/v1/payments/${order.id}/vnpay`).expect(400); // không thu tiền lần 2
  });

  it('đơn online quá hạn bị hủy khi đối soát và hoàn lượt dùng mã giảm giá', async () => {
    const usedBefore = (await prisma.coupon.findUniqueOrThrow({ where: { code: 'CHAOBAN' } })).usedCount;
    const order: OrderDto = (await guestOrder(banhMi.id, 'MOMO', { couponCode: 'CHAOBAN' }).expect(201)).body.data;
    await http.post(`/api/v1/payments/${order.id}/momo`).expect(200);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: 'CHAOBAN' } })).usedCount).toBe(usedBefore + 1);

    await prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date(Date.now() - 20 * 60_000) } });
    await http.post(`/api/v1/admin/payments/reconcile`).set('authorization', `Bearer ${staffToken}`).expect(403);
    const admin = await login('admin@foodhub.local', 'Admin@12345');
    const rec = await http.post('/api/v1/admin/payments/reconcile').set('authorization', `Bearer ${admin}`).expect(200);
    expect(rec.body.data.expired).toBeGreaterThanOrEqual(1);

    const after = (await http.get(`/api/v1/orders/${order.code}`)).body.data;
    expect(after.status).toBe('CANCELLED');
    expect(await prisma.payment.findMany({ where: { orderId: order.id }, select: { status: true } })).toEqual([
      { status: 'FAILED' }, // link thanh toán treo được đóng lại
    ]);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: 'CHAOBAN' } })).usedCount).toBe(usedBefore);
  });
});
