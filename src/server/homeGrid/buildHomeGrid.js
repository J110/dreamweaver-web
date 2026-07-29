import 'server-only';
import { getStories } from '@/utils/seedData';
import { enrichGrid } from './enrichGrid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchTrending(token, lang) {
  const params = new URLSearchParams({ limit: '200' });
  if (lang) params.append('lang', lang);
  const res = await fetch(`${API_URL}/api/v1/trending?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: token ? { revalidate: 0 } : { revalidate: 120 },
    cache: token ? 'no-store' : undefined,
  });
  if (!res.ok) throw new Error(`trending ${res.status}`);
  const json = await res.json();
  return json.data?.items || [];
}

async function fetchIsPremium(token) {
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (!res.ok) return false;
    const json = await res.json();
    const tier = json.data?.subscription_tier ?? 'free';
    return String(tier).toLowerCase() === 'premium';
  } catch {
    return false;
  }
}

export async function buildHomeGrid(token, lang) {
  const seedItems = getStories(lang);
  let apiItems;
  try {
    apiItems = await fetchTrending(token, lang);
  } catch {
    return { content: enrichGrid({ apiItems: [], seedItems, isPremium: false }) };
  }
  const isPremium = await fetchIsPremium(token);
  return { content: enrichGrid({ apiItems, seedItems, isPremium }) };
}
