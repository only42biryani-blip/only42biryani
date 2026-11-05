import { Inter, Space_Grotesk } from 'next/font/google';
import SmoothScroll from '@/components/SmoothScroll';
import './globals.css';
import { ZOMATO_URL, SWIGGY_URL, INSTAGRAM_PROFILE_URL, PHONE, AREA } from '@/lib/config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', weight: ['500', '700'] });

export const viewport = {
  themeColor: '#111111',
};

export const metadata = {
  title: 'Only42Biryani | Best Hyderabad Chicken Dum Biryani',
  description: 'Experience authentic Hyderabad chicken dum biryani crafted in small batches. Only 42 premium plates available daily.',
  keywords: 'Hyderabad Biryani, Best Biryani in Hyderabad, Chicken Dum Biryani Hyderabad, Premium Biryani Hyderabad, Only42Biryani',
  authors: [{ name: 'Only42Biryani' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    url: 'https://only42biryani.com/',
    title: 'Only42Biryani | Best Hyderabad Chicken Dum Biryani',
    description: 'Experience authentic Hyderabad chicken dum biryani crafted in small batches. Only 42 premium plates available daily. Join the waitlist.',
    images: [{ url: 'https://only42biryani.com/images/chicken-dum-biryani-hero.jpg', width: 1600, height: 893 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Only42Biryani | Best Hyderabad Chicken Dum Biryani',
    description: 'Experience authentic Hyderabad chicken dum biryani crafted in small batches. Only 42 premium plates available daily. Join the waitlist.',
    images: ['https://only42biryani.com/images/chicken-dum-biryani-hero.jpg'],
  },
  verification: { google: 'rHu8SMpuE7KQ3PP64-ChAK0vCvWx6NfLygZrsAUpQA8' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FoodEstablishment',
  name: 'Only42Biryani',
  image: 'https://only42biryani.com/images/chicken-dum-biryani-hero.jpg',
  url: 'https://only42biryani.com/',
  servesCuisine: 'Hyderabadi Biryani',
  priceRange: '₹₹',
  description: 'Only42Biryani serves authentic Hyderabad chicken dum biryani, cooked in small batches of just 42 plates a day.',
  areaServed: { '@type': 'City', name: 'Hyderabad' },
  address: {
    '@type': 'PostalAddress',
    ...(AREA ? { streetAddress: AREA } : {}),
    addressLocality: 'Hyderabad',
    addressRegion: 'Telangana',
    addressCountry: 'IN',
  },
  ...(PHONE ? { telephone: PHONE } : {}),
  sameAs: [ZOMATO_URL, SWIGGY_URL, INSTAGRAM_PROFILE_URL].filter(Boolean),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="canonical" href="https://only42biryani.com/" />
        <link rel="icon" type="image/png" href="/images/favicon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-inter antialiased">
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
