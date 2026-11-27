import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PlaceRow } from '@/components/Cards';
import { DayTabs } from '@/components/DayTabs';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { color, space } from '@/constants/design';
import { placeById } from '@/features/places/data';
import { nightsDays } from '@/features/trips/dates';
import { useCurrentTrip } from '@/features/trips/hooks';
import { useAppStore } from '@/stores/appStore';

/** 일자별 일정 — 날짜 탭 + 시간순 장소 목록. (장소 추가·드래그 순서 변경은 Phase 2) */
export default function Itinerary() {
  const { trip, isLoading } = useCurrentTrip();
  const dayNo = useAppStore((s) => s.selectedDay);
  if (isLoading) return <Screen title="일정"><AppText color={color.sub}>불러오는 중…</AppText></Screen>;
  if (!trip) {
    return (
      <Screen title="일정">
        <EmptyState title="열려 있는 여행이 없어요" description="홈에서 여행을 고르거나 새로 만들어 주세요." actionLabel="여행 만들기" onAction={() => router.push('/trip/new')} />
      </Screen>
    );
  }
  const day = trip.days.find((d) => d.dayNumber === dayNo) ?? trip.days[0];
  return (
    <Screen title={`${trip.city} ${nightsDays(trip.days.length)}`}>
      <DayTabs trip={trip} />
      {day.items.length ? (
        day.items.map((it, i) => {
          const p = placeById(it.placeId);
          return p ? <PlaceRow key={it.id} place={p} order={i + 1} onPress={() => router.push(`/place/${p.id}`)} /> : null;
        })
      ) : (
        <EmptyState title={`${day.dayNumber}일차가 비어 있어요`} description="장소 탐색에서 가 보고 싶은 곳을 찾아 담아 보세요. 정한 순서가 곧 지도 동선이 돼요." />
      )}
      <View style={{ marginTop: space.md }}>
        <Button label="+ 장소 추가" onPress={() => router.push('/place/search')} />
      </View>
    </Screen>
  );
}
