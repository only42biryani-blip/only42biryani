import { SITE_URL, ZOMATO_URL, SWIGGY_URL, INSTAGRAM_PROFILE_URL, PHONE, AREA, PLATE } from '@/lib/config';
import { getFaqItems } from '@/lib/faq';

const DESCRIPTION =
  'Only42Biryani serves Hyderabadi chicken dum biryani in a single fresh batch of 42 plates a day, then the kitchen stops.';

// Structured data for search and answer engines. Only facts we actually know are
// included; phone, area and price appear automatically once they are set in lib/config.js.
export default function JsonLd({ launched }) {
  const businessId = `${SITE_URL}/#business`;
  const images = [
    `${SITE_URL}/images/biryani-box-and-bag.jpg`,
    `${SITE_URL}/images/only42-packaging.jpg`,
  ];

  const menuItem = {
    '@type': 'MenuItem',
    name: 'Chicken Dum Biryani',
    description:
      'Medium-grain rice and fresh boneless chicken breast slow-cooked in a sealed handi (dum), prepared fresh daily in a single batch of 42 plates and packed in a sugarcane bagasse box.',
    image: images[0],
    ...(PLATE.price ? { offers: { '@type': 'Offer', price: String(PLATE.price).replace(/[^\d.]/g, ''), priceCurrency: 'INR' } } : {}),
  };

  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Only42Biryani',
      inLanguage: 'en-IN',
      publisher: { '@id': businessId },
    },
    {
      '@type': 'Restaurant',
      '@id': businessId,
      name: 'Only42Biryani',
      url: `${SITE_URL}/`,
      description: DESCRIPTION,
      image: images,
      logo: `${SITE_URL}/icons/icon-512.png`,
      servesCuisine: ['Hyderabadi', 'Biryani', 'Indian'],
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
      hasMenu: {
        '@type': 'Menu',
        name: 'Menu',
        hasMenuSection: { '@type': 'MenuSection', name: 'Biryani', hasMenuItem: menuItem },
      },
      ...(launched && ZOMATO_URL
        ? {
            potentialAction: {
              '@type': 'OrderAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: ZOMATO_URL,
                actionPlatform: [
                  'http://schema.org/DesktopWebPlatform',
                  'http://schema.org/IOSPlatform',
                  'http://schema.org/AndroidPlatform',
                ],
              },
            },
          }
        : {}),
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: getFaqItems(launched).map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output only contains our own constants; "<" is escaped to be safe.
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') }}
    />
  );
}
