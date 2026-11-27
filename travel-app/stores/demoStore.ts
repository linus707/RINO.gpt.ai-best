import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Trip } from '@/features/trips/types';

/**
 * 데모 모드 전용 저장소 (.env에 Supabase 값이 없을 때).
 * 실제 서비스에서는 서버(Supabase)가 원본이고, 이 저장소는 쓰지 않는다.
 */
type DemoState = {
  trips: Trip[];
  freeUsed: number;
  addTrip: (trip: Trip) => void;
  reset: () => void;
};

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      trips: [],
      freeUsed: 0,
      addTrip: (trip) => set((s) => ({ trips: [trip, ...s.trips], freeUsed: s.freeUsed + 1 })),
      reset: () => set({ trips: [], freeUsed: 0 }),
    }),
    { name: 'rino-trip-demo', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
