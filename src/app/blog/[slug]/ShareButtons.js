'use client';

import { useState, useCallback } from 'react';
import { dvAnalytics } from '@/utils/analytics';
import styles from './ShareButtons.module.css';

export default function ShareButtons({ slug, title }) {
  const [copied, setCopied] = useState(false);
  const url = `https://dreamvalley.app/blog/${slug}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      dvAnalytics.track('share', { postSlug: slug, shareMethod: 'clipboard' });
    } catch {}
  }, [url, slug]);

  const handleTwitter = useCallback(() => {
    const text = encodeURIComponent(`${title}\n${url}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    dvAnalytics.track('share', { postSlug: slug, shareMethod: 'twitter' });
  }, [title, url, slug]);

  const handleFacebook = useCallback(() => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank'
    );
    dvAnalytics.track('share', { postSlug: slug, shareMethod: 'facebook' });
  }, [url, slug]);

  return (
    <div className={styles.share}>
      <button onClick={handleCopyLink} className={styles.shareBtn} title="Copy link">
        {copied ? (
          <span className={styles.copiedText}>Copied!</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>
      <button onClick={handleTwitter} className={styles.shareBtn} title="Share on X">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>
      <button onClick={handleFacebook} className={styles.shareBtn} title="Share on Facebook">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>
    </div>
  );
}
