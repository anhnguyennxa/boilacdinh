import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '../auth-form';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
