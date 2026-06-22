import { notFound } from 'next/navigation';
import { isNativeRequest } from '@/utils/serverNative';
import PricingClient from './PricingClient';

/**
 * Server gate (compliance). A native request renders NOTHING here — the
 * pricing UI (prices, plans, checkout) is never produced, so it's absent
 * from the HTML, not hidden. Middleware also redirects native away from
 * this route; this is the in-render backstop.
 */
export default function PricingPage({ searchParams }) {
  if (isNativeRequest(searchParams)) notFound();
  return <PricingClient />;
}
