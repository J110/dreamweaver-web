'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getToken, getStoredFamilyId, setToken } from '@/utils/auth';
import { authApi } from '@/utils/api';

// Silent recovery router (replaces the scrapped magic-link page). No UI:
// already-authed → home; a renewable stored session → renew → home;
// otherwise → onboarding (fresh device account). Premium recovery on a new
// device routes here too until Step 5 ships /restore.
export default function LoginRouter() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isLoggedIn()) { router.replace('/'); return; }
      const familyId = getStoredFamilyId();
      const token = getToken();
      if (familyId && token) {
        try {
          const r = await authApi.renew(token, familyId);
          if (!cancelled && r && r.token) { setToken(r.token); router.replace('/'); return; }
        } catch { /* 410 dormant or transient → fall through to onboarding */ }
      }
      if (!cancelled) router.replace('/onboarding');
    })();
    return () => { cancelled = true; };
  }, [router]);

  return null; // no UI — pure router
}
