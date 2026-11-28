import { addDays } from '@/features/trips/dates';
import { newItemId } from '@/features/trips/itinerary';
import type { Trip } from '@/features/trips/types';
import { ensureSession, supabase } from '@/lib/supabase';
import { demoReady, useDemoStore } from '@/stores/demoStore';
import { DEMO_CODE, GUIDEBOOKS, type Guidebook, type GuidebookStop } from './data';

/** 코드 등록 실패 이유 → 화면 문구 */
export class RedeemError extends Error {
  constructor(public reason: 'invalid' | 'expired' | 'used_up' | 'too_many' | 'error') { super(reason); this.name = 'RedeemError'; }
}

const norm = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** 보유한 가이드북 id 목록 (검증된 구매 기록: 결제 또는 이용권 코드) */
export async function fetchOwned(): Promise<string[]> {
  if (!supabase) { await demoReady(); return useDemoStore.getState().owned; }
  await ensureSession();
  const { data, error } = await supabase.from('purchases').select('guidebook_id').eq('receipt_status', 'verified');
  if (error) throw error;
  return [...new Set((data as { guidebook_id: string }[]).map((r) => r.guidebook_id))];
}

/** 데모: 보유하지 않으면 미리보기 일차만 남긴다 (서버는 RLS가 같은 일을 한다) */
const visibleDemo = (g: Guidebook, owned: boolean): Guidebook => ({ ...g, stops: owned ? g.stops : g.stops.filter((s) => s.day <= g.previewDays) });

type GRow = { id: string; city: string; title: string; theme: string | null; days: number; preview_days: number; ios_product_id: string | null; android_product_id: string | null; guidebook_days: { day_number: number; title: string }[] };
type SRow = { guidebook_id: string; day_number: number; sort_order: number; place_id: string; tip: string };

export async function fetchGuidebooks(): Promise<Guidebook[]> {
  if (!supabase) {
    const owned = await fetchOwned();
    return GUIDEBOOKS.map((g) => visibleDemo(g, owned.includes(g.id)));
  }
  await ensureSession();
  const [{ data: gs, error: e1 }, { data: ss, error: e2 }] = await Promise.all([
    supabase.from('guidebooks').select('id,city,title,theme,days,preview_days,ios_product_id,android_product_id,guidebook_days(day_number,title)'),
    supabase.from('guidebook_stops').select('guidebook_id,day_number,sort_order,place_id,tip'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const rows = gs as GRow[];
  if (!rows.length) return GUIDEBOOKS.map((g) => visibleDemo(g, false));
  return rows.map((r) => {
    const sample = GUIDEBOOKS.find((g) => g.id === r.id);
    const stops: GuidebookStop[] = (ss as SRow[]).filter((s) => s.guidebook_id === r.id)
      .map((s) => ({ day: s.day_number, order: s.sort_order, placeId: s.place_id, tip: s.tip }))
      .sort((a, b) => a.day - b.day || a.order - b.order);
    return {
      id: r.id, city: r.city, title: r.title, theme: r.theme ?? '', days: r.days, previewDays: r.preview_days,
      toc: [...r.guidebook_days].sort((a, b) => a.day_number - b.day_number).map((d) => d.title),
      stops, iosProductId: r.ios_product_id, androidProductId: r.android_product_id, isSample: sample?.isSample ?? false,
    };
  });
}

export async function redeemCode(code: string): Promise<string> {
  if (!supabase) {
    await demoReady();
    if (norm(code) !== norm(DEMO_CODE)) throw new RedeemError('invalid');
    const st = useDemoStore.getState();
    if (!st.owned.includes('osaka-3n4d')) st.setOwned([...st.owned, 'osaka-3n4d']);
    return 'osaka-3n4d';
  }
  await ensureSession();
  const { data, error } = await supabase.rpc('redeem_guidebook_code', { p_code: code });
  if (error) throw new RedeemError('error');
  const r = data as { guidebook_id?: string; error?: string };
  const map: Record<string, RedeemError['reason']> = { INVALID_CODE: 'invalid', CODE_EXPIRED: 'expired', CODE_USED_UP: 'used_up', TOO_MANY_ATTEMPTS: 'too_many' };
  if (r.error || !r.guidebook_id) throw new RedeemError(map[r.error ?? ''] ?? 'error');
  return r.guidebook_id;
}

/** 보유한 가이드북 코스를 내 여행으로 복사 — 무료 횟수는 줄지 않는다 */
export async function importGuidebook(book: Guidebook, startDate: string): Promise<string> {
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    if (!st.owned.includes(book.id)) throw new Error('NOT_OWNED');
    const id = `demo-${Date.now()}`;
    const trip: Trip = {
      id, city: book.city, startDate, endDate: addDays(startDate, book.days - 1), companion: '', style: '가이드북 코스',
      status: 'planning', fromGuidebookId: book.id, createdAt: new Date().toISOString(), stay: null,
      days: Array.from({ length: book.days }, (_, i) => ({
        id: `${id}-d${i + 1}`, dayNumber: i + 1, date: addDays(startDate, i),
        items: book.stops.filter((s) => s.day === i + 1).sort((a, b) => a.order - b.order)
          .map((s, n) => ({ id: newItemId(), placeId: s.placeId, source: 'our' as const, order: n })),
      })),
    };
    st.setTrips([trip, ...st.trips]); // addTrip과 달리 무료 횟수를 쓰지 않음
    return id;
  }
  await ensureSession();
  const { data, error } = await supabase.rpc('import_guidebook', { p_guidebook: book.id, p_start: startDate });
  if (error) throw error;
  return data as string;
}
