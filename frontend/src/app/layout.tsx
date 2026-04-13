// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

export const metadata = {
  title: 'Hosting Nepal - Best Web Hosting, Domain Registration & VPS in Nepal 2025',
  description: 'Nepal\'s #1 web hosting platform. WordPress hosting from NPR 299/mo, VPS from NPR 1,500/mo, domain registration from NPR 1,200/yr. Free SSL, LiteSpeed, NVMe SSD, CyberPanel. Pay via Khalti, eSewa & bank transfer. 24/7 Nepal support.',
  keywords: 'web hosting nepal, domain registration nepal, VPS hosting nepal, dedicated server nepal, wordpress hosting nepal, hosting nepal, cheap hosting nepal, buy domain nepal, .np domain, nepal hosting provider, best hosting nepal 2025, eSewa hosting, Khalti hosting',
  authors: [{ name: 'Hosting Nepal', url: 'https://hostingnepals.com' }],
  creator: 'Marketminds Investment Group',
  publisher: 'Hosting Nepal',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 } },
  alternates: { canonical: 'https://hostingnepals.com' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hostingnepals.com',
    siteName: 'Hosting Nepal',
    title: 'Hosting Nepal - Best Web Hosting & Domain Registration in Nepal',
    description: 'Domain, WordPress, VPS & Dedicated Server hosting in Nepal with NPR pricing, Khalti/eSewa payment, free SSL, LiteSpeed, and 24/7 Nepal-based support.',
    countryName: 'Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hosting Nepal - Best Web Hosting in Nepal 2025',
    description: 'WordPress hosting from NPR 299/mo, VPS from NPR 1,500/mo. Free SSL, NVMe SSD. Pay via Khalti & eSewa. 24/7 Nepal support.',
  },
  verification: { google: '', yandex: '' },
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props

  // Type guard to ensure lang is a valid Locale

  // Vars

  const systemMode = await getSystemMode()
  const direction = 'ltr'

  return (
    <html id='__next' lang='en' dir={direction} suppressHydrationWarning>
      <head>
        {/* Organization + LocalBusiness Schema (SEO + AIO + GEO) */}
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': ['Organization', 'LocalBusiness'],
          '@id': 'https://hostingnepals.com/#organization',
          name: 'Hosting Nepal',
          legalName: 'Marketminds Investment Group',
          url: 'https://hostingnepals.com',
          logo: 'https://hostingnepals.com/logo.png',
          image: 'https://hostingnepals.com/logo.png',
          description: 'Nepal\'s premier automated web hosting company providing domain registration, WordPress hosting, VPS, VDS, and Dedicated Servers with NPR pricing and local payment support.',
          address: { '@type': 'PostalAddress', streetAddress: 'Near Rastriya Banijya Bank, Koteshwor-32', addressLocality: 'Kathmandu', addressRegion: 'Bagmati', postalCode: '44600', addressCountry: 'NP' },
          geo: { '@type': 'GeoCoordinates', latitude: '27.6783', longitude: '85.3492' },
          telephone: '+977-9802348957',
          email: 'admin@hostingnepals.com',
          contactPoint: [
            { '@type': 'ContactPoint', contactType: 'sales', telephone: '+977-9802348957', email: 'admin@hostingnepals.com', availableLanguage: ['English', 'Nepali'], areaServed: 'NP' },
            { '@type': 'ContactPoint', contactType: 'technical support', telephone: '+977-9709066745', email: 'admin@hostingnepals.com', availableLanguage: ['English', 'Nepali'], contactOption: 'TollFree', areaServed: 'NP' },
          ],
          sameAs: [],
          areaServed: { '@type': 'Country', name: 'Nepal', '@id': 'https://www.wikidata.org/wiki/Q837' },
          serviceArea: { '@type': 'GeoCircle', geoMidpoint: { '@type': 'GeoCoordinates', latitude: '27.7172', longitude: '85.3240' }, geoRadius: '500000' },
          foundingDate: '2023',
          foundingLocation: { '@type': 'Place', name: 'Kathmandu, Nepal' },
          founder: { '@type': 'Organization', name: 'Marketminds Investment Group' },
          paymentAccepted: 'Khalti, eSewa, Bank Transfer, Credit Card, Debit Card',
          currenciesAccepted: 'NPR',
          priceRange: 'NPR 299 - NPR 50,000',
          openingHours: 'Mo-Fr 10:00-18:00',
          hasOfferCatalog: {
            '@type': 'OfferCatalog', name: 'Web Hosting Services', itemListElement: [
              { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'WordPress Hosting', description: 'Managed WordPress hosting with LiteSpeed and CyberPanel' }, priceCurrency: 'NPR', price: '299', priceValidUntil: '2026-12-31' },
              { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'VPS Hosting', description: 'Full root access VPS with NVMe SSD and dedicated resources' }, priceCurrency: 'NPR', price: '1500', priceValidUntil: '2026-12-31' },
              { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Domain Registration', description: '.com, .np, .com.np domain registration with instant activation' }, priceCurrency: 'NPR', price: '1200', priceValidUntil: '2026-12-31' },
              { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Dedicated Server', description: 'Bare metal dedicated servers with Intel Xeon processors' }, priceCurrency: 'NPR', price: '15000', priceValidUntil: '2026-12-31' },
            ]
          },
          aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '5000', bestRating: '5' },
          knowsLanguage: ['en', 'ne'],
          slogan: 'Nepal\'s Premier Web Hosting Platform',
        }) }} />
        {/* WebSite Schema with SearchAction (AEO) */}
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Hosting Nepal',
          url: 'https://hostingnepals.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://hostingnepals.com/articles?search={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
          inLanguage: ['en', 'ne'],
        }) }} />
        {/* FAQ Schema (AEO) */}
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: 'What is the cheapest hosting in Nepal?', acceptedAnswer: { '@type': 'Answer', text: 'VPS 10 at NPR 1,066/month is the cheapest plan at Hosting Nepal, including 4 vCPU, 8 GB RAM, and 75 GB NVMe SSD. WordPress hosting starts at NPR 1,254/month.' } },
            { '@type': 'Question', name: 'Does Hosting Nepal accept Khalti and eSewa?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Hosting Nepal accepts Khalti, eSewa, and bank transfers. All prices are in NPR with zero currency conversion fees.' } },
            { '@type': 'Question', name: 'Does Hosting Nepal provide free SSL?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Every hosting plan includes a free Let\'s Encrypt SSL certificate that is automatically installed and renewed through CyberPanel.' } },
            { '@type': 'Question', name: 'Where are Hosting Nepal servers located?', acceptedAnswer: { '@type': 'Answer', text: 'Hosting Nepal infrastructure is powered by Contabo data centers in Germany, USA, UK, Japan, Singapore, and Australia.' } },
            { '@type': 'Question', name: 'What is the uptime guarantee?', acceptedAnswer: { '@type': 'Answer', text: 'All hosting services are backed by a 99.9% uptime SLA with enterprise-grade infrastructure.' } },
          ],
        }) }} />
        {/* GEO targeting */}
        <meta name='geo.region' content='NP' />
        <meta name='geo.placename' content='Kathmandu' />
        <meta name='geo.position' content='27.7172;85.3240' />
        <meta name='ICBM' content='27.7172, 85.3240' />
        <meta name='content-language' content='en' />
        <link rel='alternate' hrefLang='en' href='https://hostingnepals.com' />
        <link rel='alternate' hrefLang='ne' href='https://hostingnepals.com' />
        <link rel='alternate' hrefLang='x-default' href='https://hostingnepals.com' />
      </head>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
