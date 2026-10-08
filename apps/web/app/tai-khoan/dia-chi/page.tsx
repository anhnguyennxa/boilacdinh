'use client';

import { addressSchema, type AddressInput } from '@foodhub/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Badge, EmptyState, Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api-client';

type Address = AddressInput & { id: string; isDefault: boolean };

function AddressForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: { city: 'TP. Hồ Chí Minh' },
  });
  const e = formState.errors;
  const create = useMutation({
    mutationFn: (v: AddressInput) => api('/users/me/addresses', { method: 'POST', body: v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Đã thêm địa chỉ');
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form noValidate onSubmit={handleSubmit((v) => create.mutate(v))} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:grid-cols-2">
      <Field label="Người nhận" error={e.receiverName?.message}><Input {...register('receiverName')} /></Field>
      <Field label="Số điện thoại" error={e.phone?.message}><Input type="tel" {...register('phone')} /></Field>
      <Field label="Số nhà, tên đường" error={e.street?.message} className="sm:col-span-2"><Input {...register('street')} /></Field>
      <Field label="Phường/Xã" error={e.ward?.message}><Input {...register('ward')} /></Field>
      <Field label="Quận/Huyện" error={e.district?.message}><Input {...register('district')} /></Field>
      <Field label="Tỉnh/Thành phố" error={e.city?.message} className="sm:col-span-2"><Input {...register('city')} /></Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={create.isPending}>Lưu địa chỉ</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Hủy</Button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['addresses'], queryFn: () => api<Address[]>('/users/me/addresses') });

  const mutate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'default' | 'delete' }) =>
      action === 'delete'
        ? api(`/users/me/addresses/${id}`, { method: 'DELETE' })
        : api(`/users/me/addresses/${id}`, { method: 'PATCH', body: { isDefault: true } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      {data?.length === 0 && !adding && <EmptyState emoji="📍" title="Chưa có địa chỉ nào" description="Lưu địa chỉ để thanh toán nhanh hơn." />}
      {data?.map((a) => (
        <div key={a.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              {a.receiverName} · {a.phone} {a.isDefault && <Badge tone="secondary" className="ml-1">Mặc định</Badge>}
            </p>
            <p className="text-muted-foreground">{[a.street, a.ward, a.district, a.city].join(', ')}</p>
            {!a.isDefault && (
              <button type="button" className="mt-1 text-xs font-semibold text-primary hover:underline" onClick={() => mutate.mutate({ id: a.id, action: 'default' })}>
                Đặt làm mặc định
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => mutate.mutate({ id: a.id, action: 'delete' })}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-danger"
            aria-label="Xóa địa chỉ"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      {adding ? (
        <AddressForm onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus /> Thêm địa chỉ
        </Button>
      )}
    </div>
  );
}
