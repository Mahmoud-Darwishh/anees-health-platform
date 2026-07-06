import type { AppLocale } from '@/lib/pwa/subscription-store';

export type PushBroadcastActionState = {
  status: 'idle' | 'success' | 'warning' | 'error';
  message?: string;
  requested?: number;
  sent?: number;
  failed?: number;
  fields?: {
    title?: string;
    body?: string;
    url?: string;
    locale?: 'all' | AppLocale;
  };
};

export const idlePushBroadcastState: PushBroadcastActionState = {
  status: 'idle',
  fields: {
    title: 'Anees Health',
    body: '',
    url: '/en/portal',
    locale: 'all',
  },
};
