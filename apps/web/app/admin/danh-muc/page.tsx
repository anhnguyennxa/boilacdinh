'use client';

import { SLUG_PATTERN, slugify, type CategoryDto, type CategoryType } from '@foodhub/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AdminOnly } from '@/components/admin/admin-only';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api-client';
import { CATEGORY_EMOJI } from '@/lib/product-visual';

type AdminCategory = CategoryDto & { productCount: number };

const schema = z.object({
  name: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(60),
  slug: z.string().regex(SLUG_PATTERN, 'Chỉ chữ thường không dấu, số và dấu gạch ngang'),
  type: z.enum(['FOOD', 'DRINK']),
  sortOrder: z.number({ invalid_type_error: 'Nhập số' }).int().min(0).max(999),
});
type FormValues = z.infer<typeof schema>;

const TYPE_LABEL: Record<CategoryType, string> = { FOOD: 'Đồ ăn', DRINK: 'Đồ uống' };

function CategoryDialog({
  open,
  onOpenChange,
  category,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: AdminCategory;
  nextOrder: number;
}) {
  const queryClient = useQueryClient();
  // Slug tự sinh theo tên (cả khi sửa) — trừ khi slug hiện tại là slug đặt tay
  const [slugTouched, setSlugTouched] = useState(() => !!category && category.slug !== slugify(category.name));
  const { register, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: category
      ? { name: category.name, slug: category.slug, type: category.type, sortOrder: category.sortOrder }
      : { name: '', slug: '', type: 'FOOD', sortOrder: nextOrder },
  });
  const e = formState.errors;

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      category ? api(`/admin/categories/${category.id}`, { method: 'PATCH', body: v }) : api('/admin/categories', { method: 'POST', body: v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success(category ? 'Đã lưu danh mục' : 'Đã thêm danh mục');
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 p-5">
          <div>
            <DialogTitle className="text-base font-semibold">{category ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Danh mục hiện thành tab trên trang thực đơn.</DialogDescription>
          </div>
          <Field label="Tên" error={e.name?.message}>
            <Input
              autoFocus
              aria-invalid={!!e.name}
              {...register('name', { onChange: (ev) => !slugTouched && setValue('slug', slugify(ev.target.value)) })}
            />
          </Field>
          <Field label="Đường dẫn" error={e.slug?.message}>
            <Input aria-invalid={!!e.slug} {...register('slug', { onChange: () => setSlugTouched(true) })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loại">
              <select
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:border-primary focus:outline-none"
                {...register('type')}
              >
                <option value="FOOD">Đồ ăn</option>
                <option value="DRINK">Đồ uống</option>
              </select>
            </Field>
            <Field label="Thứ tự" error={e.sortOrder?.message}>
              <Input type="number" min={0} aria-invalid={!!e.sortOrder} {...register('sortOrder', { valueAsNumber: true })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={save.isPending}>
              {category ? 'Lưu' : 'Thêm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Categories() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api<AdminCategory[]>('/admin/categories') });
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);

  const remove = useMutation({
    mutationFn: (c: AdminCategory) => api(`/admin/categories/${c.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Đã xóa danh mục');
    },
    onError: (err) => toast.error(err.message),
  });

  const nextOrder = (data?.reduce((m, c) => Math.max(m, c.sortOrder), -1) ?? -1) + 1;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Danh mục</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sắp xếp theo “thứ tự” — số nhỏ đứng trước trên thực đơn.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus /> Thêm danh mục
        </Button>
      </div>

      <div className="relative mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-16 px-4 py-3 font-medium">Thứ tự</th>
              <th className="px-4 py-3 font-medium">Danh mục</th>
              <th className="px-4 py-3 font-medium">Loại</th>
              <th className="px-4 py-3 text-right font-medium">Số món</th>
              <th className="px-4 py-3">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-8" />
                  </td>
                </tr>
              ))}
            {data?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{c.sortOrder}</td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden>{CATEGORY_EMOJI[c.slug] ?? '🍴'}</span>
                    {c.name}
                  </span>
                  <span className="text-xs text-muted-foreground">/thuc-don/{c.slug}</span>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={c.type === 'DRINK' ? 'secondary' : 'neutral'}>{TYPE_LABEL[c.type]}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <Link href={`/admin/mon?category=${c.slug}`} className="hover:text-primary hover:underline">
                    {c.productCount}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label={`Sửa ${c.name}`}>
                      <Pencil /> Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:text-danger"
                      aria-label={`Xóa ${c.name}`}
                      title={c.productCount ? 'Còn món trong danh mục — chuyển món sang danh mục khác trước' : undefined}
                      disabled={remove.isPending}
                      onClick={() => window.confirm(`Xóa danh mục “${c.name}”?`) && remove.mutate(c)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryDialog
          key={editing === 'new' ? 'new' : editing.id}
          open
          onOpenChange={(v) => !v && setEditing(null)}
          category={editing === 'new' ? undefined : editing}
          nextOrder={nextOrder}
        />
      )}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <AdminOnly>
      <Categories />
    </AdminOnly>
  );
}
