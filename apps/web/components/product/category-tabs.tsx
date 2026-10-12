import type { CategoryDto } from '@foodhub/shared';
import Link from 'next/link';
import { CATEGORY_EMOJI } from '@/lib/product-visual';
import { cn } from '@/lib/utils';

/** Cuộn ngang trên mobile, giữ query lọc/sắp xếp khi đổi danh mục. */
export function CategoryTabs({
  categories,
  active,
  query = '',
}: {
  categories: CategoryDto[];
  active?: string;
  query?: string;
}) {
  const tabs = [{ slug: '', name: 'Tất cả', emoji: '🍽️' }, ...categories.map((c) => ({ ...c, emoji: CATEGORY_EMOJI[c.slug] ?? '🍴' }))];
  return (
    <nav aria-label="Danh mục" className="relative -mx-4 overflow-x-auto px-4 scrollbar-none">
      <ul className="flex w-max gap-2 py-1">
        {tabs.map((t) => {
          const isActive = (active ?? '') === t.slug;
          return (
            <li key={t.slug || 'all'}>
              <Link
                href={`/thuc-don${t.slug ? `/${t.slug}` : ''}${query ? `?${query}` : ''}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-sm transition-colors duration-150',
                  isActive
                    ? 'border-border-strong bg-muted text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-surface hover:text-foreground',
                )}
              >
                <span aria-hidden>{t.emoji}</span>
                {t.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
