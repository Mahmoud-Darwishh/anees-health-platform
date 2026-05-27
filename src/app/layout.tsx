import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { locales } from '@/i18n/request';
import LazyStylesheet from '@/components/common/LazyStylesheet';
import { buildSiteMetadata } from '@/lib/seo/metadata';
import { site } from '@/lib/seo/site';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  preload: false,
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Site-wide default metadata. Per-route metadata (in `[locale]/...`) overrides
 * this. Concrete JSON-LD (Organization, LocalBusiness, WebSite, FAQ, etc.) is
 * emitted ONCE from `[locale]/layout.tsx` — never here — so we don't ship
 * duplicate schema blocks or a default English-only block on Arabic pages.
 */
export const metadata: Metadata = {
  ...buildSiteMetadata(),
  icons: {
    icon: '/assets/img/fav.png',
    apple: '/assets/img/footer-logo.png',
  },
  category: 'Healthcare',
  other: {
    'google-site-verification': process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
    'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || '',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': site.name,
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={inter.variable} data-scroll-behavior="smooth">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0066cc" />
        {/* Egypt-targeted geo signals. The locale layout emits richer
            schema-level geo via LocalBusiness + Place. */}
        <meta name="geo.region" content="EG" />
        <meta name="geo.placename" content="Cairo, Egypt" />
        <meta name="geo.position" content={`${site.geo.latitude};${site.geo.longitude}`} />
        <meta name="ICBM" content={`${site.geo.latitude}, ${site.geo.longitude}`} />

        {/* Connection warm-up for render-critical and third-party origins */}
        <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="//chatling.ai" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://chatling.ai" crossOrigin="anonymous" />

        {/* Bootstrap (render-critical for shared grid/utilities) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        />

        {/* Legacy website stylesheets */}
        <link rel="stylesheet" href="/assets/css/feather.css" />
        <link rel="stylesheet" href="/assets/css/iconsax.css" />
        <link rel="stylesheet" href="/assets/css/custom.css" />

        {/* Meta Pixel NoScript */}
        <noscript>
          <img
            height="1"
            width="1"
            alt=""
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1319531606525674&ev=PageView&noscript=1"
          />
        </noscript>
      </head>
      <body>
        {/* Font Awesome — non-critical, decorative; lazy-loaded from client */}
        <LazyStylesheet
          id="fa-stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        {children}

        {/* Microsoft Clarity */}
        <Script id="clarity-script" strategy="lazyOnload">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "u69yeirgmi");
          `}
        </Script>

        {/* Chatling */}
        <Script id="chatling-script" strategy="lazyOnload">
          {`
            window.chtlConfig = { chatbotId: "9941775766" };
            (function () {
              var s = document.createElement('script');
              s.async = true;
              s.id = 'chtl-script';
              s.setAttribute('data-id', '9941775766');
              s.src = 'https://chatling.ai/js/embed.js';
              document.body.appendChild(s);
            })();
          `}
        </Script>

        {/* Meta Pixel */}
        <Script id="facebook-pixel" strategy="lazyOnload">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1319531606525674');
            fbq('track', 'PageView');
          `}
        </Script>
      </body>
    </html>
  );
}
