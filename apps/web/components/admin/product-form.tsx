'use client';

import { SLUG_PATTERN, slugify, type CategoryDto, type ProductDetailDto } from '@foodhub/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFieldArray, useForm, useWatch, type Control, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { lastListUrl } from '@/lib/admin-list-url';
import { cn } from '@/lib/utils';
import { ImageUpload } from './image-upload';


const optionSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên lựa chọn'),
  extraPrice: z.number({ invalid_type_error: 'Nhập số' }).int().min(0, 'Không âm'),
});

const groupSchema = z
  .object({
    name: z.string().trim().min(1, 'Nhập tên nhóm'),
    isRequired: z.boolean(),
    maxSelect: z.number({ invalid_type_error: 'Nhập số' }).int().min(1, 'Tối thiểu 1').max(20),
    options: z.array(optionSchema).min(1, 'Cần ít nhất 1 lựa chọn'),
  })
  .refine((g) => g.maxSelect <= g.options.length, { message: 'Không lớn hơn số lựa chọn', path: ['maxSelect'] });

const schema = z.object({
  name: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(120),
  slug: z.string().regex(SLUG_PATTERN, 'Chỉ chữ thường không dấu, số và dấu gạch ngang'),
  categoryId: z.string().uuid('Chọn danh mục'),
  basePrice: z.number({ invalid_type_error: 'Nhập giá' }).int().min(1000, 'Giá tối thiểu 1.000đ').max(10_000_000),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().nullable(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  optionGroups: z.array(groupSchema).max(10),
});
type FormValues = z.infer<typeof schema>;

/** Nhóm tùy chọn hay dùng cho đồ uống — thêm nhanh một chạm */
const PRESETS: { label: string; group: FormValues['optionGroups'][number] }[] = [
  { label: 'Size', group: { name: 'Size', isRequired: true, maxSelect: 1, options: [{ name: 'M', extraPrice: 0 }, { name: 'L', extraPrice: 8000 }] } },
  {
    label: 'Đường',
    group: { name: 'Đường', isRequired: true, maxSelect: 1, options: ['100%', '70%', '50%', '30%', 'Không đường'].map((name) => ({ name, extraPrice: 0 })) },
  },
  { label: 'Đá', group: { name: 'Đá', isRequired: true, maxSelect: 1, options: ['Bình thường', 'Ít đá', 'Không đá'].map((name) => ({ name, extraPrice: 0 })) } },
  {
    label: 'Topping',
    group: { name: 'Topping', isRequired: false, maxSelect: 3, options: [{ name: 'Trân châu đen', extraPrice: 5000 }, { name: 'Pudding trứng', extraPrice: 7000 }] },
  },
];

function toFormValues(p?: ProductDetailDto): FormValues {
  return {
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    categoryId: p?.category.id ?? '',
    basePrice: p?.basePrice ?? (undefined as unknown as number),
    description: p?.description ?? '',
    imageUrl: p?.imageUrl ?? null,
    isAvailable: p?.isAvailable ?? true,
    isFeatured: p?.isFeatured ?? false,
    optionGroups: (p?.optionGroups ?? []).map((g) => ({
      name: g.name,
      isRequired: g.isRequired,
      maxSelect: g.maxSelect,
      options: g.options.map((o) => ({ name: o.name, extraPrice: o.extraPrice })),
    })),
  };
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-5 w-8 shrink-0 rounded-full transition-colors duration-150', checked ? 'bg-primary' : 'bg-border-strong')}
      >
        <span className={cn('absolute top-0.5 size-4 rounded-full bg-[#ffffff] shadow-sm transition-[left] duration-200 ease-spring', checked ? 'left-3.5' : 'left-0.5')} />
      </button>
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function OptionsEditor({
  control,
  register,
  groupIndex,
  errors,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  groupIndex: number;
  errors?: FieldErrors<FormValues>['optionGroups'];
}) {
  const { fields, append, remove } = useFieldArray({ control, name: `optionGroups.${groupIndex}.options` });
  const groupErrors = errors?.[groupIndex];
  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={f.id} className="flex items-start gap-2">
          <Input
            placeholder="Tên lựa chọn"
            aria-label="Tên lựa chọn"
            aria-invalid={!!groupErrors?.options?.[i]?.name}
            {...register(`optionGroups.${groupIndex}.options.${i}.name`)}
          />
          <div className="relative w-36 shrink-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+</span>
            <Input
              type="number"
              inputMode="numeric"
              step={1000}
              min={0}
              aria-label="Giá cộng thêm"
              className="pl-6 pr-6 text-right tabular-nums"
              aria-invalid={!!groupErrors?.options?.[i]?.extraPrice}
              {...register(`optionGroups.${groupIndex}.options.${i}.extraPrice`, { valueAsNumber: true })}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">đ</span>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Xóa lựa chọn" onClick={() => remove(i)} disabled={fields.length === 1}>
            <X />
          </Button>
        </div>
      ))}
      {groupErrors?.options?.root?.message || groupErrors?.options?.message ? (
        <p className="text-xs text-danger">{groupErrors?.options?.root?.message ?? groupErrors?.options?.message}</p>
      ) : null}
      <Button type="button" variant="ghost" size="sm" onClick={() => append({ name: '', extraPrice: 0 })}>
        <Plus /> Thêm lựa chọn
      </Button>
    </div>
  );
}

export function ProductForm({ product }: { product?: ProductDetailDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editing = !!product;
  // Slug tự sinh theo tên (cả khi sửa) — trừ khi slug hiện tại là slug đặt tay (không khớp tên)
  const [slugTouched, setSlugTouched] = useState(() => !!product && product.slug !== slugify(product.name));

  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: () => api<(CategoryDto & { productCount: number })[]>('/admin/categories') });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(product) });
  const { register, control, handleSubmit, setValue, formState } = form;
  const errors = formState.errors;
  const groups = useFieldArray({ control, name: 'optionGroups' });
  const [imageUrl, isAvailable, isFeatured, watchedGroups, slug] = useWatch({
    control,
    name: ['imageUrl', 'isAvailable', 'isFeatured', 'optionGroups', 'slug'],
  });
  const slugChanged = editing && slug !== product.slug;

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = { ...v, description: v.description || undefined };
      return editing
        ? api<ProductDetailDto>(`/admin/products/${product.id}`, { method: 'PATCH', body })
        : api<ProductDetailDto>('/admin/products', { method: 'POST', body });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['product', saved.slug] });
      toast.success(editing ? 'Đã lưu thay đổi' : `Đã thêm món “${saved.name}”`);
      router.push(lastListUrl());
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api(`/admin/products/${product!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Đã xóa món');
      router.push(lastListUrl());
    },
    onError: (e) => toast.error(e.message),
  });

  const card = 'space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-md';

  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 pb-24">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className={card}>
            <h2 className="text-sm font-semibold">Thông tin món</h2>
            <Field label="Tên món" error={errors.name?.message}>
              <Input
                aria-invalid={!!errors.name}
                {...register('name', {
                  onChange: (e) => !slugTouched && setValue('slug', slugify(e.target.value), { shouldValidate: formState.isSubmitted }),
                })}
              />
            </Field>
            <Field label="Đường dẫn (slug)" error={errors.slug?.message}>
              <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-primary focus-within:shadow-ring">
                <span className="pl-3 text-sm text-muted-foreground">/mon/</span>
                <input
                  className="h-9 w-full rounded-xl bg-transparent pr-3 text-base text-foreground focus:outline-none"
                  aria-invalid={!!errors.slug}
                  {...register('slug', { onChange: () => setSlugTouched(true) })}
                />
              </div>
            </Field>
            {slugChanged ? (
              <div role="status" className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
                <span>
                  Link cũ <span className="font-mono">/mon/{product.slug}</span> sẽ không còn hoạt động sau khi lưu.
                </span>
                <button
                  type="button"
                  className="font-medium underline underline-offset-2 hover:no-underline"
                  onClick={() => {
                    setValue('slug', product.slug, { shouldValidate: formState.isSubmitted });
                    setSlugTouched(true); // giữ cố định, không chạy theo tên nữa
                  }}
                >
                  Giữ đường dẫn cũ
                </button>
              </div>
            ) : (
              <p className="-mt-2 text-xs text-muted-foreground">
                {slugTouched ? 'Đường dẫn đặt tay — không tự đổi theo tên.' : 'Tự sinh theo tên món; sửa ô này nếu muốn đặt riêng.'}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Danh mục" error={errors.categoryId?.message}>
                <select
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:border-primary focus:shadow-ring focus:outline-none"
                  aria-invalid={!!errors.categoryId}
                  {...register('categoryId')}
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Giá cơ bản (đ)" error={errors.basePrice?.message}>
                <Input
                  type="number"
                  inputMode="numeric"
                  step={1000}
                  min={0}
                  className="tabular-nums"
                  aria-invalid={!!errors.basePrice}
                  {...register('basePrice', { valueAsNumber: true })}
                />
              </Field>
            </div>
            <Field label="Mô tả" error={errors.description?.message}>
              <Textarea rows={3} placeholder="Nguyên liệu, hương vị, khẩu phần…" {...register('description')} />
            </Field>
          </section>

          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Nhóm tùy chọn</h2>
                <p className="text-xs text-muted-foreground">Size, đường, đá, topping… Giá lựa chọn được cộng vào giá cơ bản.</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={watchedGroups?.some((g) => g.name === p.group.name)}
                    onClick={() => groups.append(structuredClone(p.group))}
                  >
                    <Plus /> {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {groups.fields.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                Món không có tùy chọn. Thêm nhóm nếu khách cần chọn size, topping…
              </p>
            )}

            {groups.fields.map((g, i) => (
              <div key={g.id} className="space-y-3 rounded-xl border border-border bg-background p-3">
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <Input placeholder="Tên nhóm (vd. Size)" aria-label="Tên nhóm" aria-invalid={!!errors.optionGroups?.[i]?.name} {...register(`optionGroups.${i}.name`)} />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Chọn tối đa
                      <Input
                        type="number"
                        min={1}
                        className="w-16 text-center"
                        aria-invalid={!!errors.optionGroups?.[i]?.maxSelect}
                        {...register(`optionGroups.${i}.maxSelect`, { valueAsNumber: true })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" className="size-4 accent-[rgb(var(--primary))]" {...register(`optionGroups.${i}.isRequired`)} />
                      Bắt buộc
                    </label>
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Xóa nhóm ${watchedGroups?.[i]?.name ?? ''}`} onClick={() => groups.remove(i)}>
                    <Trash2 />
                  </Button>
                </div>
                {(errors.optionGroups?.[i]?.name || errors.optionGroups?.[i]?.maxSelect) && (
                  <p className="text-xs text-danger">{errors.optionGroups?.[i]?.name?.message ?? errors.optionGroups?.[i]?.maxSelect?.message}</p>
                )}
                <OptionsEditor control={control} register={register} groupIndex={i} errors={errors.optionGroups} />
              </div>
            ))}
          </section>
        </div>

        <aside className="space-y-4">
          <section className={card}>
            <h2 className="text-sm font-semibold">Ảnh món</h2>
            <ImageUpload value={imageUrl} onChange={(url) => setValue('imageUrl', url, { shouldDirty: true })} />
          </section>
          <section className={card}>
            <h2 className="text-sm font-semibold">Hiển thị</h2>
            <Switch checked={isAvailable} onChange={(v) => setValue('isAvailable', v, { shouldDirty: true })} label="Còn món" hint="Tắt khi hết nguyên liệu — khách vẫn thấy nhưng không đặt được" />
            <Switch checked={isFeatured} onChange={(v) => setValue('isFeatured', v, { shouldDirty: true })} label="Món nổi bật" />
          </section>
          {editing && (
            <section className={card}>
              <h2 className="text-sm font-semibold">Vùng nguy hiểm</h2>
              <p className="text-xs text-muted-foreground">Món bị ẩn khỏi thực đơn; đơn cũ vẫn giữ tên và giá lúc đặt.</p>
              <Button
                type="button"
                variant="outline"
                className="w-full text-danger hover:text-danger"
                loading={remove.isPending}
                onClick={() => window.confirm(`Xóa món “${product.name}”?`) && remove.mutate()}
              >
                <Trash2 /> Xóa món
              </Button>
            </section>
          )}
        </aside>
      </div>

      {/* Thanh lưu cố định ở đáy */}
      <div className="fixed inset-x-0 bottom-0 z-[2] border-t border-border bg-background px-4 py-3 md:left-[232px]">
        <div className="mx-auto flex max-w-container items-center justify-end gap-2">
          {Object.keys(errors).length > 0 && <p className="mr-auto text-xs text-danger">Kiểm tra lại các ô báo lỗi</p>}
          <Button type="button" variant="ghost" asChild>
            <Link href="/admin/mon">Hủy</Link>
          </Button>
          <Button type="submit" loading={save.isPending}>
            {editing ? 'Lưu thay đổi' : 'Thêm món'}
          </Button>
        </div>
      </div>
    </form>
  );
}
