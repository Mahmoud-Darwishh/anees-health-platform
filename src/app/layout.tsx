import type { Metadata } from 'next';
import { locales } from '@/i18n/request';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL('https://aneeshealth.com'),
  title: {
    default: 'Anees Health | Home Healthcare & Telemedicine Egypt',
    template: '%s | Anees Health',
  },
  description: 'Anees Health is Egypt\'s leading home healthcare and telemedicine platform for seniors and chronic care patients—doctor home visits, skilled nursing, physiotherapy, lab at home, remote monitoring, medication management, and 24/7 medical support across Cairo, Giza, and Alexandria.',
  keywords: 'Anees Health, home healthcare Egypt, doctor home visit, home nurse Egypt, telemedicine Egypt, physiotherapy at home, elderly care Cairo, chronic disease management, palliative home care, post operative care, lab tests at home, remote patient monitoring, medical equipment rental, رعاية صحية منزلية مصر، طبيب منزلي، تمريض منزلي',
  authors: [{ name: 'Anees Health' }],
  creator: 'Anees Health',
  publisher: 'Anees Health',
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: '/assets/img/fav.png',
    apple: '/logos/anees-health-logo.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Anees Health | Home Healthcare & Telemedicine Egypt',
    description: 'Trusted home healthcare and telemedicine across Egypt: doctor home visits, skilled nursing, physiotherapy, lab at home, chronic disease management, and 24/7 medical support for seniors and families.',
    siteName: 'Anees Health',
    url: 'https://aneeshealth.com/',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ar_EG'],
    images: [
      {
        url: '/assets/img/banner/anees-health-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Anees Health - Home Healthcare Services',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anees Health | Home Healthcare & Telemedicine Egypt',
    description: 'Home healthcare and telemedicine in Egypt: doctor home visits, nursing, physiotherapy, lab at home, chronic care, and 24/7 support for seniors and families.',
    creator: '@aneeshealth',
    site: '@aneeshealth',
    images: ['/assets/img/banner/anees-health-og.jpg'],
  },
  alternates: {
    canonical: 'https://aneeshealth.com/',
    languages: {
      'en-US': 'https://aneeshealth.com/en',
      'ar-EG': 'https://aneeshealth.com/ar',
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  category: 'Healthcare',
  other: {
    // Additional metadata for AI crawlers
    'google-site-verification': process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
    'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || '',
    // Chrome deprecates the Apple-specific flag; use the generic equivalent
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Anees Health',
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
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0066cc" />
        <meta name="geo.region" content="EG" />
        <meta name="geo.placename" content="Cairo, Egypt" />
        <meta name="geo.position" content="30.0444;31.2357" />
        <meta name="ICBM" content="30.0444, 31.2357" />

        {/* Third-party stylesheets for Bootstrap and Icons */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        />

        {/* Legacy website stylesheets */}
        <link rel="stylesheet" href="/assets/css/feather.css" />
        <link rel="stylesheet" href="/assets/css/iconfont.css" />
        <link rel="stylesheet" href="/assets/css/iconsax.css" />
        <link rel="stylesheet" href="/assets/css/custom.css" />
        <link rel="stylesheet" href="/assets/css/customstyleclient.css" />

        {/* Chatbot Script */}
        <script dangerouslySetInnerHTML={{ __html: `window.chtlConfig = { chatbotId: "9941775766" }` }} />
        <script async data-id="9941775766" id="chtl-script" type="text/javascript" src="https://chatling.ai/js/embed.js" />

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
        {children}

        {/* Organization Schema for AI Search Engine Optimization (GEO) */}
        <Script id="org-schema" type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'MedicalOrganization',
            '@id': 'https://aneeshealth.com/#organization',
            name: 'Anees Health',
            alternateName: ['Anees', 'أنيس هيلث', 'أنيس'],
            description: "Egypt's leading home healthcare and telemedicine platform for seniors and chronic care patients",
            url: 'https://aneeshealth.com',
            logo: 'https://aneeshealth.com/logos/anees-health-logo.png',
            image: 'https://aneeshealth.com/assets/img/banner/anees-health-og.jpg',
            telephone: '+20-1270558620',
            email: 'info@aneeshealth.com',
            
            // 24/7 Availability - Key for AI search
            openingHoursSpecification: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              opens: '00:00',
              closes: '23:59',
            },
            
            // Main Address
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Cairo',
              addressLocality: 'Cairo',
              addressRegion: 'Cairo',
              postalCode: '11511',
              addressCountry: 'EG',
            },
            
            // Multiple Service Locations
            areaServed: [
              {
                '@type': 'City',
                name: 'Cairo',
                sameAs: 'https://en.wikipedia.org/wiki/Cairo',
              },
              {
                '@type': 'City',
                name: 'Giza',
                sameAs: 'https://en.wikipedia.org/wiki/Giza',
              },
              
            ],
            
            // Social Media & Online Presence
            sameAs: [
              'https://www.facebook.com/aneeshealthcare/',
              'https://www.instagram.com/aneeshealth/',
              'https://www.linkedin.com/company/aneeshealth',
              'https://www.tiktok.com/@aneeshealth',
              'https://www.youtube.com/@aneeshealth',
            ],
            
            // Contact Points
            contactPoint: [
              {
                '@type': 'ContactPoint',
                telephone: '+20-1270558620',
                contactType: 'Customer Service',
                availableLanguage: ['English', 'Arabic'],
                areaServed: 'EG',
              },
              {
                '@type': 'ContactPoint',
                email: 'info@aneeshealth.com',
                contactType: 'Support',
              },
            ],
            
            // Medical Specialties Offered
            medicalSpecialty: [
              'Geriatrics',
              'Internal Medicine',
              'Physiotherapy',
              'Home Nursing',
              'Palliative Care',
              'Remote Patient Monitoring',
              'Telemedicine',
            ],
            
            // Services Offered with Pricing
            availableService: [
              {
                '@type': 'MedicalService',
                name: 'Doctor Home Visits',
                description: 'In-home consultations with qualified doctors',
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'EGP',
                  priceSpecification: {
                    '@type': 'PriceSpecification',
                    minPrice: '900',
                    priceCurrency: 'EGP',
                  },
                  availability: 'https://schema.org/InStock',
                  availableDeliveryMethod: 'https://schema.org/OnSitePickup',
                },
              },
              {
                '@type': 'MedicalService',
                name: 'Home Nursing',
                description: 'Skilled nursing care at home',
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'EGP',
                  priceSpecification: {
                    '@type': 'PriceSpecification',
                    minPrice: '700',
                    priceCurrency: 'EGP',
                  },
                  availability: 'https://schema.org/InStock',
                  availableDeliveryMethod: 'https://schema.org/OnSitePickup',
                },
              },
              {
                '@type': 'MedicalService',
                name: 'Physiotherapy',
                description: 'Home-based physical therapy',
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'EGP',
                  priceSpecification: {
                    '@type': 'PriceSpecification',
                    minPrice: '600',
                    priceCurrency: 'EGP',
                  },
                  availability: 'https://schema.org/InStock',
                  availableDeliveryMethod: 'https://schema.org/OnSitePickup',
                },
              },
              {
                '@type': 'MedicalService',
                name: 'Lab Tests at Home',
                description: 'In-home laboratory testing services',
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'EGP',
                  priceSpecification: {
                    '@type': 'PriceSpecification',
                    minPrice: '150',
                    priceCurrency: 'EGP',
                  },
                  availability: 'https://schema.org/InStock',
                  availableDeliveryMethod: 'https://schema.org/OnSitePickup',
                },
              },
              {
                '@type': 'MedicalService',
                name: 'Telemedicine',
                description: 'Remote medical consultations',
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'EGP',
                  priceSpecification: {
                    '@type': 'PriceSpecification',
                    minPrice: '200',
                    priceCurrency: 'EGP',
                  },
                  availability: 'https://schema.org/InStock',
                  availableDeliveryMethod: 'https://schema.org/OnSitePickup',
                },
              },
            ],
            
            // Key Features
            knowsAbout: [
              'Home Healthcare',
              'Telemedicine',
              'Elderly Care',
              'Chronic Disease Management',
              'Doctor Home Visits',
              'Home Nursing',
              'Physiotherapy',
              'Palliative Care',
              'Remote Patient Monitoring',
              '24/7 Medical Support',
            ],
            
            // Trust & Credibility
            priceRange: '$$',
            
            // Keywords for AI
            keywords: 'home healthcare Egypt, doctor home visit, telemedicine Egypt, nursing at home, physiotherapy home, elderly care Cairo, chronic disease management, remote monitoring',
          })}
        </Script>

        {/* FAQPage Schema for AI Discovery */}
        <Script id="faq-schema" type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is Anees Health?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Anees Health is Egypts leading home healthcare and telemedicine platform providing doctor home visits, nursing, physiotherapy, and 24/7 medical support.',
                },
              },
              {
                '@type': 'Question',
                name: 'Does Anees operate 24/7?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes, Anees Health provides 24/7 medical support and services across Cairo, Giza, and Alexandria.',
                },
              },
              {
                '@type': 'Question',
                name: 'What services does Anees offer?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Services include doctor home visits, home nursing, physiotherapy, lab tests at home, telemedicine, remote monitoring, and medication management.',
                },
              },
              {
                '@type': 'Question',
                name: 'Where does Anees operate?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Anees Health serves Cairo, Giza, and Alexandria with comprehensive home healthcare services.',
                },
              },
            ],
          })}
        </Script>

        {/* LocalBusiness Schema for Cairo - GEO Targeting */}
        <Script id="local-cairo-schema" type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            '@id': 'https://aneeshealth.com/#local-cairo',
            name: 'Anees Health Cairo',
            description: 'Home healthcare and telemedicine services in Cairo',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Cairo',
              addressRegion: 'Cairo',
              addressCountry: 'EG',
            },
            telephone: '+20-1270558620',
            email: 'cairo@aneeshealth.com',
            url: 'https://aneeshealth.com/cairo',
            areaServed: {
              '@type': 'City',
              name: 'Cairo',
            },
            openingHoursSpecification: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              opens: '00:00',
              closes: '23:59',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.8',
              reviewCount: '145',
            },
            priceRange: '$$',
            parentOrganization: { '@id': 'https://aneeshealth.com/#organization' },
          })}
        </Script>

        {/* LocalBusiness Schema for Giza - GEO Targeting */}
        <Script id="local-giza-schema" type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            '@id': 'https://aneeshealth.com/#local-giza',
            name: 'Anees Health Giza',
            description: 'Home healthcare and telemedicine services in Giza',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Giza',
              addressRegion: 'Giza',
              addressCountry: 'EG',
            },
            telephone: '+20-1270558620',
            email: 'giza@aneeshealth.com',
            url: 'https://aneeshealth.com/giza',
            areaServed: {
              '@type': 'City',
              name: 'Giza',
            },
            openingHoursSpecification: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              opens: '00:00',
              closes: '23:59',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.7',
              reviewCount: '89',
            },
            priceRange: '$$',
            parentOrganization: { '@id': 'https://aneeshealth.com/#organization' },
          })}
        </Script>

        {/* Aggregate Review/Rating Schema - Visible in Search Results */}
        <Script id="review-schema" type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AggregateRating',
            '@id': 'https://aneeshealth.com/#review',
            ratingValue: '4.9',
            ratingCount: '287',
            reviewCount: '287',
            worstRating: 3.5,
            bestRating: 5,
            name: 'Anees Health Reviews',
          })}
        </Script>

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
      </body>
    </html>
  );
}
