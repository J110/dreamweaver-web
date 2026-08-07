'use client';

import { pushApi } from './api';

export function nativePushBridge() {
  if (typeof window === 'undefined') return null;
  const bridge = window.DreamValleyPush;
  return bridge?.isAvailable === true ? bridge : null;
}

export async function enableNativePush() {
  const bridge = nativePushBridge();
  if (!bridge) return { status: 'unavailable' };
  const result = await bridge.requestPermission();
  const permission = result?.value?.permission || 'denied';
  let target = result?.value?.token;
  if (result?.success && !target && (permission === 'authorized' || permission === 'provisional')) {
    for (let attempt = 0; attempt < 20 && !target; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      const current = await bridge.getToken();
      target = current?.value?.token;
    }
  }
  if (!result?.success || !target) {
    return { status: permission === 'authorized' || permission === 'provisional' ? 'pending' : permission };
  }
  await pushApi.register(target, permission);
  return { status: 'registered' };
}

export async function disableNativePush() {
  const bridge = nativePushBridge();
  if (!bridge) return { status: 'unavailable' };
  const current = await bridge.getToken();
  const target = current?.value?.token;
  if (target) await pushApi.unregister(target);
  await bridge.deleteToken();
  return { status: 'disabled' };
}

export function bindNativePushEvents(onRegistered) {
  if (typeof window === 'undefined' || !nativePushBridge()) return () => {};
  const onToken = (event) => {
    const target = event?.detail?.token;
    if (target) {
      pushApi.register(target, 'authorized')
        .then(() => onRegistered?.())
        .catch(() => {});
    }
  };
  const onOpen = (event) => {
    const route = event?.detail?.route;
    if (typeof route === 'string' && route.startsWith('/') && !route.startsWith('//')) {
      window.location.assign(route);
    }
  };
  window.addEventListener('dreamvalley:push-token', onToken);
  window.addEventListener('dreamvalley:push-open', onOpen);
  return () => {
    window.removeEventListener('dreamvalley:push-token', onToken);
    window.removeEventListener('dreamvalley:push-open', onOpen);
  };
}
