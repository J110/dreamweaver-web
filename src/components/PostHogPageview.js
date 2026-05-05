'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';

export default function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString();
    const url = pathname + (search ? `?${search}` : '');
    if (posthog) {
      posthog.capture('$pageview', {
        $current_url:
          typeof window !== 'undefined' ? window.location.origin + url : url,
      });
    }
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: url,
        page_location: window.location.href,
      });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}
