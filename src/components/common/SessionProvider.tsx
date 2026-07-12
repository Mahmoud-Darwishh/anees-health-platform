'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  // Public traffic is overwhelmingly anonymous. The default provider re-hits
  // `/api/auth/session` (a server function) on every window/tab refocus; disable
  // that and any polling so anonymous visitors never trigger a session function.
  // Login state still updates on navigation and after sign-in/out.
  return (
    <NextAuthSessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </NextAuthSessionProvider>
  );
}
