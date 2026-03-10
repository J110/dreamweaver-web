'use client';

import { useState, useCallback } from 'react';
import { dvAnalytics } from '@/utils/analytics';
import styles from './LikeButton.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function LikeButton({ slug, initialLikes = 0 }) {
  const storageKey = `blog_liked_${slug}`;
  const [liked, setLiked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(storageKey) === '1';
  });
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const action = liked ? 'unlike' : 'like';
    try {
      const res = await fetch(`${API_URL}/api/v1/blog/posts/${slug}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        setLiked(!liked);
        if (!liked) {
          sessionStorage.setItem(storageKey, '1');
          dvAnalytics.track('blog_like', { postSlug: slug });
        } else {
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch {}
    setLoading(false);
  }, [slug, liked, loading, storageKey]);

  return (
    <button
      onClick={handleClick}
      className={`${styles.likeBtn} ${liked ? styles.liked : ''}`}
      disabled={loading}
      aria-label={liked ? 'Unlike this post' : 'Like this post'}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span>{likes}</span>
    </button>
  );
}
