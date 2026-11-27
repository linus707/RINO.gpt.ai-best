import { ScrollView } from 'react-native';
import { space } from '@/constants/design';
import { shortDate } from '@/features/trips/dates';
import type { Trip } from '@/features/trips/types';
import { useAppStore } from '@/stores/appStore';
import { Chip } from './Chip';

/** 날짜 탭 — 일정과 지도 탭이 같은 선택 일차를 공유한다 */
export function DayTabs({ trip, withDate = true }: { trip: Trip; withDate?: boolean }) {
  const day = useAppStore((s) => s.selectedDay);
  const selectDay = useAppStore((s) => s.selectDay);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}>
      {trip.days.map((d) => (
        <Chip key={d.id} label={withDate ? `${d.dayNumber}일차 · ${shortDate(d.date)}` : `${d.dayNumber}일차`}
          selected={d.dayNumber === day} onPress={() => selectDay(d.dayNumber)} />
      ))}
    </ScrollView>
  );
}
