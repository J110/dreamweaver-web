import { headers } from 'next/headers';
import HomeGridServer from '@/components/home/HomeGridServer';
import HomeRouterClient from '@/components/home/HomeRouterClient';

// force-dynamic so the SSR_HOME gate runs per-request. Without it, a build with
// SSR_HOME unset freezes `/` as static HTML and a runtime flip would be a no-op —
// breaking the no-rebuild toggle. Flag-off output is unchanged (same client shell).
export const dynamic = 'force-dynamic';

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
