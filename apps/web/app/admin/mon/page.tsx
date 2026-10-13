'use client';

import type { CategoryDto, Paginated, ProductSummaryDto } from '@foodhub/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useDeferredValue, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminOnly } from '@/components/admin/admin-only';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/misc';
import { Pagination, rangeLabel } from '@/components/ui/pagination';
import { rememberListUrl } from '@/lib/admin-list-url';
import { api, apiRaw } from '@/lib/api-client';
import { cn, formatVnd } from '@/lib/utils';

const PAGE_SIZE = 20;

type Patch = Partial<Pick<ProductSummaryDto, 'basePrice' | 'isAvailable' | 'isFeatured'>>;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-8 rounded-full transition-colors duration-150', checked ? 'bg-primary' : 'bg-border-strong')}
    >
      <span className={cn('absolute top-0.5 size-4 rounded-full bg-[#ffffff] shadow-sm transition-[left] duration-200 ease-spring', checked ? 'left-3.5' : 'left-0.5')} />
    </button>
  );
}

function PriceCell({ product, onSave }: { product: ProductSummaryDto; onSave: (price: number) => void }) {
  const [value, setValue] = useState(String(product.basePrice));
  const commit = () => {
    const n = Number(value.replace(/\D/g, ''));
    if (!n || n === product.basePrice) return setValue(String(product.basePrice));
    onSave(n);
  };
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      aria-label={`Giá ${product.name}`}
      title={formatVnd(product.basePrice)}
      className="h-9 w-28 rounded-lg border border-border bg-surface px-2 text-right tabular-nums focus:border-primary focus:outline-none"
    />
  );
}

function ProductsTable() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [category, setCategory] = useState(params.get('category') ?? '');
  const term = useDeferredValue(q.trim());
  // Trang hiện tại nằm trên URL (?page=) → quay lại từ trang sửa món vẫn đúng trang đang xem
  const page = Math.max(1, Number(params.get('page')) || 1);
  const hrefFor = (p: number, cat = category) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set('page', String(p));
    else next.delete('page');
    if (cat) next.set('category', cat);
    else next.delete('category');
    return `${pathname}${next.size ? `?${next}` : ''}`;
  };
  // Đổi từ khóa/danh mục → về trang 1
  const resetPage = (cat = category) => router.replace(hrefFor(1, cat), { scroll: false });
  const qs = new URLSearchParams({
    limit: String(PAGE_SIZE),
    page: String(page),
    sort: 'newest',
    ...(term ? { q: term } : {}),
    ...(category ? { category } : {}),
  });
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin-products', term, category, page],
    queryFn: () => apiRaw<Paginated<ProductSummaryDto>>(`/admin/products?${qs}`),
    placeholderData: keepPreviousData,
  });
  const lastPage = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;
  useEffect(() => {
    if (data && page > lastPage) router.replace(hrefFor(lastPage), { scroll: false });
  });
  useEffect(() => rememberListUrl(hrefFor(page)));
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: () => api<(CategoryDto & { productCount: number })[]>('/admin/categories') });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Patch }) => api(`/admin/products/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success('Đã cập nhật — thực đơn khách thấy sẽ làm mới ngay');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (e) => toast.error(e.message),
  });
  const save = (id: string, body: Patch) => patch.mutate({ id, body });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Thực đơn</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.meta.total} món · ` : ''}Sửa nhanh giá (Enter để lưu), còn món, nổi bật ngay trên bảng.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/mon/moi">
            <Plus /> Thêm món
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="relative w-full max-w-xs">
          <span className="sr-only">Tìm món</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (params.get('page')) resetPage();
            }} placeholder="Tìm theo tên (không cần dấu)" className="h-8 pl-9" />
        </label>
        <select
          aria-label="Lọc theo danh mục"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            resetPage(e.target.value);
          }}
          className="h-8 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">Mọi danh mục</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name} ({c.productCount})
            </option>
          ))}
        </select>
      </div>

      <div className={cn('relative mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm transition-opacity', isPlaceholderData && 'opacity-60')}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Món</th>
              <th className="px-4 py-3 font-semibold">Danh mục</th>
              <th className="px-4 py-3 text-right font-semibold">Giá (đ)</th>
              <th className="px-4 py-3 text-center font-semibold">Còn món</th>
              <th className="px-4 py-3 text-center font-semibold">Nổi bật</th>
              <th className="px-4 py-3"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3"><Skeleton className="h-9" /></td>
                </tr>
              ))}
            {data?.data.map((p) => (
              <tr key={p.id} className={cn(!p.isAvailable && 'bg-muted/40')}>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/mon/${p.slug}`} className="flex items-center gap-3 font-medium transition-colors duration-150 hover:text-primary">
                    <ProductImage fit="cover" name={p.name} imageUrl={p.imageUrl} categorySlug={p.category.slug} sizes="40px" className="size-10 shrink-0 rounded-lg" emojiClassName="text-xl" />
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.category.name}</td>
                <td className="px-4 py-2.5 text-right">
                  <PriceCell key={p.basePrice} product={p} onSave={(basePrice) => save(p.id, { basePrice })} />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Toggle checked={p.isAvailable} label={`Còn món ${p.name}`} onChange={(isAvailable) => save(p.id, { isAvailable })} />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Toggle checked={p.isFeatured} label={`Nổi bật ${p.name}`} onChange={(isFeatured) => save(p.id, { isFeatured })} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/mon/${p.slug}`} aria-label={`Sửa ${p.name}`}>
                      <Pencil /> Sửa
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {data && data.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Không có món phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.meta.total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground tabular-nums">Món {rangeLabel(page, data.meta.limit, data.meta.total)}</p>
          <Pagination page={page} limit={data.meta.limit} total={data.meta.total} hrefFor={hrefFor} />
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <AdminOnly>
      <Suspense>
        <ProductsTable />
      </Suspense>
    </AdminOnly>
  );
}
