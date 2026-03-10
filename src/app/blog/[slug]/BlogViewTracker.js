'use client';

import { useEffect } from 'react';
import { dvAnalytics } from '@/utils/analytics';

export default function BlogViewTracker({ slug }) {
  useEffect(() => {
    dvAnalytics.track('blog_view', {
      postSlug: slug,
      referrer: document.referrer || 'direct',
    });
  }, [slug]);

  return null;
}
