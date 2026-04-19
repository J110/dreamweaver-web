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

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || `API error: ${response.status}`);
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
// Backend: /api/v1/auth/signup, /api/v1/auth/login
// Response shape: { success, data: { uid, username, child_age, token }, message }

export const authApi = {
  signup: async (username, password, childAge) => {
    const res = await fetchApi('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        child_age: childAge,
      }),
    });
    // Transform to shape pages expect: { token, user }
    return {
      token: res.data?.token,
      user: {
        uid: res.data?.uid,
        username: res.data?.username,
        child_age: res.data?.child_age,
      },
    };
  },

  login: async (username, password) => {
    const res = await fetchApi('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
      }),
    });
    // Transform to shape pages expect: { token, user }
    return {
      token: res.data?.token,
      user: {
        uid: res.data?.uid,
        username: res.data?.username,
        child_age: res.data?.child_age,
      },
    };
  },

  logout: async () => {
    // Client-side only logout (no backend endpoint)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dreamweaver_token');
      localStorage.removeItem('dreamweaver_user');
    }
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
  likeContent: async (id) => {
    const res = await fetchApi(`/api/v1/interactions/content/${id}/like`, {
      method: 'POST',
    });
    return res.data || {};
  },

  unlikeContent: async (id) => {
    const res = await fetchApi(`/api/v1/interactions/content/${id}/like`, {
      method: 'DELETE',
    });
    return res.data || {};
  },

  saveContent: async (id) => {
    const res = await fetchApi(`/api/v1/interactions/content/${id}/save`, {
      method: 'POST',
    });
    return res.data || {};
  },

  unsaveContent: async (id) => {
    const res = await fetchApi(`/api/v1/interactions/content/${id}/save`, {
      method: 'DELETE',
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

  upgrade: async (tierId) => {
    const res = await fetchApi('/api/v1/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier_id: tierId }),
    });
    return res.data || {};
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
};

export default fetchApi;
