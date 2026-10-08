import { createHmac } from 'node:crypto';
import { fromRef, toRef } from '../payments.service';
import * as momo from './momo';
import * as vnpay from './vnpay';

const SECRET = 'TESTSECRETVNPAY';

describe('VNPay', () => {
  const base = {
    vnp_TmnCode: 'DEMO1234',
    vnp_TxnRef: 'abc123',
    vnp_Amount: '12120000',
    vnp_OrderInfo: 'Thanh toan don hang FH1',
  };

  it('chuỗi ký: sắp xếp khóa, khoảng trắng mã hóa thành "+", bỏ trường chữ ký', () => {
    expect(vnpay.vnpSignData({ ...base, vnp_SecureHash: 'x', vnp_SecureHashType: 'y' })).toBe(
      'vnp_Amount=12120000&vnp_OrderInfo=Thanh+toan+don+hang+FH1&vnp_TmnCode=DEMO1234&vnp_TxnRef=abc123',
    );
  });

  it('chữ ký = HMAC-SHA512 của chuỗi ký', () => {
    const signed = vnpay.signParams(SECRET, base);
    const expected = createHmac('sha512', SECRET).update(vnpay.vnpSignData(base)).digest('hex');
    expect(signed.vnp_SecureHash).toBe(expected);
    expect(vnpay.verifyParams(SECRET, signed)).toBe(true);
  });

  it('từ chối khi bị sửa số tiền hoặc sai secret', () => {
    const signed = vnpay.signParams(SECRET, base);
    expect(vnpay.verifyParams(SECRET, { ...signed, vnp_Amount: '100' })).toBe(false);
    expect(vnpay.verifyParams('OTHER', signed)).toBe(false);
    expect(vnpay.verifyParams(SECRET, { ...base })).toBe(false);
  });

  it('URL thanh toán: số tiền ×100, giờ GMT+7, có chữ ký hợp lệ', () => {
    const createdAt = new Date('2026-10-06T02:00:00Z');
    const { url, params } = vnpay.buildPayUrl(
      { tmnCode: 'DEMO1234', hashSecret: SECRET, payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' },
      {
        ref: 'abc123',
        amount: 121_200,
        orderInfo: 'Thanh toan don hang FH1',
        returnUrl: 'http://localhost:4000/api/v1/payments/vnpay/return',
        ipAddr: '127.0.0.1',
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 15 * 60_000),
      },
    );
    expect(params.vnp_Amount).toBe('12120000');
    expect(params.vnp_CreateDate).toBe('20261006090000');
    expect(params.vnp_ExpireDate).toBe('20261006091500');
    const query = Object.fromEntries(new URL(url).searchParams);
    expect(vnpay.verifyParams(SECRET, query)).toBe(true);
  });

  it('kết quả: thành công khi ResponseCode và TransactionStatus đều 00', () => {
    expect(vnpay.parseResult({ ...base, vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '1455' })).toEqual({
      ref: 'abc123',
      amount: 121_200,
      success: true,
      transactionNo: '1455',
    });
    const cancelled = vnpay.parseResult({ ...base, vnp_ResponseCode: '24', vnp_TransactionStatus: '02', vnp_TransactionNo: '0' });
    expect(cancelled.success).toBe(false);
    expect(cancelled.transactionNo).toBeNull();
  });
});

describe('MoMo', () => {
  const cfg = { accessKey: 'ACCESS', secretKey: 'SECRET' };
  const payload = {
    partnerCode: 'MOMO',
    orderId: 'abc123',
    requestId: 'req-1',
    amount: 121200,
    orderInfo: 'Thanh toan don hang FH1',
    orderType: 'momo_wallet',
    transId: 4088878653,
    resultCode: 0,
    message: 'Successful.',
    payType: 'qr',
    responseTime: 1728000000000,
    extraData: '',
  };

  it('chữ ký IPN theo đúng thứ tự trường trong tài liệu', () => {
    const raw =
      'accessKey=ACCESS&amount=121200&extraData=&message=Successful.&orderId=abc123&orderInfo=Thanh toan don hang FH1' +
      '&orderType=momo_wallet&partnerCode=MOMO&payType=qr&requestId=req-1&responseTime=1728000000000&resultCode=0&transId=4088878653';
    expect(momo.signResult(cfg, payload)).toBe(createHmac('sha256', 'SECRET').update(raw).digest('hex'));
  });

  it('xác thực được cả khi giá trị đến dạng chuỗi (query string redirect)', () => {
    const signature = momo.signResult(cfg, payload);
    const asStrings = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)]));
    expect(momo.verifyResult(cfg, { ...asStrings, signature })).toBe(true);
    expect(momo.verifyResult(cfg, { ...asStrings, amount: '1000', signature })).toBe(false);
  });

  it('phân loại kết quả', () => {
    expect(momo.parseResult({ ...payload }).success).toBe(true);
    expect(momo.parseResult({ ...payload, resultCode: 1006, transId: 0 })).toMatchObject({ success: false, pending: false, transId: null });
    expect(momo.parseResult({ ...payload, resultCode: 7000 }).pending).toBe(true);
  });
});

describe('mã tham chiếu', () => {
  it('đổi qua lại giữa UUID và chuỗi 32 ký tự', () => {
    const id = '3f2b8c1e-9a4d-4e7b-8c6a-1d2e3f4a5b6c';
    expect(toRef(id)).toBe('3f2b8c1e9a4d4e7b8c6a1d2e3f4a5b6c');
    expect(fromRef(toRef(id))).toBe(id);
    expect(fromRef('khong-hop-le')).toBeNull();
  });
});
