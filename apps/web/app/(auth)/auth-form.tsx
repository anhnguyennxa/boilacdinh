'use client';

import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@foodhub/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth-store';

/** Chỉ cho phép chuyển hướng nội bộ để tránh open redirect. */
function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

function useAfterAuth() {
  const router = useRouter();
  const params = useSearchParams();
  return () => {
    const user = useAuthStore.getState().user;
    const fallback = user?.role === 'ADMIN' ? '/admin' : user?.role === 'STAFF' ? '/admin/don-hang' : '/';
    router.replace(safeNext(params.get('next'), fallback));
    router.refresh();
  };
}

export function LoginForm() {
  const { login } = useAuth();
  const done = useAfterAuth();
  const params = useSearchParams();
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const { errors, isSubmitting } = formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        try {
          await login(v);
          done();
        } catch (e) {
          toast.error((e as Error).message);
        }
      })}
    >
      <h1 className="text-2xl font-semibold">Đăng nhập</h1>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field label="Mật khẩu" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Đăng nhập
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link href={`/dang-ky${params.size ? `?${params}` : ''}`} className="font-semibold text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const { register: signUp } = useAuth();
  const done = useAfterAuth();
  const params = useSearchParams();
  const { register, handleSubmit, formState } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const { errors, isSubmitting } = formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        try {
          await signUp({ ...v, phone: v.phone || undefined });
          toast.success('Tạo tài khoản thành công');
          done();
        } catch (e) {
          toast.error((e as Error).message);
        }
      })}
    >
      <h1 className="text-2xl font-semibold">Tạo tài khoản</h1>
      <Field label="Họ tên" error={errors.fullName?.message}>
        <Input autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field label="Số điện thoại (không bắt buộc)" error={errors.phone?.message}>
        <Input
          type="tel"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          {...register('phone', { setValueAs: (v: string) => v || undefined })}
        />
      </Field>
      <Field label="Mật khẩu" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Đăng ký
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link href={`/dang-nhap${params.size ? `?${params}` : ''}`} className="font-semibold text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
