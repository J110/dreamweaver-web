import { NextResponse } from 'next/server';
import { isNativeUA } from '@/utils/nativeUA';

/**
 * Compliance backstop: native requests must never reach web-only pricing.
 *
 * Keyed on the durable DreamValleyApp UA + ?source=app — never
 * localStorage. Shares the single NATIVE_UA source via nativeUA.js.
 */
export function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const sourceApp = request.nextUrl.searchParams.get('source') === 'app';
  if (isNativeUA(ua) || sourceApp) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/pricing'],
};
