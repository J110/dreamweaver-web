import { NextResponse } from 'next/server';
import { isNativeUA } from '@/utils/nativeUA';

/**
 * Compliance backstop (non-optional): native requests must never reach
 * a web purchase route. /pricing and /upgrade are redirected to home at
 * the edge — so a native request receives a redirect, never the purchase
 * HTML (absent, not hidden). Defense-in-depth alongside the in-render
 * isNativeRequest() gate in each route's server component.
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
  matcher: ['/pricing', '/upgrade'],
};
