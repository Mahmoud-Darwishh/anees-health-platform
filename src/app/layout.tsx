import type { Metadata } from 'next';
import { locales } from '@/i18n/request';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Anees Health',
  description: 'Anees Health is Egypt\'s leading home healthcare and telemedicine platform for seniors and chronic care patients—doctor home visits, skilled nursing, physiotherapy, lab at home, remote monitoring, medication management, and 24/7 medical support across Cairo, Giza, and Alexandria.',
  keywords: 'Anees Health, home healthcare Egypt, doctor home visit, home nurse Egypt, telemedicine Egypt, physiotherapy at home, elderly care Cairo, chronic disease management, palliative home care, post operative care, lab tests at home, remote patient monitoring, medical equipment rental',
  icons: {
    icon: '/assets/img/fav.png',
  },
  openGraph: {
    title: 'Anees Health | Home Healthcare & Telemedicine Egypt',
    description: 'Trusted home healthcare and telemedicine across Egypt: doctor home visits, skilled nursing, physiotherapy, lab at home, chronic disease management, and 24/7 medical support for seniors and families.',
    siteName: 'Anees Health',
    url: 'https://aneeshealth.com/',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anees Health | Home Healthcare & Telemedicine Egypt',
    description: 'Home healthcare and telemedicine in Egypt: doctor home visits, nursing, physiotherapy, lab at home, chronic care, and 24/7 support for seniors and families.',
  },
  alternates: {
    canonical: 'https://aneeshealth.com/',
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
    <>
      {children}
      
      {/* Chatbot Script - Lazy load */}
      <Script id="chatbot-config" strategy="lazyOnload">
        {`window.chtlConfig = { chatbotId: "9941775766" };`}
      </Script>
      <Script
        src="https://chatling.ai/js/embed.js"
        data-id="9941775766"
        strategy="lazyOnload"
        async
      />

      {/* Microsoft Clarity - Lazy load */}
      <Script id="clarity-script" strategy="lazyOnload">
        {`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "u69yeirgmi");
        `}
      </Script>

      {/* Meta Pixel - Lazy load */}
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
    </>
  );
}
