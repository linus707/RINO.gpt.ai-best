import { ensureSession, supabase } from '@/lib/supabase';
import { demoReady, useDemoStore } from '@/stores/demoStore';
import { FREE_TRIP_LIMIT } from '@/features/usage/constants';
import { addDays, dayCount } from './dates';
import { FreeLimitError, type NewTripInput, type Trip } from './types';

type TripRow = {
  id: string; city: string; start_date: string; end_date: string; companion: string; style: string;
  status: Trip['status']; from_guidebook_id: string | null; created_at: string;
  trip_days: { id: string; day_number: number; date: string; itinerary_items: { id: string; place_id: string; place_source: 'our' | 'google'; sort_order: number; visit_time: string | null; memo: string | null }[] }[];
};

export const fromRow = (r: TripRow): Trip => ({
  id: r.id, city: r.city, startDate: r.start_date, endDate: r.end_date, companion: r.companion, style: r.style,
  status: r.status, fromGuidebookId: r.from_guidebook_id, createdAt: r.created_at,
  days: [...r.trip_days]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      id: d.id, dayNumber: d.day_number, date: d.date,
      items: [...d.itinerary_items].sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({ id: i.id, placeId: i.place_id, source: i.place_source, order: i.sort_order, visitTime: i.visit_time, memo: i.memo })),
    })),
});

export const TRIP_SELECT =
  'id,city,start_date,end_date,companion,style,status,from_guidebook_id,created_at,trip_days(id,day_number,date,itinerary_items(id,place_id,place_source,sort_order,visit_time,memo))';

export async function fetchTrips(): Promise<Trip[]> {
  if (!supabase) {
    await demoReady();
    return useDemoStore.getState().trips;
  }
  await ensureSession();
  const { data, error } = await supabase.from('trips').select(TRIP_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as TripRow[]).map(fromRow);
}

/**
 * 새 여행 만들기 = 무료 1회 차감. 서버 함수(create_trip)가 횟수 확인·차감·저장을 한 번에 처리한다.
 * 앱에서 횟수를 직접 줄이지 않는다(우회 방지).
 */
export async function createTrip(input: NewTripInput): Promise<Trip> {
  const n = dayCount(input.startDate, input.endDate);
  if (!supabase) {
    await demoReady();
    const store = useDemoStore.getState();
    if (store.freeUsed >= FREE_TRIP_LIMIT) throw new FreeLimitError();
    const id = `demo-${Date.now()}`;
    const trip: Trip = {
      id, ...input, status: 'planning', createdAt: new Date().toISOString(),
      days: Array.from({ length: n }, (_, i) => ({ id: `${id}-d${i + 1}`, dayNumber: i + 1, date: addDays(input.startDate, i), items: [] })),
    };
    store.addTrip(trip);
    return trip;
  }
  await ensureSession();
  const { data: tripId, error } = await supabase.rpc('create_trip', {
    p_city: input.city, p_start_date: input.startDate, p_end_date: input.endDate,
    p_companion: input.companion, p_style: input.style,
  });
  if (error) {
    if (error.message.includes('FREE_LIMIT_REACHED')) throw new FreeLimitError();
    throw error;
  }
  const { data, error: e2 } = await supabase.from('trips').select(TRIP_SELECT).eq('id', tripId).single();
  if (e2) throw e2;
  return fromRow(data as unknown as TripRow);
}
