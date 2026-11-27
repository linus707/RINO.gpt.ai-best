import type { PlaceRef } from '@/features/places/types';
import { newItemId } from '@/features/trips/itinerary';
import { ensureSession, supabase } from '@/lib/supabase';
import { demoReady, useDemoStore } from '@/stores/demoStore';
import type { PlaceList } from './types';

type Row = { id: string; title: string; created_at: string; place_list_items: { id: string; place_source: PlaceRef['source']; place_ref: string; added_at: string }[] };
const fromRow = (r: Row): PlaceList => ({
  id: r.id, title: r.title, createdAt: r.created_at,
  items: [...r.place_list_items].sort((a, b) => b.added_at.localeCompare(a.added_at))
    .map((i) => ({ itemId: i.id, source: i.place_source, id: i.place_ref, addedAt: i.added_at })),
});

async function demo(fn: (lists: PlaceList[]) => PlaceList[]) {
  await demoReady();
  const st = useDemoStore.getState();
  st.setLists(fn(st.lists));
}

export async function fetchLists(): Promise<PlaceList[]> {
  if (!supabase) { await demoReady(); return useDemoStore.getState().lists; }
  await ensureSession();
  const { data, error } = await supabase.from('place_lists').select('id,title,created_at,place_list_items(id,place_source,place_ref,added_at)').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function createList(title: string, id = newItemId()) {
  const t = title.trim().slice(0, 40);
  if (!t) throw new Error('EMPTY_TITLE');
  if (!supabase) return demo((ls) => [{ id, title: t, createdAt: new Date().toISOString(), items: [] }, ...ls]);
  const s = await ensureSession();
  const { error } = await supabase.from('place_lists').insert({ id, user_id: s!.user.id, title: t });
  if (error) throw error;
}

export async function renameList(id: string, title: string) {
  const t = title.trim().slice(0, 40);
  if (!t) throw new Error('EMPTY_TITLE');
  if (!supabase) return demo((ls) => ls.map((l) => (l.id === id ? { ...l, title: t } : l)));
  await ensureSession();
  const { error } = await supabase.from('place_lists').update({ title: t, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteList(id: string) {
  if (!supabase) return demo((ls) => ls.filter((l) => l.id !== id));
  await ensureSession();
  const { error } = await supabase.from('place_lists').delete().eq('id', id);
  if (error) throw error;
}

export async function setInList(listId: string, ref: PlaceRef, on: boolean) {
  if (!supabase) {
    return demo((ls) => ls.map((l) => {
      if (l.id !== listId) return l;
      const has = l.items.some((i) => i.source === ref.source && i.id === ref.id);
      if (on && !has) return { ...l, items: [{ ...ref, itemId: newItemId(), addedAt: new Date().toISOString() }, ...l.items] };
      if (!on) return { ...l, items: l.items.filter((i) => !(i.source === ref.source && i.id === ref.id)) };
      return l;
    }));
  }
  await ensureSession();
  if (on) {
    const { error } = await supabase.from('place_list_items')
      .upsert({ list_id: listId, place_source: ref.source, place_ref: ref.id }, { onConflict: 'list_id,place_source,place_ref', ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('place_list_items').delete().eq('list_id', listId).eq('place_source', ref.source).eq('place_ref', ref.id);
    if (error) throw error;
  }
}
