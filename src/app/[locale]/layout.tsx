import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { locales } from '@/i18n/request';
import '@/styles/globals.scss';
import '@/styles/legacy.scss';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const $locale = (await params).locale;

  if (!locales.includes($locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const direction = $locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={$locale} dir={direction}>
      <head>
        {/* Meta Tags */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Third-party stylesheets for Bootstrap and Icons */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" />
        
        {/* Legacy website stylesheets */}
        <link rel="stylesheet" href="/assets/css/feather.css" />
        <link rel="stylesheet" href="/assets/css/iconfont.css" />
        <link rel="stylesheet" href="/assets/css/iconsax.css" />
        <link rel="stylesheet" href="/assets/css/custom.css" />
        <link rel="stylesheet" href="/assets/css/customstyleclient.css" />
        <link rel="stylesheet" href="/assets/css/blog-grid.css" />
        <link rel="stylesheet" href="/assets/css/rtl.css" />
        
        {/* Meta Pixel NoScript */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1319531606525674&ev=PageView&noscript=1"
          />
        </noscript>
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        
        {/* Bootstrap JS */}
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}