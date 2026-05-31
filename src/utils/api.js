import { logout as authLogout, setToken as setStoredToken, getStoredFamilyId } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dreamweaver_token');
};

// In-memory cache for GET requests — avoids re-fetching on tab switches
const _cache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _cache.delete(key);
    return null;
  }
  return entry;
}

const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const token = getAuthToken();

  // Cache GET requests (use endpoint as key)
  if (method === 'GET') {
    const cached = getCached(endpoint);
    if (cached) {
      // Return cached data immediately, revalidate in background
      if (Date.now() - cached.ts > 60_000) {
        // Stale (>1min): revalidate silently in the background
        fetchApi._revalidate(endpoint, options);
      }
      return cached.data;
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && token) {
      // Heart actions: never logout/redirect (shipped silent401 fix).
      if (options.silent401) { const e = new Error('unauthorized'); e.status = 401; throw e; }
      // The renew call itself must not recurse into renewal.
      if (options.silentRenew) { const e = new Error('renew_unauthorized'); e.status = 401; throw e; }

      // Try ONE dedup'd renewal before doing anything drastic.
      const familyId = getStoredFamilyId();
      if (familyId) {
        try {
          if (!fetchApi._renewPromise) {
            fetchApi._renewPromise = (async () => {
              const r = await authApi.renew(getAuthToken(), familyId); // throws on 410
              if (r && r.token) { setStoredToken(r.token); return r.token; }
              throw new Error('renew_no_token');
            })().finally(() => { setTimeout(() => { fetchApi._renewPromise = null; }, 0); });
          }
          await fetchApi._renewPromise;
          // Retry the original request ONCE with the fresh token (loop guard).
          if (!options._retried) {
            return fetchApi(endpoint, { ...options, _retried: true });
          }
        } catch (renewErr) {
          // ONLY an explicit 410 dormant verdict falls through to re-auth.
          // Transient (5xx / network) or renew_no_token must NOT bounce the
          // user — fail this request, keep the session, retry on the next call.
          if (renewErr?.status !== 410 && renewErr?.message !== 'dormant_reauth_required') {
            throw renewErr;
          }
          // 410 dormant → fall through to authLogout + /login below.
        }
      }

      // Unrenewable / dormant: clear and route to /login (becomes a silent
      // router in a later task — NOT a magic-link wall after that lands).
      try { authLogout(); } catch { /* ignore */ }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')
          && !window.location.pathname.startsWith('/auth/')) {
        window.location.href = '/login';
      }
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // Preserve structured FastAPI detail bodies (e.g. complete_onboarding's
      // 409 returns {detail: {code: 'username_taken', username: ...}}).
      // new Error(<object>) coerces to '[object Object]' and destroys the
      // payload — JSON.stringify keeps the substring intact for callers
      // that match on err.message.
      const detail = error.detail;
      const detailStr = typeof detail === 'string'
        ? detail
        : detail
          ? JSON.stringify(detail)
          : (error.message || `API error: ${response.status}`);
      // Attach the HTTP status so callers (e.g. the 401-renewal interceptor)
      // can distinguish a 410 dormant verdict from a transient 5xx.
      const err = new Error(detailStr);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();

    // Cache successful GET responses
    if (method === 'GET') {
      _cache.set(endpoint, { data, ts: Date.now() });
    }

    return data;
  } catch (error) {
    // On network error for GET, return stale cache if available
    if (method === 'GET') {
      const stale = _cache.get(endpoint);
      if (stale) return stale.data;
    }
    console.error('API Error:', error);
    throw error;
  }
};

// Background revalidation — updates cache without blocking UI
fetchApi._revalidate = (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch(url, { ...options, headers })
    .then((res) => res.ok ? res.json() : null)
    .then((data) => { if (data) _cache.set(endpoint, { data, ts: Date.now() }); })
    .catch(() => {});
};

// Invalidate cache for a specific endpoint or all
fetchApi.invalidate = (endpoint) => {
  if (endpoint) _cache.delete(endpoint);
  else _cache.clear();
};

// ─── Auth API ───────────────────────────────────────────────
// Phase 0 step 1.5: magic-link auth.
// Backend endpoints: /api/v1/auth/request_link, /verify_link, /poll,
// /logout, /claim_existing. Old /auth/signup and /auth/login return
// 410 Gone — their wrappers below are removed.

export const authApi = {
  /**
   * Request a magic-link email.
   * @param {string} email
   * @param {('en'|'hi')} lang
   * @param {('signup_new'|'login_existing')} context
   * @returns {Promise<{initiator_session_id: string, status: string}>}
   */
  requestLink: async (email, lang, context) => {
    return await fetchApi('/api/v1/auth/request_link', {
      method: 'POST',
      body: JSON.stringify({ email, lang, context }),
    });
  },

  /**
   * Consume a magic-link code (clicker device — does NOT receive token).
   * @param {string} code
   * @returns {Promise<{status: string, context: string}>}
   */
  verifyLink: async (code) => {
    return await fetchApi('/api/v1/auth/verify_link', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  /**
   * Initiator polls for token claim. Bypasses fetchApi cache.
   * @param {string} sessionId
   * @returns {Promise<{status: string, token?: string, uid?: string, username?: string, family_id?: string, email_verified?: boolean, context?: string}>}
   */
  pollSession: async (sessionId) => {
    const url = `${API_URL}/api/v1/auth/poll?session_id=${encodeURIComponent(sessionId)}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return { status: 'expired' };
    return await r.json();
  },

  /**
   * Revoke the current bearer token server-side.
   * Caller still needs to clear localStorage — see auth.js logout().
   */
  serverLogout: async () => {
    try {
      await fetchApi('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      /* best-effort; client-side clear happens regardless */
    }
  },

  /**
   * Username-only login. Mints a session token for an existing user.
   * Returns 404 if the username isn't found — caller should fall back
   * to anon onboarding (new-user flow) on that error.
   * @param {string} username
   * @param {{child_age?: number, lang?: 'en'|'hi'}} opts
   * @returns {Promise<{token: string, user: object}>}
   */
  loginByUsername: async (username, opts = {}) => {
    return await fetchApi('/api/v1/auth/login_username', {
      method: 'POST',
      body: JSON.stringify({
        username,
        ...(opts.child_age != null ? { child_age: opts.child_age } : {}),
        ...(opts.lang ? { lang: opts.lang } : {}),
      }),
    });
  },

  /**
   * Auth-required. Send claim_existing magic-link to attach this email
   * to the current user's record (used during the migration window).
   */
  claimExisting: async (email, lang) => {
    return await fetchApi('/api/v1/auth/claim_existing', {
      method: 'POST',
      body: JSON.stringify({ email, lang }),
    });
  },

  deviceAccount: async (username, opts = {}) => {
    const res = await fetchApi('/api/v1/auth/device_account', {
      method: 'POST',
      body: JSON.stringify({ username, child_age: opts.child_age ?? null, lang: opts.lang || 'en' }),
    });
    return res; // { token, user }
  },

  renew: async (token, familyId) => {
    // silentRenew so a failing renew never recurses into the 401 interceptor.
    const res = await fetchApi('/api/v1/auth/renew', {
      method: 'POST',
      silentRenew: true,
      body: JSON.stringify({ token, family_id: familyId }),
    });
    return res; // { token }
  },

  logout: async () => {
    // Client-side only logout (no backend endpoint).
    // Delegates to auth.logout() so identity teardown (posthog.reset, etc.)
    // runs through a single choke point.
    authLogout();
    return { success: true };
  },

  getCurrentUser: async () => {
    // Backend: /api/v1/users/me
    const res = await fetchApi('/api/v1/users/me', {
      method: 'GET',
    });
    return res.data || {};
  },
};

// ─── Content API ────────────────────────────────────────────
// Backend: /api/v1/content (list), /api/v1/content/{id} (detail), /api/v1/content/categories

export const contentApi = {
  getContent: async (filters = {}) => {
    const params = new URLSearchParams();
    // Backend uses content_type (not type) and category (not theme)
    if (filters.type) params.append('content_type', filters.type);
    if (filters.theme) params.append('category', filters.theme);
    if (filters.lang) params.append('lang', filters.lang);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('page_size', filters.limit);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchApi(`/api/v1/content${query}`, {
      method: 'GET',
    });
    // Transform: pages expect { content: [...] }
    return { content: res.data?.items || [] };
  },

  getContentById: async (id) => {
    const res = await fetchApi(`/api/v1/content/${id}`, {
      method: 'GET',
    });
    // Return content data directly (pages access fields like .title, .content, etc.)
    return res.data || {};
  },

  generateContent: async (params) => {
    const res = await fetchApi('/api/v1/generate', {
      method: 'POST',
      body: JSON.stringify({
        content_type: params.type,
        theme: params.theme,
        length: (params.length || 'medium').toUpperCase(),
        include_poems: params.includePoems || false,
        include_songs: params.includeSongs || false,
        voice_id: params.voice || null,
        child_age: params.childAge,
      }),
    });
    // Generation returns { content_id, title, description, status }
    // Pages need an object with id, title, content fields
    // Fetch the full generated content to get the text
    const contentId = res.data?.content_id;
    if (contentId) {
      try {
        const fullContent = await fetchApi(`/api/v1/content/${contentId}`, {
          method: 'GET',
        });
        const data = fullContent.data || {};
        return {
          id: contentId,
          title: data.title || res.data?.title,
          content: data.text || '',
          description: data.description || res.data?.description,
          type: data.type || params.type,
          theme: data.theme || params.theme,
          duration: data.duration,
          save_count: data.save_count || 0,
          poems: data.poems || null,
          songs: data.songs || null,
          qa: data.qa || null,
        };
      } catch (e) {
        // If fetch fails, return what we have from generation response
        return {
          id: contentId,
          title: res.data?.title,
          content: '',
          description: res.data?.description,
          type: params.type,
        };
      }
    }
    return res.data || {};
  },

  getCategories: async () => {
    const res = await fetchApi('/api/v1/content/categories', {
      method: 'GET',
    });
    return res.data?.categories || [];
  },
};

// ─── Silly Songs API ──────────────────────────────────────────
// Backend: /api/v1/silly-songs

export const sillySongsApi = {
  list: async (ageGroup = '6-8', lang = null) => {
    const params = new URLSearchParams({ age_group: ageGroup });
    if (lang) params.append('lang', lang);
    const res = await fetchApi(`/api/v1/silly-songs?${params.toString()}`, {
      method: 'GET',
    });
    return res.data?.items || [];
  },

  getById: async (id) => {
    const res = await fetchApi(`/api/v1/silly-songs/${id}`, {
      method: 'GET',
    });
    return res.data || {};
  },

  play: async (id) => {
    return fetchApi(`/api/v1/silly-songs/${id}/play`, { method: 'POST' }).catch(() => {});
  },

  replay: async (id) => {
    return fetchApi(`/api/v1/silly-songs/${id}/replay`, { method: 'POST' }).catch(() => {});
  },
};

// ─── Poems API ──────────────────────────────────────────────
// Backend: /api/v1/poems

export const poemsApi = {
  list: async (ageGroup = '6-8', lang = null) => {
    const params = new URLSearchParams({ age_group: ageGroup });
    if (lang) params.append('lang', lang);
    const res = await fetchApi(`/api/v1/poems?${params.toString()}`, {
      method: 'GET',
    });
    return res.data?.items || [];
  },

  getById: async (id) => {
    const res = await fetchApi(`/api/v1/poems/${id}`, {
      method: 'GET',
    });
    return res.data || {};
  },

  play: async (id) => {
    return fetchApi(`/api/v1/poems/${id}/play`, { method: 'POST' }).catch(() => {});
  },

  replay: async (id) => {
    return fetchApi(`/api/v1/poems/${id}/replay`, { method: 'POST' }).catch(() => {});
  },
};

// ─── Funny Shorts API ───────────────────────────────────────
// Backend: /api/v1/funny-shorts

export const funnyShortsApi = {
  list: async (ageGroup = '6-8', lang = null) => {
    const params = new URLSearchParams({ age_group: ageGroup });
    if (lang) params.append('lang', lang);
    const res = await fetchApi(`/api/v1/funny-shorts?${params.toString()}`, {
      method: 'GET',
    });
    return res.data?.items || [];
  },

  getById: async (id) => {
    const res = await fetchApi(`/api/v1/funny-shorts/${id}`, {
      method: 'GET',
    });
    return res.data || {};
  },

  play: async (id) => {
    return fetchApi(`/api/v1/funny-shorts/${id}/play`, { method: 'POST' }).catch(() => {});
  },

  replay: async (id) => {
    return fetchApi(`/api/v1/funny-shorts/${id}/replay`, { method: 'POST' }).catch(() => {});
  },
};

// ─── Lullabies API ───────────────────────────────────────────
// Backend: /api/v1/lullabies

export const lullabiesApi = {
  list: async (ageGroup = null, mood = null, lang = null) => {
    const params = new URLSearchParams();
    if (ageGroup) params.append('age_group', ageGroup);
    if (mood) params.append('mood', mood);
    if (lang) params.append('lang', lang);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchApi(`/api/v1/lullabies${query}`, {
      method: 'GET',
    });
    return res.data?.items || [];
  },

  getById: async (id) => {
    const res = await fetchApi(`/api/v1/lullabies/${id}`, {
      method: 'GET',
    });
    return res.data || {};
  },
};

// ─── Trending API ───────────────────────────────────────────
// Backend: /api/v1/trending

export const trendingApi = {
  getTrending: async (limit = 10, lang = null) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (lang) params.append('lang', lang);
    const res = await fetchApi(`/api/v1/trending?${params.toString()}`, {
      method: 'GET',
    });
    // Transform: pages expect { content: [...] }
    return { content: res.data?.items || [] };
  },

  getWeeklyTrending: async (limit = 10) => {
    const res = await fetchApi(`/api/v1/trending/weekly?limit=${limit}`, {
      method: 'GET',
    });
    return { content: res.data?.items || [] };
  },

  getTrendingByCategory: async (category, limit = 10) => {
    const res = await fetchApi(`/api/v1/trending/by-category/${category}?limit=${limit}`, {
      method: 'GET',
    });
    return { content: res.data?.items || [] };
  },
};

// ─── Interaction API ────────────────────────────────────────
// Backend: /api/v1/interactions/content/{id}/like, /api/v1/interactions/content/{id}/save

export const interactionApi = {
  // Heart actions use silent401: a 401 here must NOT log the user out or
  // bounce to the magic-link /login. The caller (HeartButton) reverts and
  // shows a soft "sign in to save" prompt instead.
  likeContent: async (id) => {
    const res = await fetchApi(`/api/v1/interactions/content/${id}/like`, {
      method: 'POST',
      silent401: true,
    });
    return res.data || {};
  },

  unlikeContent: async (id) => {
    const res = await fetchApi(`/api/v1/interactions/content/${id}/like`, {
      method: 'DELETE',
      silent401: true,
    });
    return res.data || {};
  },

  saveContent: async (id) => {
    const res = await fetchApi(`/api/v1/interactions/content/${id}/save`, {
      method: 'POST',
      silent401: true,
    });
    return res.data || {};
  },

  unsaveContent: async (id) => {
    const res = await fetchApi(`/api/v1/interactions/content/${id}/save`, {
      method: 'DELETE',
      silent401: true,
    });
    return res.data || {};
  },

  getUserLikes: async () => {
    const res = await fetchApi('/api/v1/interactions/me/likes', {
      method: 'GET',
    });
    return res.data || {};
  },

  getUserSaves: async () => {
    const res = await fetchApi('/api/v1/interactions/me/saves', {
      method: 'GET',
    });
    return res.data || {};
  },
};

// ─── Feedback API ───────────────────────────────────────────
// Backend: /api/v1/feedback/report

export const feedbackApi = {
  submitReport: async (data) => {
    const res = await fetchApi('/api/v1/feedback/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },
};

// ─── Audio API ──────────────────────────────────────────────
// Backend: /api/v1/audio/voices, /api/v1/audio/{content_id}

export const audioApi = {
  getVoices: async () => {
    const res = await fetchApi('/api/v1/audio/voices', {
      method: 'GET',
    });
    return res.data?.voices || [];
  },

  getContentAudio: async (contentId) => {
    const res = await fetchApi(`/api/v1/audio/${contentId}`, {
      method: 'GET',
    });
    return res.data || {};
  },
};

// ─── Search API ─────────────────────────────────────────────
// Backend: /api/v1/search

export const searchApi = {
  search: async (query, filters = {}) => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters.type) params.append('content_type', filters.type);
    if (filters.limit) params.append('limit', filters.limit);

    const res = await fetchApi(`/api/v1/search?${params.toString()}`, {
      method: 'GET',
    });
    return res.data || {};
  },
};

// ─── Subscription API ───────────────────────────────────────
// Backend: /api/v1/subscriptions

export const subscriptionApi = {
  getTiers: async () => {
    const res = await fetchApi('/api/v1/subscriptions/tiers', {
      method: 'GET',
    });
    return res.data || {};
  },

  // Returns { current_tier: {id, name, ...}, since, next_billing_date }.
  // Used by /upgrade/success (polling) and /settings subscription section.
  getCurrent: async () => {
    const res = await fetchApi('/api/v1/subscriptions/current', {
      method: 'GET',
    });
    const data = res.data || {};
    // Cache effective_premium so a fail-closed playback fallback can read the
    // last-known value when a live call is impossible (total API outage).
    // Flag-off → is_premium is always true → this only ever caches 'true'
    // flag-off, so the fallback's deny branch is unreachable flag-off.
    try {
      if (typeof data.effective_premium === 'boolean') {
        localStorage.setItem('dv_effective_premium', String(data.effective_premium));
      }
    } catch { /* storage unavailable — fallback just won't have a cache */ }
    return data;
  },

  // Deprecated as of Phase 0 step 1.4b. Backend now returns 410 Gone.
  // Use billingApi.startCheckout(plan) instead. Kept here only because
  // no callers exist today; will be removed when this file is touched
  // by 1.4d /pricing UI work.
  upgrade: async (tierId) => {
    const res = await fetchApi('/api/v1/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier_id: tierId }),
    });
    return res.data || {};
  },
};

// ─── Billing API ────────────────────────────────────────────
// Backend: /api/v1/billing — Stripe Checkout (Phase 0 step 1.4b)

export const billingApi = {
  /**
   * Start a Stripe Checkout session.
   * @param {('monthly'|'annual')} plan
   * @returns {Promise<{checkout_url: string}>}
   */
  startCheckout: async (plan) => {
    const res = await fetchApi('/api/v1/billing/checkout/start', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
    return res.data || res || {};
  },

  /**
   * Start a Stripe Customer Portal session (subscription management).
   * @returns {Promise<{portal_url: string}>}
   */
  startPortal: async () => {
    const res = await fetchApi('/api/v1/billing/portal/start', {
      method: 'POST',
    });
    return res.data || res || {};
  },

  /**
   * Start a $2 / 10-credit top-up Stripe Checkout session (Premium only).
   * Phase 0 step 1.4e.
   * @returns {Promise<{checkout_url: string}>}
   */
  startTopupCheckout: async () => {
    const res = await fetchApi('/api/v1/billing/topup/start', {
      method: 'POST',
    });
    return res.data || res || {};
  },
};

// ─── User API ───────────────────────────────────────────────
// Backend: /api/v1/users

export const userApi = {
  getProfile: async () => {
    const res = await fetchApi('/api/v1/users/me', {
      method: 'GET',
    });
    return res.data || {};
  },

  updateProfile: async (data) => {
    const res = await fetchApi('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data || {};
  },

  getQuota: async () => {
    const res = await fetchApi('/api/v1/users/quota', {
      method: 'GET',
    });
    return res.data || {};
  },

  /**
   * Complete onboarding for a magic-link signup_new user. Sets
   * username, child_age, preferred_lang on the user record and
   * flips onboarding_complete=true. Idempotent for the same user.
   * Throws on 409 (username collision with a different user).
   *
   * @param {{username: string, child_age: number, lang: ('en'|'hi')}} body
   * @returns {Promise<{username, child_age, preferred_lang, onboarding_complete}>}
   */
  completeOnboarding: async ({ username, child_age, lang }) => {
    const res = await fetchApi('/api/v1/users/me/complete-onboarding', {
      method: 'POST',
      body: JSON.stringify({ username, child_age, lang }),
    });
    return res.data || res || {};
  },
};

export const playlistApi = {
  getToday: async ({ age, lang, tz } = {}) => {
    const params = new URLSearchParams({ age, lang });
    if (tz) params.set('tz', tz);
    const res = await fetchApi(`/api/v1/playlist/today?${params.toString()}`);
    return res.data || { items: [], missing_slots: [], all_fresh: false };
  },
};

export default fetchApi;
