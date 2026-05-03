import { NextRequest, NextResponse } from 'next/server';
import {
  AppLocale,
  countSubscriptions,
  removeSubscription,
  upsertSubscription,
} from '@/lib/pwa/subscription-store';

type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type SubscribeRequest = {
  subscription: PushSubscriptionPayload;
  locale?: AppLocale;
};

type UnsubscribeRequest = {
  endpoint: string;
};

export const runtime = 'nodejs';

function isValidSubscription(subscription: PushSubscriptionPayload) {
  return Boolean(
    subscription?.endpoint &&
      subscription?.keys?.p256dh &&
      subscription?.keys?.auth
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscribeRequest;

    if (!isValidSubscription(body.subscription)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid push subscription payload',
        },
        { status: 400 }
      );
    }

    const locale: AppLocale = body.locale === 'ar' ? 'ar' : 'en';

    await upsertSubscription({
      endpoint: body.subscription.endpoint,
      keys: {
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
      },
      locale,
    });

    const totalSubscriptions = await countSubscriptions();

    return NextResponse.json(
      {
        success: true,
        totalSubscriptions,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[PWA Subscribe Error]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save push subscription',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as UnsubscribeRequest;

    if (!body.endpoint) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing endpoint',
        },
        { status: 400 }
      );
    }

    await removeSubscription(body.endpoint);

    const totalSubscriptions = await countSubscriptions();

    return NextResponse.json(
      {
        success: true,
        totalSubscriptions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PWA Unsubscribe Error]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to remove push subscription',
      },
      { status: 500 }
    );
  }
}
