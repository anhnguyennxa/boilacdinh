'use client';

import type { UserDto } from '@foodhub/shared';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)!;
  const { register, handleSubmit } = useForm({ defaultValues: { fullName: user.fullName, phone: user.phone ?? '' } });

  const save = useMutation({
    mutationFn: (v: { fullName: string; phone: string }) =>
      api<UserDto>('/users/me', { method: 'PATCH', body: { fullName: v.fullName, phone: v.phone || undefined } }),
    onSuccess: (updated) => {
      const { accessToken } = useAuthStore.getState();
      useAuthStore.getState().setSession({ user: updated, accessToken: accessToken! });
      toast.success('Đã lưu thông tin');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => save.mutate(v))}
      className="max-w-lg space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <h2 className="font-semibold">Thông tin cá nhân</h2>
      <Field label="Email">
        <Input value={user.email} disabled readOnly />
      </Field>
      <Field label="Họ tên">
        <Input {...register('fullName', { required: true, minLength: 2 })} />
      </Field>
      <Field label="Số điện thoại">
        <Input type="tel" {...register('phone')} />
      </Field>
      <Button type="submit" loading={save.isPending}>
        Lưu thay đổi
      </Button>
    </form>
  );
}
