import type { CategoryDto, Paginated, ProductDetailDto, ProductSummaryDto, PromoDto } from '@foodhub/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
// API treo (đang deploy, đang "ngủ" trên gói free) → báo lỗi thay vì treo: lúc build trang rơi về dữ liệu rỗng,
// lúc chạy Next giữ bản cache cũ và hiện trang "Bếp đang bận" nếu chưa có cache
const TIMEOUT_MS = process.env.NEXT_PHASE === 'phase-production-build' ? 8_000 : 15_000;

export class NotFoundError extends Error {}

/** Server Components gọi thẳng NestJS; dữ liệu thực đơn gắn tag "menu" để revalidateTag khi admin sửa. */
async function get<T>(path: string, init: { revalidate?: number | false; tags?: string[] } = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    next: { revalidate: init.revalidate ?? 300, tags: init.tags ?? ['menu'] },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`API ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export async function getCategories() {
  return (await get<{ data: CategoryDto[] }>('/categories')).data;
}

export interface ProductListParams {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
}

export function getProducts(params: ProductListParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  return get<Paginated<ProductSummaryDto>>(`/products?${qs}`);
}

export async function getProduct(slug: string) {
  return (await get<{ data: ProductDetailDto }>(`/products/${encodeURIComponent(slug)}`)).data;
}

/** Mã giảm giá công khai cho hero ưu đãi; tag "promos" được revalidate khi admin sửa mã. */
export async function getPromos() {
  return (await get<{ data: PromoDto[] }>('/coupons/public', { tags: ['promos'] })).data;
}

export async function getRelated(slug: string) {
  return (await get<{ data: ProductSummaryDto[] }>(`/products/${encodeURIComponent(slug)}/related`)).data;
}
