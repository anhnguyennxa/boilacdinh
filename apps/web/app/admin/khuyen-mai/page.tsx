'use client';

import { promoCondition, promoHeadline, type CouponType } from '@foodhub/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AdminOnly } from '@/components/admin/admin-only';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  isPublic: boolean;
  description: string | null;
}

type Status = 'active' | 'scheduled' | 'expired' | 'exhausted';
const STATUS: Record<Status, { label: string; tone: 'secondary' | 'neutral' | 'danger' | 'primary' }> = {
  active: { label: 'Đang chạy', tone: 'secondary' },
  scheduled: { label: 'Chưa bắt đầu', tone: 'primary' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
  exhausted: { label: 'Hết lượt', tone: 'danger' },
};

function statusOf(c: Coupon, now = Date.now()): Status {
  if (Date.parse(c.endsAt) <= now) return 'expired';
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return 'exhausted';
  if (Date.parse(c.startsAt) > now) return 'scheduled';
  return 'active';
}

const dateVn = (iso: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
/** ISO → giá trị cho <input type="datetime-local"> theo giờ máy */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

// Ô để trống → null nhờ setValueAs của từng input (xem numberField)
const optionalInt = z.number({ invalid_type_error: 'Nhập số' }).int().min(1, 'Tối thiểu 1').nullable();

const schema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, '3–30 ký tự: chữ in hoa, số, - hoặc _'),
    type: z.enum(['PERCENT', 'FIXED']),
    value: z.number({ invalid_type_error: 'Nhập giá trị' }).int().min(1, 'Lớn hơn 0'),
    minOrder: z.number({ invalid_type_error: 'Nhập số' }).int().min(0),
    // Chỉ có nghĩa với loại %, kiểm tra ở refine bên dưới — ô bị ẩn khi chọn "cố định"
    maxDiscount: z.number().int().nullable(),
    usageLimit: optionalInt,
    startsAt: z.string().min(1, 'Chọn thời gian'),
    endsAt: z.string().min(1, 'Chọn thời gian'),
    isPublic: z.boolean(),
    description: z.string().trim().max(120, 'Tối đa 120 ký tự'),
  })
  .refine((v) => v.type !== 'PERCENT' || v.value <= 100, { message: 'Phần trăm tối đa 100', path: ['value'] })
  .refine((v) => v.type !== 'PERCENT' || v.maxDiscount == null || v.maxDiscount >= 1000, {
    message: 'Tối thiểu 1.000đ hoặc để trống',
    path: ['maxDiscount'],
  })
  .refine((v) => Date.parse(v.endsAt) > Date.parse(v.startsAt), { message: 'Phải sau thời gian bắt đầu', path: ['endsAt'] });
type FormValues = z.infer<typeof schema>;

const FIELD_LABEL: Record<string, string> = {
  code: 'Mã',
  type: 'Loại giảm',
  value: 'Mức giảm',
  minOrder: 'Đơn tối thiểu',
  maxDiscount: 'Giảm tối đa',
  usageLimit: 'Số lượt',
  startsAt: 'Bắt đầu',
  endsAt: 'Kết thúc',
  description: 'Mô tả',
};

function CouponDialog({ coupon, onClose }: { coupon?: Coupon; onClose: () => void }) {
  const queryClient = useQueryClient();
  const now = new Date();
  const { register, handleSubmit, control, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minOrder: coupon.minOrder,
          maxDiscount: coupon.maxDiscount,
          usageLimit: coupon.usageLimit,
          startsAt: toLocalInput(coupon.startsAt),
          endsAt: toLocalInput(coupon.endsAt),
          isPublic: coupon.isPublic,
          description: coupon.description ?? '',
        }
      : {
          code: '',
          type: 'PERCENT',
          value: 10,
          minOrder: 0,
          maxDiscount: null,
          usageLimit: null,
          startsAt: toLocalInput(now.toISOString()),
          endsAt: toLocalInput(new Date(now.getTime() + 30 * 86_400_000).toISOString()),
          isPublic: false,
          description: '',
        },
  });
  const e = formState.errors;
  const [type, isPublic] = useWatch({ control, name: ['type', 'isPublic'] });
  const codeLocked = !!coupon && coupon.usedCount > 0;

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = {
        ...v,
        // null (không phải undefined) để xóa giá trị cũ khi đổi sang "cố định" hoặc bỏ giới hạn lượt
        maxDiscount: v.type === 'PERCENT' && v.maxDiscount ? v.maxDiscount : null,
        usageLimit: v.usageLimit,
        startsAt: new Date(v.startsAt).toISOString(),
        endsAt: new Date(v.endsAt).toISOString(),
        description: v.description || undefined,
        ...(codeLocked ? { code: undefined } : {}),
      };
      return coupon ? api(`/admin/coupons/${coupon.id}`, { method: 'PATCH', body }) : api('/admin/coupons', { method: 'POST', body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success(coupon ? 'Đã lưu mã giảm giá' : 'Đã tạo mã giảm giá');
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const numberField = (name: 'value' | 'minOrder' | 'maxDiscount' | 'usageLimit') =>
    register(name, { setValueAs: (v: string) => (v === '' ? null : Number(v)) });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="md:max-w-[560px]">
        <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 overflow-y-auto p-5">
          <div>
            <DialogTitle className="text-base font-semibold">{coupon ? `Sửa mã ${coupon.code}` : 'Tạo mã giảm giá'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Server tính lại mức giảm khi khách đặt — không tin số tiền từ trình duyệt.</DialogDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã" error={e.code?.message}>
              <Input className="font-mono uppercase" disabled={codeLocked} aria-invalid={!!e.code} {...register('code')} />
            </Field>
            <Field label="Loại giảm">
              <select
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:border-primary focus:outline-none"
                {...register('type', { onChange: (ev) => ev.target.value === 'FIXED' && setValue('maxDiscount', null) })}
              >
                <option value="PERCENT">Theo phần trăm</option>
                <option value="FIXED">Số tiền cố định</option>
              </select>
            </Field>
            <Field label={type === 'PERCENT' ? 'Giảm (%)' : 'Giảm (đ)'} error={e.value?.message}>
              <Input type="number" min={1} step={type === 'PERCENT' ? 1 : 1000} aria-invalid={!!e.value} {...numberField('value')} />
            </Field>
            {type === 'PERCENT' ? (
              <Field label="Giảm tối đa (đ, để trống = không giới hạn)" error={e.maxDiscount?.message}>
                <Input type="number" min={1} step={1000} {...numberField('maxDiscount')} />
              </Field>
            ) : (
              <div />
            )}
            <Field label="Đơn tối thiểu (đ)" error={e.minOrder?.message}>
              <Input type="number" min={0} step={1000} aria-invalid={!!e.minOrder} {...numberField('minOrder')} />
            </Field>
            <Field label="Số lượt (để trống = không giới hạn)" error={e.usageLimit?.message}>
              <Input type="number" min={1} {...numberField('usageLimit')} />
            </Field>
            <Field label="Bắt đầu" error={e.startsAt?.message}>
              <Input type="datetime-local" aria-invalid={!!e.startsAt} {...register('startsAt')} />
            </Field>
            <Field label="Kết thúc" error={e.endsAt?.message}>
              <Input type="datetime-local" aria-invalid={!!e.endsAt} {...register('endsAt')} />
            </Field>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
            <input type="checkbox" className="mt-0.5 size-4 accent-[rgb(var(--primary))]" {...register('isPublic')} />
            <span>
              <span className="block text-sm">Hiện trên trang chủ</span>
              <span className="block text-xs text-muted-foreground">Mã xuất hiện ở khối “Ưu đãi hôm nay” khi đang chạy và còn lượt.</span>
            </span>
          </label>
          {isPublic && (
            <Field label="Mô tả cho khách" error={e.description?.message}>
              <Input placeholder="vd. Chào bạn mới — áp dụng cho mọi món" {...register('description')} />
            </Field>
          )}
          {/* Liệt kê mọi lỗi, kể cả ô đang ẩn — tránh bấm Lưu mà không có phản hồi */}
          {Object.keys(e).length > 0 && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
              Kiểm tra lại: {Object.entries(e).map(([k, v]) => `${FIELD_LABEL[k] ?? k} — ${v?.message}`).join('; ')}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={save.isPending}>
              {coupon ? 'Lưu' : 'Tạo mã'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Coupons() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-coupons'], queryFn: () => api<Coupon[]>('/admin/coupons') });
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Coupon> }) => api(`/admin/coupons/${id}`, { method: 'PATCH', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
    onError: (err) => toast.error(err.message),
  });
  const remove = useMutation({
    mutationFn: (c: Coupon) => api(`/admin/coupons/${c.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Đã xóa mã');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Khuyến mãi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mã đã có đơn dùng không xóa được — hãy ẩn hoặc cho hết hạn.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus /> Tạo mã
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Mã</th>
              <th className="px-4 py-3 font-medium">Ưu đãi</th>
              <th className="px-4 py-3 font-medium">Thời gian</th>
              <th className="px-4 py-3 font-medium">Đã dùng</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-center font-medium">Trang chủ</th>
              <th className="px-4 py-3">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading &&
              Array.from({ length: 4 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <Skeleton className="h-8" />
                  </td>
                </tr>
              ))}
            {data?.map((c) => {
              const st = statusOf(c);
              const pct = c.usageLimit ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : null;
              return (
                <tr key={c.id} className={cn(st === 'expired' && 'text-muted-foreground')}>
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-medium">{c.code}</span>
                    {c.description && <span className="block max-w-[200px] truncate text-xs text-muted-foreground">{c.description}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {promoHeadline(c)}
                    <span className="block text-xs text-muted-foreground">{promoCondition(c)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                    {dateVn(c.startsAt)}
                    <br />→ {dateVn(c.endsAt)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {c.usedCount}
                    {c.usageLimit != null && <span className="text-muted-foreground"> / {c.usageLimit}</span>}
                    {pct != null && (
                      <span className="mt-1 block h-1 w-24 rounded-full bg-muted" aria-hidden>
                        <span className="block h-full rounded-full bg-chart" style={{ width: `${pct}%` }} />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS[st].tone}>{STATUS[st].label}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-pressed={c.isPublic}
                      aria-label={c.isPublic ? `Ẩn ${c.code} khỏi trang chủ` : `Hiện ${c.code} trên trang chủ`}
                      onClick={() => patch.mutate({ id: c.id, body: { isPublic: !c.isPublic } })}
                      className={c.isPublic ? 'text-primary' : undefined}
                    >
                      {c.isPublic ? <Eye /> : <EyeOff />}
                    </Button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label={`Sửa ${c.code}`}>
                        <Pencil /> Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger"
                        aria-label={`Xóa ${c.code}`}
                        onClick={() => window.confirm(`Xóa mã ${c.code}?`) && remove.mutate(c)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <CouponDialog key={editing === 'new' ? 'new' : editing.id} coupon={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function CouponsPage() {
  return (
    <AdminOnly>
      <Coupons />
    </AdminOnly>
  );
}
