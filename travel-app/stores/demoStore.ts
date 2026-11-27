import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PlaceList } from '@/features/lists/types';
import type { SavedPlace } from '@/features/saved/types';
import type { StayCandidate } from '@/features/stay/types';
import type { Trip } from '@/features/trips/types';

/**
 * 데모 모드 전용 저장소 (.env에 Supabase 값이 없을 때).
 * 실제 서비스에서는 서버(Supabase)가 원본이고, 이 저장소는 쓰지 않는다.
 */
type DemoState = {
  trips: Trip[];
  freeUsed: number;
  saved: SavedPlace[];
  setSaved: (saved: SavedPlace[]) => void;
  lists: PlaceList[];
  setLists: (lists: PlaceList[]) => void;
  stays: StayCandidate[];
  setStays: (stays: StayCandidate[]) => void;
  addTrip: (trip: Trip) => void;
  setTrips: (trips: Trip[]) => void;
  reset: () => void;
};

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      trips: [],
      freeUsed: 0,
      saved: [],
      setSaved: (saved) => set({ saved }),
      lists: [],
      setLists: (lists) => set({ lists }),
      stays: [],
      setStays: (stays) => set({ stays }),
      addTrip: (trip) => set((s) => ({ trips: [trip, ...s.trips], freeUsed: s.freeUsed + 1 })),
      setTrips: (trips) => set({ trips }),
      reset: () => set({ trips: [], freeUsed: 0, saved: [], lists: [], stays: [] }),
    }),
    { name: 'rino-trip-demo', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** 저장소를 기기에서 다 읽어 올 때까지 기다린다 (앱을 껐다 켜도 일정이 남아 있게) */
export function demoReady(): Promise<void> {
  if (useDemoStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const off = useDemoStore.persist.onFinishHydration(() => { off(); resolve(); });
  });
}
