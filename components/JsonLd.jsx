import { SITE_URL, ZOMATO_URL, SWIGGY_URL, INSTAGRAM_PROFILE_URL, PHONE, AREA, PLATE, LEGAL_NAME } from '@/lib/config';
import { getFaqItems } from '@/lib/faq';

const DESCRIPTION =
  'Only42Biryani serves Hyderabadi chicken dum biryani in a single fresh batch of 42 plates a day, then the kitchen stops.';

// Structured data for search and answer engines. Only facts we actually know are
// included; phone, area and price appear automatically once they are set in lib/config.js.
export default function JsonLd({ launched }) {
  const businessId = `${SITE_URL}/#business`;
  const images = [
    `${SITE_URL}/images/biryani-box-and-bag-2.jpg`,
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
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: 'Only42Biryani | Best Hyderabad Chicken Dum Biryani',
      description: DESCRIPTION,
      inLanguage: 'en-IN',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': businessId },
      primaryImageOfPage: { '@type': 'ImageObject', url: images[0] },
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '#faq'] },
    },
    {
      '@type': 'VideoObject',
      '@id': `${SITE_URL}/#video-reel`,
      name: 'Only42Biryani: quality breaks at 43',
      description: 'Why Only42Biryani cooks one fresh batch of 42 plates of chicken dum biryani a day in Hyderabad, then stops.',
      thumbnailUrl: `${SITE_URL}/video/only42-ad-poster.jpg`,
      contentUrl: `${SITE_URL}/video/only42-ad.mp4`,
      uploadDate: '2026-11-06',
      duration: 'PT20S',
      inLanguage: 'en-IN',
      publisher: { '@id': businessId },
    },
    {
      '@type': 'VideoObject',
      '@id': `${SITE_URL}/#video-pack`,
      name: 'Only42Biryani takeaway box, paper bag and raita',
      description: 'The Only42Biryani sugarcane bagasse takeaway box and paper bag, packed with chicken dum biryani and raita.',
      thumbnailUrl: `${SITE_URL}/video/only42-pack-poster.jpg`,
      contentUrl: `${SITE_URL}/video/only42-pack.mp4`,
      uploadDate: '2026-11-06',
      duration: 'PT10S',
      inLanguage: 'en-IN',
      publisher: { '@id': businessId },
    },
    {
      '@type': 'Restaurant',
      '@id': businessId,
      name: 'Only42Biryani',
      url: `${SITE_URL}/`,
      description: DESCRIPTION,
      slogan: 'Only 42 plates a day.',
      ...(LEGAL_NAME ? { legalName: LEGAL_NAME } : {}),
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
