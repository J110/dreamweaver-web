const callPosthog = (fn) => {
  if (typeof window === 'undefined') return;
  import('posthog-js')
    .then(({ default: posthog }) => {
      try {
        fn(posthog);
      } catch {
        /* ignore */
      }
    })
    .catch(() => {
      /* ignore */
    });
};

/**
 * SHA-256 of lowercased email, first 16 hex chars.
 * Used as a non-leaky distinct_id for PostHog auth events fired before
 * the user is verified (no Person profile created since the project is
 * configured with person_profiles=identified_only).
 */
export async function emailHash(email) {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return '';
  try {
    const buf = new TextEncoder().encode(String(email || '').toLowerCase());
    const digest = await window.crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  } catch {
    return '';
  }
}

/**
 * Phase 0 step 1.5: magic-link signin entry point.
 *
 * @param {string} email
 * @param {('signup_new'|'login_existing')} context
 * @param {('en'|'hi')} lang
 * @returns {Promise<{initiator_session_id: string, status: string}>}
 *
 * Caller should stash the returned initiator_session_id in sessionStorage
 * (NOT localStorage — must clear on tab close) and start polling
 * /auth/poll until status='ready'.
 *
 * No offline fallback — if the backend is unreachable, this throws and
 * the caller surfaces the error to the user. We do NOT mint fake local
 * sessions any more (Phase 2 deleted that path; it was a real-world
 * source of "logged in" users who never actually existed on the backend).
 */
export async function signin(email, context = 'login_existing', lang = 'en') {
  // Lazy import to avoid SSR pulling api.js eagerly.
  const { authApi } = await import('./api');
  const res = await authApi.requestLink(email, lang, context);
  callPosthog(async (posthog) => {
    const hash = await emailHash(email);
    try {
      posthog.capture('auth_request_link', {
        email_hash: hash,
        lang,
        context,
      });
    } catch { /* ignore */ }
  });
  return res;
}

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dreamweaver_token');
};

export const setToken = (token) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dreamweaver_token', token);
};

export const removeToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dreamweaver_token');
};

export const getUser = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('dreamweaver_user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dreamweaver_user', JSON.stringify(user));

  const username = user?.username;
  const familyId = user?.family_id;
  if (!username) return;

  callPosthog((posthog) => {
    if (familyId) {
      // First login post-1.2 deploy: alias the prior identity (anonymous
      // distinct_id or the username from commit 1.1) onto family_id, then
      // switch to family_id as the canonical distinct_id. Skip the alias
      // call on subsequent logins for the same user on this device.
      const aliasFlag = `dv_alias_done:${username}`;
      if (!localStorage.getItem(aliasFlag)) {
        try { posthog.alias(familyId); } catch { /* ignore */ }
        localStorage.setItem(aliasFlag, '1');
      }
      posthog.identify(familyId, {
        $set: { username },
        $set_once: { first_seen_at: new Date().toISOString() },
      });
    } else {
      // Backend hasn't shipped family_id yet — fall back to commit 1.1 behavior.
      posthog.identify(username, {
        $set: { username },
        $set_once: { first_seen_at: new Date().toISOString() },
      });
    }
  });
};

export const removeUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dreamweaver_user');
};

export const getStoredFamilyId = () => {
  if (typeof window === 'undefined') return null;
  try { return (JSON.parse(localStorage.getItem('dreamweaver_user') || 'null') || {}).family_id || null; }
  catch { return null; }
};

export const isLoggedIn = () => {
  return !!getToken();
};

export const logout = () => {
  // Read username before clearing so we can clean its alias flag.
  const u = getUser();
  if (u?.username) {
    localStorage.removeItem(`dv_alias_done:${u.username}`);
  }
  // Server-side revoke (best-effort, fire-and-forget). The api.js wrapper
  // catches errors so a failed revoke never blocks client-side logout.
  // Lazy-imported to avoid an api.js eager-load on every auth.js touch.
  import('./api')
    .then(({ authApi }) => authApi.serverLogout())
    .catch(() => { /* ignore */ });
  removeToken();
  removeUser();
  // Clear magic-link polling state so a post-logout /login or /auth/claim
  // mount doesn't auto-resume on stale initiator_session_id values.
  // Without this, sessionStorage survives the logout and the next /login
  // mount jumps directly into 'check_email' stage polling a dead session.
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('dv_login_session_id');
      sessionStorage.removeItem('dv_claim_session_id');
    } catch { /* ignore */ }
  }
  callPosthog((posthog) => {
    try { posthog.capture('auth_logout', {}); } catch { /* ignore */ }
    posthog.reset();
  });
};
