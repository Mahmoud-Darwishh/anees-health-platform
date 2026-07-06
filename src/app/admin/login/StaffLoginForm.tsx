'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Toast } from '@/components/ui';

export function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl');
  const safeCallback =
    rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('staff-credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password, or your account is not active.');
      return;
    }

    router.push(safeCallback);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="d-flex flex-column gap-3" noValidate>
      <Input
        id="email"
        type="email"
        label="Work email"
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        dir="ltr"
        experience="ops"
      />
      <Input
        id="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        experience="ops"
      />

      {error ? <Toast experience="ops" tone="danger" description={error} /> : null}

      <Button type="submit" experience="ops" disabled={loading} loading={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
      <p className="text-muted small mb-0">
        Forgot your password? Ask an administrator to send you a new set-password link.
      </p>
    </form>
  );
}
