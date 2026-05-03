import { NextResponse } from 'next/server';
import { getPublicVapidKey } from '@/lib/pwa/push';

export const runtime = 'nodejs';

export async function GET() {
  const publicKey = getPublicVapidKey();

  if (!publicKey) {
    return NextResponse.json(
      {
        success: false,
        message: 'Public VAPID key is not configured',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      publicKey,
    },
    { status: 200 }
  );
}
