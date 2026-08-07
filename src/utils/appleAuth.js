'use client';

import { authApi } from './api';

export function nativeAppleAuthBridge() {
  if (typeof window === 'undefined') return null;
  const bridge = window.DreamValleyAppleAuth;
  return bridge?.isAvailable === true ? bridge : null;
}

const browserClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';
const browserRedirectUri = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || '';

export function appleAuthAvailable() {
  return Boolean(nativeAppleAuthBridge() || (browserClientId && browserRedirectUri));
}

function loadAppleJs() {
  if (window.AppleID?.auth) return Promise.resolve(window.AppleID.auth);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-dv-apple-auth]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.AppleID.auth), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.dataset.dvAppleAuth = 'true';
    script.onload = () => resolve(window.AppleID.auth);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function authorizeWithApple(purpose = 'restore') {
  const bridge = nativeAppleAuthBridge();
  if (!bridge && (!browserClientId || !browserRedirectUri)) return { status: 'unavailable' };
  const session = await authApi.appleStart(purpose);
  let identityToken;
  if (bridge) {
    const authorization = await bridge.authorize(session.nonce);
    if (!authorization?.success) {
      return { status: authorization?.error === 'cancelled' ? 'cancelled' : 'failed' };
    }
    identityToken = authorization.payload.identityToken;
  } else {
    try {
      const apple = await loadAppleJs();
      apple.init({
        clientId: browserClientId,
        scope: 'name email',
        redirectURI: browserRedirectUri,
        state: session.session_id,
        nonce: session.nonce,
        usePopup: true,
      });
      const authorization = await apple.signIn();
      identityToken = authorization?.authorization?.id_token;
    } catch (error) {
      return { status: String(error?.error || error).includes('cancel') ? 'cancelled' : 'failed' };
    }
  }
  if (!identityToken) return { status: 'failed' };
  return authApi.appleVerify(session.session_id, identityToken);
}
