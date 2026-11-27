import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PlaceRow } from '@/components/Cards';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { HeartButton } from '@/components/HeartButton';
import { Screen } from '@/components/Screen';
import { CATEGORIES, type CategoryKey } from '@/constants/categories';
import { color, space } from '@/constants/design';
import { GoogleAttribution } from '@/features/places/GoogleAttribution';
import { useResolvedPlaces } from '@/features/places/hooks';
import { refKey, routeId, type PlaceRef } from '@/features/places/types';
import { useSaved } from '@/features/saved/hooks';

/** 저장한 장소 — 하트 누른 곳과 내가 남긴 메모·별점을 한곳에서 */
export default function SavedPlaces() {
  const { data: saved, isLoading } = useSaved();
  const [cat, setCat] = useState<CategoryKey | 'all'>('all');
  const refs: PlaceRef[] = (saved ?? []).map((s) => ({ source: s.source, id: s.ref }));
  const { byKey, loading } = useResolvedPlaces(refs);
  const rows = (saved ?? []).map((s) => ({ s, p: byKey.get(refKey({ source: s.source, id: s.ref })) }))
    .filter((r) => cat === 'all' || r.p?.category === cat);

  return (
    <Screen edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}>
        <Chip label="전체" selected={cat === 'all'} onPress={() => setCat('all')} />
        {CATEGORIES.map((c) => <Chip key={c.key} label={c.label} selected={cat === c.key} onPress={() => setCat(c.key)} />)}
      </ScrollView>
      {isLoading ? <AppText color={color.sub}>불러오는 중…</AppText> : !saved?.length ? (
        <EmptyState title="아직 저장한 장소가 없어요" description="장소 탐색에서 하트를 누르면 여기 모여요. 메모와 별점도 남길 수 있어요."
          actionLabel="장소 둘러보기" onAction={() => router.push('/place/search')} />
      ) : (
        <View>
          {rows.map(({ s, p }) => (
            <View key={s.id}>
              {p ? (
                <PlaceRow place={p} onPress={() => router.push(`/place/${encodeURIComponent(routeId(p))}`)} right={<HeartButton place={p} name={p.name} />} />
              ) : (
                <AppText v="caption" color={color.sub} style={{ marginBottom: space.sm }}>{loading ? '장소 정보를 불러오는 중…' : '장소 정보를 불러오지 못했어요'}</AppText>
              )}
              {s.memo || s.myRating || s.visitedAt ? (
                <AppText v="caption" color={color.sub} numberOfLines={2} style={{ marginTop: -space.xs, marginBottom: space.md, paddingHorizontal: space.md }}>
                  {[s.myRating ? '★'.repeat(s.myRating) : '', s.visitedAt ? `다녀옴 ${s.visitedAt}` : '', s.memo].filter(Boolean).join(' · ')}
                </AppText>
              ) : null}
            </View>
          ))}
          {saved.some((s) => s.source === 'google') ? <GoogleAttribution /> : null}
        </View>
      )}
    </Screen>
  );
}
