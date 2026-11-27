import { supabase } from '@/lib/supabase';
import { demoReady, useDemoStore } from '@/stores/demoStore';
import type { ItineraryItem, Trip } from './types';

/**
 * 일정 편집 (Phase 2). 장소 원본은 참조만 하고, 순서·시간은 일정 항목에 저장한다.
 * 일정 순서가 곧 지도 동선이다 — 동선을 따로 저장하지 않는다.
 */
export type ItineraryChange =
  | { type: 'add'; tripId: string; dayNumber: number; item: ItineraryItem }
  | { type: 'remove'; tripId: string; dayNumber: number; itemId: string }
  | { type: 'reorder'; tripId: string; dayNumber: number; itemIds: string[] };

/** 변경을 여행 목록에 반영한 새 목록 (화면 즉시 반영·데모 저장 공용) */
export function applyChange(trips: Trip[], c: ItineraryChange): Trip[] {
  return trips.map((t) => {
    if (t.id !== c.tripId) return t;
    return {
      ...t,
      days: t.days.map((d) => {
        if (d.dayNumber !== c.dayNumber) return d;
        let items = d.items;
        if (c.type === 'add') items = [...items, c.item];
        if (c.type === 'remove') items = items.filter((i) => i.id !== c.itemId);
        if (c.type === 'reorder') {
          const byId = new Map(items.map((i) => [i.id, i]));
          items = c.itemIds.map((id) => byId.get(id)).filter((i): i is ItineraryItem => !!i);
        }
        return { ...d, items: items.map((i, n) => ({ ...i, order: n })) };
      }),
    };
  });
}

const dayOf = (trip: Trip, dayNumber: number) => {
  const d = trip.days.find((x) => x.dayNumber === dayNumber);
  if (!d) throw new Error('DAY_NOT_FOUND');
  return d;
};

/** 서버(또는 데모 저장소)에 변경을 저장한다 */
export async function saveChange(trip: Trip, c: ItineraryChange): Promise<void> {
  if (!supabase) {
    await demoReady();
    const st = useDemoStore.getState();
    st.setTrips(applyChange(st.trips, c));
    return;
  }
  const day = dayOf(trip, c.dayNumber);
  if (c.type === 'add') {
    const { error } = await supabase.from('itinerary_items').insert({
      id: c.item.id, trip_day_id: day.id, place_id: c.item.placeId, place_source: c.item.source ?? 'our', sort_order: day.items.length,
    });
    if (error) throw error;
  } else if (c.type === 'remove') {
    const { error } = await supabase.from('itinerary_items').delete().eq('id', c.itemId);
    if (error) throw error;
  } else {
    const { error } = await supabase.rpc('reorder_itinerary', { p_day: day.id, p_ids: c.itemIds });
    if (error) throw error;
  }
}

/** 새 일정 항목 id — 서버와 데모 모두 같은 형식(uuid)을 쓴다 */
export const newItemId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
