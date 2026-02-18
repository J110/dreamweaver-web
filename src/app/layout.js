import { Quicksand } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata = {
  metadataBase: new URL('https://dreamvalley.app'),
  title: 'Dream Valley - Magical Bedtime Stories for Kids',
  description: 'Personalized AI-generated bedtime stories, poems, and songs for children.',
  keywords: 'bedtime stories, children stories, AI stories, dream stories, lullabies, dream valley',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dream Valley',
  },
  openGraph: {
    title: 'Dream Valley - Magical Bedtime Stories',
    description: 'Personalized AI-generated bedtime stories, poems, and songs for children.',
    type: 'website',
    siteName: 'Dream Valley',
    url: 'https://dreamvalley.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dream Valley - Magical Bedtime Stories for Kids',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dream Valley - Magical Bedtime Stories',
    description: 'Personalized AI-generated bedtime stories, poems, and songs for children.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={quicksand.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
