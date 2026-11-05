export default function manifest() {
  return {
    name: 'Only42Biryani',
    short_name: 'Only42Biryani',
    description: 'Hyderabadi chicken dum biryani, one fresh batch of 42 plates a day.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080808',
    theme_color: '#111111',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
