import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PlaceRow } from '@/components/Cards';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { HeartButton } from '@/components/HeartButton';
import { Screen } from '@/components/Screen';
import { CATEGORIES, type CategoryKey } from '@/constants/categories';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { color, font, radius, space } from '@/constants/design';
import { useListEdit, useLists } from '@/features/lists/hooks';
import { newItemId } from '@/features/trips/itinerary';
import { GoogleAttribution } from '@/features/places/GoogleAttribution';
import { useResolvedPlaces } from '@/features/places/hooks';
import { refKey, routeId, type PlaceRef } from '@/features/places/types';
import { useSaved } from '@/features/saved/hooks';

/** 저장한 장소 · 내 모음 — 하트 누른 곳, 내가 남긴 메모·별점, 직접 만든 모음 */
export default function SavedScreen() {
  const [tab, setTab] = useState<'saved' | 'lists'>('saved');
  return (
    <Screen edges={['bottom']}>
      <View style={s.seg} accessibilityRole="tablist">
        {([['saved', '저장한 장소'], ['lists', '내 모음']] as const).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={[s.segBtn, tab === k && s.segOn]}>
            <AppText v="bodyBold" color={tab === k ? color.ink : color.sub}>{l}</AppText>
          </Pressable>
        ))}
      </View>
      {tab === 'saved' ? <SavedPlaces /> : <MyLists />}
    </Screen>
  );
}

function MyLists() {
  const { data: lists, isLoading } = useLists();
  const edit = useListEdit();
  const [title, setTitle] = useState('');
  const create = () => { if (title.trim()) { edit.create.mutate({ id: newItemId(), title: title.trim() }); setTitle(''); } };
  return (
    <View>
      <View style={s.newRow}>
        <TextInput value={title} onChangeText={setTitle} onSubmitEditing={create} placeholder="새 모음 이름 (예: 다음에 갈 카페)" maxLength={40} style={s.input} accessibilityLabel="새 모음 이름" />
        <Button label="만들기" onPress={create} disabled={!title.trim()} style={{ minHeight: 48 }} />
      </View>
      {isLoading ? <AppText color={color.sub}>불러오는 중…</AppText> : !lists?.length ? (
        <EmptyState title="아직 모음이 없어요" description="여행지별·주제별로 장소를 묶어 두세요. 장소 상세에서 '모음에 담기'로 넣을 수 있어요." />
      ) : lists.map((l) => (
        <Pressable key={l.id} onPress={() => router.push(`/lists/${l.id}`)} accessibilityRole="button" style={({ pressed }) => [s.listCard, pressed && { opacity: 0.85 }]}>
          <View style={{ flex: 1 }}>
            <AppText v="bodyBold" numberOfLines={1}>{l.title}</AppText>
            <AppText v="caption" color={color.sub}>{l.items.length}곳</AppText>
          </View>
          <Icon name="chevron" size={18} color={color.faint} />
        </Pressable>
      ))}
    </View>
  );
}

function SavedPlaces() {
  const { data: saved, isLoading } = useSaved();
  const [cat, setCat] = useState<CategoryKey | 'all'>('all');
  const refs: PlaceRef[] = (saved ?? []).map((x) => ({ source: x.source, id: x.ref }));
  const { byKey, loading } = useResolvedPlaces(refs);
  const rows = (saved ?? []).map((x) => ({ s: x, p: byKey.get(refKey({ source: x.source, id: x.ref })) }))
    .filter((r) => cat === 'all' || r.p?.category === cat);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}>
        <Chip label="전체" selected={cat === 'all'} onPress={() => setCat('all')} />
        {CATEGORIES.map((c) => <Chip key={c.key} label={c.label} selected={cat === c.key} onPress={() => setCat(c.key)} />)}
      </ScrollView>
      {isLoading ? <AppText color={color.sub}>불러오는 중…</AppText> : !saved?.length ? (
        <EmptyState title="아직 저장한 장소가 없어요" description="장소 탐색에서 하트를 누르면 여기 모여요. 메모와 별점도 남길 수 있어요."
          actionLabel="장소 둘러보기" onAction={() => router.push('/place/search')} />
      ) : (
        <View>
          {rows.map(({ s: sv, p }) => (
            <View key={sv.id}>
              {p ? (
                <PlaceRow place={p} onPress={() => router.push(`/place/${encodeURIComponent(routeId(p))}`)} right={<HeartButton place={p} name={p.name} />} />
              ) : (
                <AppText v="caption" color={color.sub} style={{ marginBottom: space.sm }}>{loading ? '장소 정보를 불러오는 중…' : '장소 정보를 불러오지 못했어요'}</AppText>
              )}
              {sv.memo || sv.myRating || sv.visitedAt ? (
                <AppText v="caption" color={color.sub} numberOfLines={2} style={{ marginTop: -space.xs, marginBottom: space.md, paddingHorizontal: space.md }}>
                  {[sv.myRating ? '★'.repeat(sv.myRating) : '', sv.visitedAt ? `다녀옴 ${sv.visitedAt}` : '', sv.memo].filter(Boolean).join(' · ')}
                </AppText>
              ) : null}
            </View>
          ))}
          {saved.some((x) => x.source === 'google') ? <GoogleAttribution /> : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: color.surface, borderRadius: radius.lg, padding: 4, marginBottom: space.lg },
  segBtn: { flex: 1, minHeight: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: color.bg },
  newRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  input: { ...font.body, flex: 1, fontSize: 16, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.md, color: color.ink },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: space.sm },
});
