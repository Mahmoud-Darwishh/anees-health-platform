import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { locales } from '@/i18n/request';
import { buildSiteMetadata } from '@/lib/seo/metadata';
import { site } from '@/lib/seo/site';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-sans-arabic',
});

/**
 * Site-wide default metadata. Per-route metadata (in `[locale]/...`) overrides
 * this. Concrete JSON-LD (Organization, LocalBusiness, WebSite, FAQ, etc.) is
 * emitted ONCE from `[locale]/layout.tsx` — never here — so we don't ship
 * duplicate schema blocks or a default English-only block on Arabic pages.
 */
export const metadata: Metadata = {
  ...buildSiteMetadata(),
  // All icons point to the SQUARE ECG mark. Google (and Apple devices) build the
  // search/home-screen icon from these — previously `apple` used the wide
  // `footer-logo.png`, which Google squashed into a stretched square. The 512px
  // version gives Google a crisp, correctly-proportioned icon to display.
  icons: {
    icon: [
      { url: '/assets/img/fav.png', type: 'image/png' },
      { url: '/assets/img/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/assets/img/pwa-icon-512.png',
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
    <html
      lang="en"
      dir="ltr"
      className={`${plusJakartaSans.variable} ${ibmPlexSansArabic.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#132c4d" />
        {/* Egypt-targeted geo signals. The locale layout emits richer
            schema-level geo via LocalBusiness + Place. */}
        <meta name="geo.region" content="EG" />
        <meta name="geo.placename" content="Cairo, Egypt" />
        <meta name="geo.position" content={`${site.geo.latitude};${site.geo.longitude}`} />
        <meta name="ICBM" content={`${site.geo.latitude}, ${site.geo.longitude}`} />

        {/* Connection warm-up for the third-party font origin (cdnjs). Bootstrap
            is now self-hosted, so the jsdelivr warm-up was removed. */}
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />

        {/* Bootstrap (render-critical for shared grid/utilities) — self-hosted,
            pinned v5.3.0: render-critical CSS is same-origin (faster first paint,
            resilient if a CDN is blocked, and no third-party request per visit).
            Deliberate <link> rather than a CSS import: it stays render-critical in
            <head> without entering the app's CSS-order graph (avoids FOUC /
            specificity shifts across the public, admin, and portal shells). */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />

        {/* Meta Pixel NoScript */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
