import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ImportSheet } from '@/components/ImportSheet';
import { MapView } from '@/components/MapView';
import { Screen } from '@/components/Screen';
import { StopRow } from '@/components/StopRow';
import { categoryOf } from '@/constants/categories';
import { color, space } from '@/constants/design';
import { useGuidebook } from '@/features/guidebooks/hooks';
import { placeById } from '@/features/places/data';
import type { MapPin } from '@/lib/maps';

/** 보유한 가이드북의 전체 코스 — 일차별 지도·장소·리노 팁 */
export default function Course() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { book, owned, isLoading } = useGuidebook(id);
  const [day, setDay] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  if (isLoading) return <Screen><AppText color={color.sub}>불러오는 중…</AppText></Screen>;
  if (!book || !owned) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState title="보유한 뒤 열리는 코스예요" description="첫날은 상세 화면에서 무료로 미리 볼 수 있어요. 이용권 코드가 있으면 거기서 등록해 주세요."
          actionLabel="미리보기로 돌아가기" onAction={() => router.replace(`/guidebook/${id}`)} />
      </Screen>
    );
  }
  const stops = book.stops.filter((s) => s.day === day).sort((a, b) => a.order - b.order);
  const pins: MapPin[] = stops.flatMap((s, i) => {
    const p = placeById(s.placeId);
    return p ? [{ id: `${s.day}-${s.order}`, order: i + 1, lat: p.lat, lng: p.lng, label: p.name, color: categoryOf(p.category).color }] : [];
  });
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: `${book.title} 코스` }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}>
        {book.toc.map((_, i) => <Chip key={i} label={`${i + 1}일차`} selected={day === i + 1} onPress={() => setDay(i + 1)} />)}
      </ScrollView>
      <AppText v="subtitle" style={{ marginBottom: space.sm }}>{day}일차 · {book.toc[day - 1]}</AppText>
      <MapView pins={pins} height={260} />
      <View style={{ marginTop: space.lg }}>
        {stops.map((st, i) => <StopRow key={`${st.day}-${st.order}`} stop={st} order={i + 1} />)}
      </View>
      <Button label="내 일정으로 불러오기" onPress={() => setImportOpen(true)} style={{ marginTop: space.lg }} />
      <ImportSheet book={book} visible={importOpen} onClose={() => setImportOpen(false)} />
    </Screen>
  );
}
