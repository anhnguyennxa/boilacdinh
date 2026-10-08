import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '../auth-form';

export const metadata: Metadata = { title: 'Đăng ký' };

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
