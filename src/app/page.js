import HomeGridServer from '@/components/home/HomeGridServer';
import HomeRouterClient from '@/components/home/HomeRouterClient';
import { isNativeRequest } from '@/utils/serverNative';

// force-dynamic so the SSR_HOME gate runs per-request. Without it, a build with
// SSR_HOME unset freezes `/` as static HTML and a runtime flip would be a no-op —
// breaking the no-rebuild toggle. Flag-off output is unchanged (same client shell).
export const dynamic = 'force-dynamic';

export default function Page({ searchParams }) {
  // ONE native signal (DreamValleyApp UA + ?source=app) via the single
  // nativeUA.js source behind serverNative.isNativeRequest() — used for BOTH the
  // SSR_HOME grid decision AND the web purchase-surface gate. No parallel
  // native-detection path. Native cold-loads carry both signals server-side.
  const nativeRequest = isNativeRequest(searchParams);

  // SSR the grid only for native, behind SSR_HOME. Flag off (or a web visitor)
  // → the verbatim client router = known-good rollback path.
  if (process.env.SSR_HOME === 'true' && nativeRequest) {
    return <HomeGridServer />;
  }

  // nativeRequest threads into LandingPage so the web Premium entry is ABSENT
  // from a native request's HTML (purchase surface hidden from the app).
  return <HomeRouterClient nativeRequest={nativeRequest} />;
}
