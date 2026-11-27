import type { PlaceRef } from '@/features/places/types';
import { newItemId } from '@/features/trips/itinerary';
import { ensureSession, supabase } from '@/lib/supabase';
import { demoReady, useDemoStore } from '@/stores/demoStore';
import type { SavedPatch, SavedPlace } from './types';

type Row = { id: string; place_source: SavedPlace['source']; place_ref: string; memo: string; my_rating: number | null; tags: string[]; visited_at: string | null; created_at: string };
const fromRow = (r: Row): SavedPlace => ({
  id: r.id, source: r.place_source, ref: r.place_ref, memo: r.memo, myRating: r.my_rating, tags: r.tags, visitedAt: r.visited_at, createdAt: r.created_at,
});
const COLS = 'id,place_source,place_ref,memo,my_rating,tags,visited_at,created_at';

export async function fetchSaved(): Promise<SavedPlace[]> {
  if (!supabase) { await demoReady(); return useDemoStore.getState().saved; }
  await ensureSession();
  const { data, error } = await supabase.from('saved_places').select(COLS).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function savePlace(ref: PlaceRef): Promise<SavedPlace> {
  const item: SavedPlace = { id: newItemId(), source: ref.source, ref: ref.id, memo: '', myRating: null, tags: [], visitedAt: null, createdAt: new Date().toISOString() };
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    if (!st.saved.some((s) => s.source === ref.source && s.ref === ref.id)) st.setSaved([item, ...st.saved]);
    return item;
  }
  const session = await ensureSession();
  const { data, error } = await supabase.from('saved_places')
    .upsert({ id: item.id, user_id: session!.user.id, place_source: ref.source, place_ref: ref.id }, { onConflict: 'user_id,place_source,place_ref', ignoreDuplicates: true })
    .select(COLS);
  if (error) throw error;
  return data?.[0] ? fromRow(data[0] as Row) : item;
}

export async function unsavePlace(ref: PlaceRef) {
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    st.setSaved(st.saved.filter((s) => !(s.source === ref.source && s.ref === ref.id)));
    return;
  }
  await ensureSession();
  const { error } = await supabase.from('saved_places').delete().eq('place_source', ref.source).eq('place_ref', ref.id);
  if (error) throw error;
}

export async function updateSaved(id: string, patch: SavedPatch) {
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    st.setSaved(st.saved.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    return;
  }
  await ensureSession();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.memo !== undefined) row.memo = patch.memo.slice(0, 1000);
  if (patch.myRating !== undefined) row.my_rating = patch.myRating;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.visitedAt !== undefined) row.visited_at = patch.visitedAt;
  const { error } = await supabase.from('saved_places').update(row).eq('id', id);
  if (error) throw error;
}
