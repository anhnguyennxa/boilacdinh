import { request, type APIRequestContext } from '@playwright/test';

/** Gọi thẳng API (không qua giao diện) để chuẩn bị dữ liệu và dọn dẹp sau test. */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';

export async function apiAs(email: string, password: string): Promise<APIRequestContext> {
  const anon = await request.newContext();
  const res = await anon.post(`${API_URL}/auth/login`, { data: { email, password } });
  if (!res.ok()) throw new Error(`Đăng nhập ${email} thất bại: ${res.status()}`);
  const token: string = (await res.json()).data.accessToken;
  await anon.dispose();
  return request.newContext({ extraHTTPHeaders: { authorization: `Bearer ${token}` } });
}

// Đăng nhập API bị giới hạn 5 lần/phút → dùng chung một phiên nhân viên cho cả lượt chạy
let staff: Promise<APIRequestContext> | undefined;
export const staffApi = () => (staff ??= apiAs('staff@foodhub.local', 'Staff@12345'));

export async function setOrderStatus(api: APIRequestContext, code: string, status: string) {
  const list = await api.get(`${API_URL}/admin/orders?q=${code}`);
  const order = (await list.json()).data.find((o: { code: string }) => o.code === code);
  if (!order) throw new Error(`Không tìm thấy đơn ${code}`);
  return api.patch(`${API_URL}/admin/orders/${order.id}/status`, { data: { status } });
}
