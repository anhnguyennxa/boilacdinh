import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBox } from '@/components/layout/header';
import { ProductGrid } from '@/components/product/product-grid';
import { EmptyState } from '@/components/ui/misc';
import { getProducts } from '@/lib/api';

export const metadata: Metadata = { title: 'Tìm kiếm' };

const SUGGESTIONS = ['phở', 'trà sữa', 'cà phê', 'bánh mì', 'gà rán', 'nước ép'];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? '';
  const results = q ? await getProducts({ q, limit: 24 }) : null;

  return (
    <div className="pt-6">
      <Suspense>
        <SearchBox key={q} className="md:hidden" />
      </Suspense>
      <h1 className="mt-4 text-2xl font-semibold md:mt-0">{q ? <>Kết quả cho “{q}”</> : 'Tìm món'}</h1>

      {results && results.data.length > 0 && (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{results.meta.total} món phù hợp</p>
          <div className="mt-5">
            <ProductGrid products={results.data} priorityCount={2} />
          </div>
        </>
      )}

      {(!results || results.data.length === 0) && (
        <div className="mt-6 space-y-6">
          {results && (
            <EmptyState emoji="🔍" title="Không tìm thấy món nào" description="Thử từ khóa khác, có thể gõ không dấu như “tra sua”." />
          )}
          <div>
            <p className="mb-3 text-sm font-semibold text-muted-foreground">Gợi ý tìm kiếm</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/tim-kiem?q=${encodeURIComponent(s)}`}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-primary/50"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
