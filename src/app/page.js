import { headers } from 'next/headers';
import HomeGridServer from '@/components/home/HomeGridServer';
import HomeRouterClient from '@/components/home/HomeRouterClient';

// Native app cold-loads always carry ?source=app (kAppUrl) and the DreamValleyApp
// UA token — both server-readable, unlike the localStorage onboarding state. SSR
// the grid only for those, behind SSR_HOME. Flag off (or a web visitor) → the
// verbatim previous client router = known-good rollback path.
const isNativeUA = (ua) => /DreamValleyApp\/[\d.]+/i.test(ua || '');

export default function Page({ searchParams }) {
  if (process.env.SSR_HOME === 'true') {
    const ua = headers().get('user-agent') || '';
    const sourceApp = searchParams?.source === 'app';
    if (isNativeUA(ua) || sourceApp) {
      return <HomeGridServer />;
    }
  }
  return <HomeRouterClient />;
}
