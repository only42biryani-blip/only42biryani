import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', weight: ['600', '800'] });

export const viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
};

const TITLE = 'Only42Biryani | Best Hyderabad Chicken Dum Biryani';
const DESCRIPTION =
  'Hyderabadi chicken dum biryani cooked in one fresh batch of 42 plates a day, then the kitchen stops. Order or pre-book online for delivery in Hyderabad.';
const OG_IMAGE = {
  url: '/images/chicken-dum-biryani-hero.jpg',
  width: 1600,
  height: 893,
  alt: 'Hyderabadi chicken dum biryani on a silver plate beside a copper handi',
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | Only42Biryani' },
  description: DESCRIPTION,
  applicationName: 'Only42Biryani',
  keywords: [
    'Hyderabad biryani',
    'best biryani in Hyderabad',
    'chicken dum biryani Hyderabad',
    'Hyderabadi dum biryani',
    'small batch biryani',
    'chicken biryani online order Hyderabad',
    'biryani on Zomato Hyderabad',
    'fresh dum biryani Hyderabad',
    'Only42Biryani',
  ],
  authors: [{ name: 'Only42Biryani' }],
  creator: 'Only42Biryani',
  publisher: 'Only42Biryani',
  category: 'food',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    siteName: 'Only42Biryani',
    locale: 'en_IN',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
  },
  verification: { google: 'rHu8SMpuE7KQ3PP64-ChAK0vCvWx6NfLygZrsAUpQA8' },
  other: { 'geo.region': 'IN-TG', 'geo.placename': 'Hyderabad' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-inter antialiased">{children}</body>
    </html>
  );
}
