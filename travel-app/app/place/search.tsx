import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PlaceRow } from '@/components/Cards';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { CATEGORIES, type CategoryKey } from '@/constants/categories';
import { color, font, radius, space } from '@/constants/design';
import { SAMPLE_PLACES } from '@/features/places/data';

/** 장소 탐색 — 검색창 + 카테고리 6개. 지금은 오사카 샘플만, 장소 API 연결은 Phase 3 */
export default function PlaceSearch() {
  const params = useLocalSearchParams<{ cat?: CategoryKey }>();
  const [cat, setCat] = useState<CategoryKey | 'all'>(params.cat ?? 'all');
  const [q, setQ] = useState('');
  const list = SAMPLE_PLACES.filter((p) => (cat === 'all' || p.category === cat) && (!q.trim() || p.name.includes(q.trim()) || p.area.includes(q.trim())));
  return (
    <Screen edges={['bottom']}>
      <TextInput value={q} onChangeText={setQ} placeholder="오사카에서 장소 검색" style={s.input} accessibilityLabel="장소 검색" returnKeyType="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <Chip label="전체" selected={cat === 'all'} onPress={() => setCat('all')} />
        {CATEGORIES.map((c) => <Chip key={c.key} label={c.label} selected={cat === c.key} onPress={() => setCat(c.key)} />)}
      </ScrollView>
      <AppText v="caption" color={color.sub} style={{ marginBottom: space.sm }}>샘플 장소 · 일정에 담기는 Phase 2에서 연결돼요</AppText>
      {list.length ? (
        <View>{list.map((p) => <PlaceRow key={p.id} place={p} onPress={() => router.push(`/place/${p.id}`)} />)}</View>
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
