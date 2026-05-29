export function isNativeApp() {
  if (typeof navigator === 'undefined') return false;
  return /DreamValleyApp\/[\d.]+/i.test(navigator.userAgent || '');
}
