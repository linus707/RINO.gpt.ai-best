import type { CategoryKey } from '@/constants/categories';
import { ensureSession, supabase } from '@/lib/supabase';
import type { ResolvedPlace } from './types';

/** Google 검색을 지금 쓸 수 없을 때 (데모 모드, 서버 키 미설정, 하루 한도) */
export class GoogleUnavailableError extends Error {
  constructor(public reason: 'demo' | 'not_configured' | 'daily_limit' | 'error') { super(reason); this.name = 'GoogleUnavailableError'; }
}

type Raw = { id: string; name: string; address: string; lat: number | null; lng: number | null; category: CategoryKey; mapsUri?: string | null };
const toResolved = (r: Raw): ResolvedPlace => ({
  source: 'google', id: r.id, key: `google:${r.id}`, name: r.name, category: r.category,
  area: r.address.replace(/^(일본|대한민국|태국|프랑스)\s+/, ''), lat: r.lat, lng: r.lng, mapsUri: r.mapsUri ?? null,
});

async function call(body: Record<string, unknown>): Promise<Raw[]> {
  if (!supabase) throw new GoogleUnavailableError('demo');
  await ensureSession();
  const { data, error } = await supabase.functions.invoke('places', { body });
  if (error) {
    const status = (error as { context?: Response }).context?.status;
    if (status === 503) throw new GoogleUnavailableError('not_configured');
    if (status === 429) throw new GoogleUnavailableError('daily_limit');
    throw new GoogleUnavailableError('error');
  }
  return (data as { places: Raw[] }).places ?? [];
}

export async function searchGoogle(p: { query: string; category?: CategoryKey; center: { lat: number; lng: number }; cityName: string }) {
  return (await call({ action: 'search', ...p })).map(toResolved);
}

export async function googleDetails(ids: string[]) {
  const out: ResolvedPlace[] = [];
  for (let i = 0; i < ids.length; i += 20) out.push(...(await call({ action: 'details', ids: ids.slice(i, i + 20) })).map(toResolved));
  return out;
}
