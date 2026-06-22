import { notFound } from 'next/navigation';
import { isNativeRequest } from '@/utils/serverNative';
import UpgradeClient from './UpgradeClient';

/**
 * Server gate (compliance). A native request renders NOTHING here — the
 * upgrade UI (price disclosure, checkout CTA, and the old "subscribe at
 * dreamvalley.app" copy) is never produced, so it's absent from the HTML.
 * Middleware also redirects native away from this route.
 */
export default function UpgradePage({ searchParams }) {
  if (isNativeRequest(searchParams)) notFound();
  return <UpgradeClient />;
}
