import { create } from 'zustand';

/** 화면 상태(서버 데이터 아님): 지금 보고 있는 여행과 일차 */
type AppState = {
  selectedTripId: string | null;
  selectedDay: number; // 1부터
  selectTrip: (id: string) => void;
  selectDay: (day: number) => void;
};

export const useAppStore = create<AppState>()((set) => ({
  selectedTripId: null,
  selectedDay: 1,
  selectTrip: (id) => set({ selectedTripId: id, selectedDay: 1 }),
  selectDay: (day) => set({ selectedDay: day }),
}));
