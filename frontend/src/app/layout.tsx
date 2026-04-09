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
  title: 'Hosting Nepal - Best Web Hosting in Nepal | Domain, VPS, Dedicated Server',
  description: 'Nepal\'s #1 web hosting platform. Domain registration from NPR 2,500/yr, WordPress hosting from NPR 1,254/mo, VPS from NPR 1,066/mo, Dedicated Servers from NPR 16,956/mo. Free SSL, CyberPanel, NVMe SSD. Pay via Khalti & eSewa.',
  keywords: 'web hosting nepal, domain registration nepal, VPS nepal, dedicated server nepal, wordpress hosting nepal, hosting nepal, cheap hosting nepal, buy domain nepal',
  authors: [{ name: 'Hosting Nepal', url: 'https://hostingnepals.com' }],
  creator: 'Marketnminds Investment Group',
  publisher: 'Hosting Nepal',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 } },
  alternates: { canonical: 'https://hostingnepals.com' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hostingnepals.com',
    siteName: 'Hosting Nepal',
    title: 'Hosting Nepal - Best Web Hosting in Nepal',
    description: 'Domain, WordPress, VPS & Dedicated Server hosting with NPR pricing, Khalti/eSewa payment, free SSL, and 24/7 Nepal-based support.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hosting Nepal - Best Web Hosting in Nepal',
    description: 'Domain, WordPress, VPS & Dedicated Server hosting with NPR pricing and local payment.',
  },
  verification: { google: '', yandex: '' },
  other: {
    'geo.region': 'NP',
    'geo.placename': 'Kathmandu',
    'geo.position': '27.7172;85.3240',
    'ICBM': '27.7172, 85.3240',
    'content-language': 'en',
  },
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
        {/* Organization Schema (SEO + AIO) */}
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Hosting Nepal',
          url: 'https://hostingnepals.com',
          logo: 'https://hostingnepals.com/logo.png',
          description: 'Nepal\'s leading web hosting provider offering domain registration, WordPress hosting, VPS, VDS, and Dedicated Servers with NPR pricing.',
          address: { '@type': 'PostalAddress', addressLocality: 'Kathmandu', addressCountry: 'NP' },
          contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'support@hostingnepals.com', availableLanguage: ['English', 'Nepali'] },
          sameAs: [],
          areaServed: { '@type': 'Country', name: 'Nepal' },
          foundingLocation: { '@type': 'Place', name: 'Kathmandu, Nepal' },
          paymentAccepted: 'Khalti, eSewa, Bank Transfer',
          currenciesAccepted: 'NPR',
          priceRange: 'NPR 557 - NPR 39,899',
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
