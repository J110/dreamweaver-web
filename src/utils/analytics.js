/**
 * Lightweight analytics tracking singleton.
 * Batches events and sends to the backend every 10 seconds.
 * Uses localStorage for persistent user ID, sessionStorage for sessions.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ANALYTICS_ENDPOINT = `${API_URL}/api/v1/analytics/events`;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const FLUSH_INTERVAL = 10000; // 10 seconds

class Analytics {
  constructor() {
    if (typeof window === 'undefined') return; // SSR guard

    this._isNewUser = !localStorage.getItem('dv_uid');
    this.userId = this._getOrCreateUserId();
    this.sessionId = this._getOrCreateSessionId();
    this.queue = [];
    this._flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
    this._sessionStart = Date.now();

    if (this._isNewUser) {
      localStorage.setItem('dv_uid_new', '1');
    }
  }

  _getOrCreateUserId() {
    let id = localStorage.getItem('dv_uid');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('dv_uid', id);
    }
    return id;
  }

  _getOrCreateSessionId() {
    const stored = sessionStorage.getItem('dv_session');
    const lastActivity = parseInt(sessionStorage.getItem('dv_last_activity') || '0');
    const now = Date.now();

    if (stored && (now - lastActivity) < SESSION_TIMEOUT) {
      sessionStorage.setItem('dv_last_activity', now.toString());
      return stored;
    }

    const newId = crypto.randomUUID();
    sessionStorage.setItem('dv_session', newId);
    sessionStorage.setItem('dv_last_activity', now.toString());
    sessionStorage.setItem('dv_session_start', now.toString());
    return newId;
  }

  track(eventName, payload = {}) {
    if (typeof window === 'undefined') return;

    this.sessionId = this._getOrCreateSessionId();

    this.queue.push({
      event: eventName,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        ...payload,
        url: window.location.pathname,
        device: this._getDeviceType(),
      },
    });

    // Flush immediately for critical events
    if (['signup', 'play_start', 'play_complete', 'play_abandon'].includes(eventName)) {
      this.flush();
    }
  }

  async flush() {
    if (typeof window === 'undefined' || this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch {
      // Re-queue on failure (silently)
      this.queue.unshift(...events);
    }
  }

  _getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Mobile/i.test(ua)) return 'mobile_other';
    return 'desktop';
  }

  parseReferrer() {
    if (typeof window === 'undefined') return 'direct';
    const ref = document.referrer;
    if (!ref) return 'direct';
    try {
      const host = new URL(ref).hostname;
      if (host.includes('google')) return 'google';
      if (host.includes('tiktok')) return 'social:tiktok';
      if (host.includes('instagram')) return 'social:instagram';
      if (host.includes('facebook') || host.includes('fb.com')) return 'social:facebook';
      if (host.includes('twitter') || host.includes('x.com')) return 'social:twitter';
      if (host.includes('dreamvalley.app')) {
        if (ref.includes('/blog')) return 'blog';
        return 'internal';
      }
      return 'other';
    } catch {
      return 'other';
    }
  }

  endSession() {
    const start = parseInt(sessionStorage.getItem('dv_session_start') || this._sessionStart.toString());
    this.track('session_end', {
      sessionId: this.sessionId,
      durationMs: Date.now() - start,
    });
    this.flush();
  }
}

// Singleton — safe for SSR (constructor guards)
export const dvAnalytics = new Analytics();

// Expose globally for non-module access
if (typeof window !== 'undefined') {
  window.dvAnalytics = dvAnalytics;
}
