'use client';

import { useEffect } from 'react';
import { characterApi } from '@/utils/api';

export default function GenerationProgress({ job, onCompleted, onFailed, onTransportError, label }) {
  useEffect(() => {
    let active = true;
    let terminal = false;
    let inFlight = false;
    let timeout;
    let failures = 0;

    const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const clearScheduledPoll = () => clearTimeout(timeout);
    const schedulePoll = () => {
      clearScheduledPoll();
      if (!active || terminal || isHidden()) return;
      timeout = setTimeout(poll, 2000);
    };

    const poll = async () => {
      if (!active || terminal || inFlight || isHidden()) return;
      inFlight = true;
      try {
        const current = await characterApi.generation(job.id);
        if (!active || terminal) return;
        failures = 0;
        if (current.status === 'completed') {
          terminal = true;
          await onCompleted(current);
        } else if (current.status === 'failed') {
          terminal = true;
          onFailed(current);
        }
      } catch {
        if (!active || terminal) return;
        failures += 1;
        if (failures >= 3) {
          terminal = true;
          onTransportError({ id: job.id, status: 'connection_error' });
        }
      } finally {
        inFlight = false;
        if (active && !terminal && !isHidden()) schedulePoll();
      }
    };
    const handleVisibility = () => {
      clearScheduledPoll();
      if (!isHidden()) poll();
    };
    poll();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      clearScheduledPoll();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [job.id, onCompleted, onFailed, onTransportError]);

  return <section className="characterProgress" aria-live="polite"><p>{label}</p></section>;
}
