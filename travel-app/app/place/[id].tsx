import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { categoryOf } from '@/constants/categories';
import { color, radius, space } from '@/constants/design';
import { placeById } from '@/features/places/data';
import { useCurrentTrip } from '@/features/trips/hooks';
import { useItineraryEdit } from '@/features/trips/itineraryHooks';
import { useAppStore } from '@/stores/appStore';

/** 장소 상세 — 영업시간·입장료는 공식 출처 확인값만, 확인일과 함께 */
export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = placeById(id);
  const { trip } = useCurrentTrip();
  const dayNo = useAppStore((st) => st.selectedDay);
  const edit = useItineraryEdit(trip);
  const day = trip?.days.find((d) => d.dayNumber === dayNo) ?? trip?.days[0];
  if (!place) return <Screen><EmptyState title="장소를 찾을 수 없어요" description="목록으로 돌아가 다시 골라 주세요." /></Screen>;
  const c = categoryOf(place.category);
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: place.name }} />
      <AppText v="caption" color={c.color} style={{ fontWeight: '700' }}>{c.label}</AppText>
      <AppText v="title">{place.name}</AppText>
      <AppText v="body" color={color.sub}>{place.area} · {place.note}</AppText>
      <View style={s.box}>
        <AppText v="bodyBold">확인 정보</AppText>
        <AppText v="caption" color={color.sub}>
          {place.verifiedAt ? `확인일 ${place.verifiedAt}` : '영업시간·입장료는 공식 출처로 확인한 뒤 확인일과 함께 표시돼요 (지금은 샘플)'}
        </AppText>
      </View>
      {!trip || !day ? (
        <Button label="여행을 먼저 만들어 주세요" onPress={() => router.push('/trip/new')} />
      ) : trip.city !== place.city ? (
        <Button label={`${trip.city} 여행에는 담을 수 없어요`} disabled />
      ) : day.items.some((i) => i.placeId === place.id) ? (
        <Button label={`${day.dayNumber}일차에 담겨 있어요`} variant="secondary" disabled />
      ) : (
        <Button label={`${trip.city} ${day.dayNumber}일차에 담기`} onPress={() => edit.add(day.dayNumber, place.id)} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({ box: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginVertical: space.lg } });
