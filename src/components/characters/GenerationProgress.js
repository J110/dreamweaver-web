'use client';

import { useEffect, useRef } from 'react';
import { characterApi } from '@/utils/api';

export default function GenerationProgress({ job, onCompleted, onFailed, label }) {
  const failures = useRef(0);

  useEffect(() => {
    let active = true;
    let terminal = false;
    let interval;
    failures.current = 0;
    const poll = async () => {
      try {
        const current = await characterApi.generation(job.id);
        if (!active || terminal) return;
        failures.current = 0;
        if (current.status === 'completed') {
          terminal = true;
          clearInterval(interval);
          await onCompleted(current);
        }
        if (current.status === 'failed') {
          terminal = true;
          clearInterval(interval);
          onFailed(current);
        }
      } catch {
        failures.current += 1;
        if (active && failures.current >= 3) {
          terminal = true;
          clearInterval(interval);
          onFailed({ id: job.id, status: 'failed', error_code: 'polling_failed' });
        }
      }
    };
    const startPolling = () => {
      if (terminal || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
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

  return <section className="characterProgress" aria-live="polite"><p>{label}</p></section>;
}
