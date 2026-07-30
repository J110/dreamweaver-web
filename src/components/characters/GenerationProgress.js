'use client';

import { useEffect } from 'react';
import { characterApi } from '@/utils/api';

export default function GenerationProgress({ job, onCompleted, onFailed, label }) {
  useEffect(() => {
    let active = true;
    let interval;
    const poll = async () => {
      try {
        const current = await characterApi.generation(job.id);
        if (!active) return;
        if (current.status === 'completed') onCompleted(current);
        if (current.status === 'failed') onFailed(current);
      } catch {}
    };
    const startPolling = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      poll();
      interval = setInterval(poll, 2000);
    };
    const handleVisibility = () => {
      clearInterval(interval);
      startPolling();
    };
    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [job.id, onCompleted, onFailed]);

  return <section aria-live="polite"><p>{label}</p></section>;
}
