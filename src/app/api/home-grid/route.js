import { NextResponse } from 'next/server';
import { buildHomeGrid } from '@/server/homeGrid/buildHomeGrid';

export const dynamic = 'force-dynamic'; // per-user response, never cached

export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() || null : null;
  const lang = new URL(request.url).searchParams.get('lang') || 'en';
  const grid = await buildHomeGrid(token, lang); // fail-closed internally
  return NextResponse.json(grid, { headers: { 'Cache-Control': 'no-store' } });
}
