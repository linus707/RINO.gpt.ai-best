import type { PlaceRef } from '@/features/places/types';
import { newItemId } from '@/features/trips/itinerary';
import { ensureSession, supabase } from '@/lib/supabase';
import { demoReady, useDemoStore } from '@/stores/demoStore';
import type { StayCandidate } from './types';

type Row = { id: string; trip_id: string; place_source: PlaceRef['source']; place_ref: string; memo: string; price_note: string; created_at: string };
const fromRow = (r: Row): StayCandidate => ({
  candId: r.id, tripId: r.trip_id, source: r.place_source, id: r.place_ref, memo: r.memo, priceNote: r.price_note, createdAt: r.created_at,
});

export async function fetchStays(tripId: string): Promise<StayCandidate[]> {
  if (!supabase) { await demoReady(); return useDemoStore.getState().stays.filter((s) => s.tripId === tripId); }
  await ensureSession();
  const { data, error } = await supabase.from('trip_stay_candidates').select('*').eq('trip_id', tripId).order('created_at');
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function addStay(tripId: string, ref: PlaceRef) {
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    if (st.stays.some((s) => s.tripId === tripId && s.source === ref.source && s.id === ref.id)) return;
    st.setStays([...st.stays, { ...ref, candId: newItemId(), tripId, memo: '', priceNote: '', createdAt: new Date().toISOString() }]);
    return;
  }
  await ensureSession();
  const { error } = await supabase.from('trip_stay_candidates')
    .upsert({ trip_id: tripId, place_source: ref.source, place_ref: ref.id }, { onConflict: 'trip_id,place_source,place_ref', ignoreDuplicates: true });
  if (error) throw error;
}

export async function updateStay(candId: string, patch: { memo?: string; priceNote?: string }) {
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    st.setStays(st.stays.map((s) => (s.candId === candId ? { ...s, ...patch } : s)));
    return;
  }
  await ensureSession();
  const row: Record<string, string> = {};
  if (patch.memo !== undefined) row.memo = patch.memo.slice(0, 500);
  if (patch.priceNote !== undefined) row.price_note = patch.priceNote.slice(0, 60);
  const { error } = await supabase.from('trip_stay_candidates').update(row).eq('id', candId);
  if (error) throw error;
}

export async function removeStay(c: StayCandidate) {
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    st.setStays(st.stays.filter((s) => s.candId !== c.candId));
    st.setTrips(st.trips.map((t) => (t.id === c.tripId && t.stay?.source === c.source && t.stay.id === c.id ? { ...t, stay: null } : t)));
    return;
  }
  await ensureSession();
  const { error } = await supabase.from('trip_stay_candidates').delete().eq('id', c.candId);
  if (error) throw error;
  // 고른 숙소였다면 선택도 풀기
  await supabase.from('trips').update({ stay_place_source: null, stay_place_ref: null })
    .eq('id', c.tripId).eq('stay_place_source', c.source).eq('stay_place_ref', c.id);
}

/** 하나를 골라 여행에 고정 (null이면 선택 해제) */
export async function chooseStay(tripId: string, ref: PlaceRef | null) {
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    st.setTrips(st.trips.map((t) => (t.id === tripId ? { ...t, stay: ref } : t)));
    return;
  }
  await ensureSession();
  const { error } = await supabase.from('trips').update({ stay_place_source: ref?.source ?? null, stay_place_ref: ref?.id ?? null }).eq('id', tripId);
  if (error) throw error;
}

/** 내보내기용: 내 모든 여행의 숙소 후보 */
export async function fetchAllStays(): Promise<StayCandidate[]> {
  if (!supabase) { await demoReady(); return useDemoStore.getState().stays; }
  await ensureSession();
  const { data, error } = await supabase.from('trip_stay_candidates').select('*').order('created_at');
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}
