export default function manifest() {
  return {
    name: 'Dream Valley - Magical Bedtime Stories for Kids',
    short_name: 'Dream Valley',
    description: 'Magical bedtime stories, poems, and lullabies for kids — with soothing AI narration and ambient music.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D001A',
    theme_color: '#6B4CE6',
    orientation: 'portrait',
    categories: ['education', 'kids', 'entertainment'],
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
    ],
  };
}
