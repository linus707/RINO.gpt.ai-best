import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AddTarget } from '@/components/AddTarget';
import { AppText } from '@/components/AppText';
import { PlaceRow } from '@/components/Cards';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { CATEGORIES, type CategoryKey } from '@/constants/categories';
import { color, font, radius, space } from '@/constants/design';
import { SAMPLE_PLACES } from '@/features/places/data';
import { josa } from '@/features/places/josa';
import { useCurrentTrip } from '@/features/trips/hooks';
import { useItineraryEdit } from '@/features/trips/itineraryHooks';
import { useAppStore } from '@/stores/appStore';

/** 장소 탐색 — 검색 + 카테고리 6개 + 지금 보는 일차에 담기. 장소 검색 API 연결은 Phase 3 */
export default function PlaceSearch() {
  const params = useLocalSearchParams<{ cat?: CategoryKey }>();
  const [cat, setCat] = useState<CategoryKey | 'all'>(params.cat ?? 'all');
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState('');
  const { trip } = useCurrentTrip();
  const dayNo = useAppStore((s) => s.selectedDay);
  const edit = useItineraryEdit(trip);
  const city = trip?.city ?? '오사카';
  const day = trip?.days.find((d) => d.dayNumber === dayNo) ?? trip?.days[0];
  const inDay = new Set(day?.items.map((i) => i.placeId));
  const term = q.trim();
  const list = SAMPLE_PLACES.filter((p) => p.city === city && (cat === 'all' || p.category === cat) && (!term || p.name.includes(term) || p.area.includes(term)));

  const add = (id: string, name: string) => {
    if (!trip || !day) return router.push('/trip/new');
    if (inDay.has(id)) return setNotice(`${josa(name, '은', '는')} 이미 ${day.dayNumber}일차에 있어요`);
    edit.add(day.dayNumber, id);
    setNotice(`${day.dayNumber}일차에 ${josa(name, '을', '를')} 담았어요`);
  };

  return (
    <Screen edges={['bottom']}>
      <AddTarget trip={trip} />
      <TextInput value={q} onChangeText={setQ} placeholder={`${city}에서 장소 검색`} style={s.input} accessibilityLabel="장소 검색" returnKeyType="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <Chip label="전체" selected={cat === 'all'} onPress={() => setCat('all')} />
        {CATEGORIES.map((c) => <Chip key={c.key} label={c.label} selected={cat === c.key} onPress={() => setCat(c.key)} />)}
      </ScrollView>
      {notice ? <AppText v="caption" color={color.action} style={{ marginBottom: space.sm, fontWeight: '700' }} accessibilityLiveRegion="polite">{notice}</AppText> : null}
      {city !== '오사카' ? (
        <EmptyState title={`${city} 장소 데이터는 아직이에요`} description="지금은 오사카 샘플 장소만 있어요. 장소 검색 연결은 Phase 3이에요." />
      ) : list.length ? (
        <View>
          <AppText v="caption" color={color.sub} style={{ marginBottom: space.sm }}>샘플 장소</AppText>
          {list.map((p) => {
            const added = inDay.has(p.id);
            return (
              <PlaceRow
                key={p.id}
                place={p}
                onPress={() => router.push(`/place/${p.id}`)}
                right={trip ? <Chip label={added ? '담김' : '담기'} selected={added} onPress={() => add(p.id, p.name)} /> : null}
              />
            );
          })}
        </View>
      ) : (
        <EmptyState title="찾는 장소가 없어요" description="검색어를 바꾸거나 카테고리를 전체로 돌려 보세요." />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  input: { ...font.body, fontSize: 16, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.lg, color: color.ink },
  chips: { gap: space.sm, paddingVertical: space.md },
});
