'use client';

import type { ProductDetailDto } from '@foodhub/shared';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { use } from 'react';
import { AdminOnly } from '@/components/admin/admin-only';
import { ProductForm } from '@/components/admin/product-form';
import { Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api-client';

export default function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api<ProductDetailDto>(`/products/${encodeURIComponent(slug)}`),
    staleTime: 0,
  });

  return (
    <AdminOnly>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{data ? `Sửa “${data.name}”` : 'Sửa món'}</h1>
        {data && (
          <Link href={`/mon/${data.slug}`} target="_blank" className="text-sm text-primary hover:underline">
            Xem trang khách ↗
          </Link>
        )}
      </div>
      {error ? (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error.message}</p>
      ) : data ? (
        <ProductForm key={data.id} product={data} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </AdminOnly>
  );
}
