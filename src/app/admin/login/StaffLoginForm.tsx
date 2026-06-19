'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl');
  // Only allow same-origin admin/clinician callbacks to avoid open-redirects.
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
      <div>
        <label htmlFor="email" className="form-label">Work email</label>
        <input
          id="email"
          type="email"
          className="form-control"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          dir="ltr"
        />
      </div>
      <div>
        <label htmlFor="password" className="form-label">Password</label>
        <input
          id="password"
          type="password"
          className="form-control"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error ? <div className="alert alert-danger py-2 mb-0" role="alert">{error}</div> : null}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-muted small mb-0">
        Forgot your password? Ask an administrator to send you a new set-password link.
      </p>
    </form>
  );
}
