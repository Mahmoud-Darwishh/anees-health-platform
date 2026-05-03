import { NextRequest, NextResponse } from 'next/server';
import { AppLocale, listSubscriptions, removeSubscription } from '@/lib/pwa/subscription-store';
import { sendPushToSubscription } from '@/lib/pwa/push';

type SendPushRequest = {
  title: string;
  body: string;
  url?: string;
  locale?: AppLocale;
};

export const runtime = 'nodejs';

function isAuthorized(request: NextRequest) {
  const configuredKey = process.env.PWA_PUSH_SERVER_KEY;
  if (!configuredKey) {
    return false;
  }

  const incoming = request.headers.get('x-pwa-server-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  return incoming === configuredKey;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as SendPushRequest;

    if (!body.title || !body.body) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: title and body',
        },
        { status: 400 }
      );
    }

    const targetLocale = body.locale === 'ar' ? 'ar' : body.locale === 'en' ? 'en' : undefined;
    const targets = await listSubscriptions(targetLocale);

    const payload = {
      title: body.title,
      body: body.body,
      url: body.url || '/en',
    };

    const results = await Promise.allSettled(
      targets.map((subscription) =>
        sendPushToSubscription(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          payload
        )
      )
    );

    let sent = 0;
    const failed: Array<{ endpoint: string; reason: string }> = [];

    results.forEach((result, index) => {
      const endpoint = targets[index]?.endpoint;

      if (result.status === 'fulfilled') {
        sent += 1;
        return;
      }

      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : 'Unknown push delivery error';

      failed.push({ endpoint, reason });

      const statusCode =
        typeof result.reason === 'object' &&
        result.reason !== null &&
        'statusCode' in result.reason &&
        typeof (result.reason as { statusCode?: unknown }).statusCode === 'number'
          ? (result.reason as { statusCode: number }).statusCode
          : undefined;

      if ((statusCode === 404 || statusCode === 410) && endpoint) {
        void removeSubscription(endpoint);
      }
    });

    return NextResponse.json(
      {
        success: true,
        requested: targets.length,
        sent,
        failed: failed.length,
        failures: failed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PWA Send Error]', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send push notifications',
      },
      { status: 500 }
    );
  }
}
