import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Tag } from '@/components/Badges';
import { Button } from '@/components/Button';
import { DayTabs } from '@/components/DayTabs';
import { EmptyState } from '@/components/EmptyState';
import { MapView } from '@/components/MapView';
import { Screen } from '@/components/Screen';
import { categoryOf } from '@/constants/categories';
import { color, font, radius, space } from '@/constants/design';
import { GoogleAttribution } from '@/features/places/GoogleAttribution';
import { useResolvedPlaces } from '@/features/places/hooks';
import { refKey, type ResolvedPlace } from '@/features/places/types';
import { avgKm, fmtKm } from '@/features/stay/distance';
import { useStayEdit, useStays } from '@/features/stay/hooks';
import type { StayCandidate } from '@/features/stay/types';
import { cityCenter } from '@/features/trips/cities';
import { useCurrentTrip } from '@/features/trips/hooks';
import { itemRef } from '@/features/trips/itemRef';
import type { Trip } from '@/features/trips/types';
import type { MapPin } from '@/lib/maps';
import { useAppStore } from '@/stores/appStore';

const LETTERS = 'ABCDEFGHIJ';
const pt = (p?: ResolvedPlace) => (p && p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null);

/**
 * 숙소 후보 비교 (설계서 Phase 3: "숙소 후보를 위치·메모로 비교할 수 있다")
 * 후보를 모아 지도에서 그날 동선과 함께 보고, 일차별 평균 직선 거리·가격 메모·메모로 비교한 뒤 하나를 고정한다.
 */
export default function StayCompare() {
  const { trip } = useCurrentTrip();
  const { data: cands, isLoading } = useStays(trip?.id);
  const edit = useStayEdit(trip?.id);
  const dayNo = useAppStore((s) => s.selectedDay);
  const allRefs = [...(cands ?? []), ...(trip?.days.flatMap((d) => d.items.map(itemRef)) ?? [])];
  const { byKey } = useResolvedPlaces(allRefs);

  if (!trip) {
    return <Screen><EmptyState title="여행을 먼저 만들어 주세요" description="여행이 있어야 숙소 후보를 모아 비교할 수 있어요." actionLabel="여행 만들기" onAction={() => router.push('/trip/new')} /></Screen>;
  }
  const dayPts = (n: number) => (trip.days.find((d) => d.dayNumber === n)?.items ?? []).map((i) => pt(byKey.get(refKey(itemRef(i))))).filter((x): x is { lat: number; lng: number } => !!x);
  const firstDay = 1, lastDay = trip.days.length;
  const scored = (cands ?? []).map((c, idx) => {
    const p = byKey.get(refKey(c));
    const at = pt(p);
    const per = trip.days.map((d) => (at ? avgKm(at, dayPts(d.dayNumber)) : null));
    const vals = per.filter((v): v is number => v != null);
    return { c, p, idx, per, overall: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });
  const best = scored.filter((x) => x.overall != null).sort((a, b) => a.overall! - b.overall!)[0];

  const day = trip.days.find((d) => d.dayNumber === dayNo) ?? trip.days[0];
  const pins: MapPin[] = [
    ...day.items.flatMap((i, n) => {
      const p = byKey.get(refKey(itemRef(i)));
      return p && p.lat != null && p.lng != null ? [{ id: `d-${p.key}-${n}`, order: n + 1, lat: p.lat, lng: p.lng, label: p.name, color: categoryOf(p.category).color }] : [];
    }),
    ...scored.flatMap(({ c, p, idx }) => (p && p.lat != null && p.lng != null
      ? [{ id: `s-${p.key}`, order: 0, lat: p.lat, lng: p.lng, label: p.name, badge: LETTERS[idx], color: isChosen(trip, c) ? color.brand : color.ink }] : [])),
  ];

  return (
    <Screen edges={['bottom']}>
      <View style={s.head}>
        <AppText v="body" color={color.sub} style={{ flex: 1 }}>{trip.city} 여행 · 후보 {cands?.length ?? 0}곳</AppText>
        <Button label="+ 후보 추가" onPress={() => router.push({ pathname: '/place/search', params: { pick: 'stay', cat: 'stay' } })} style={{ minHeight: 40 }} />
      </View>
      {isLoading ? <AppText color={color.sub}>불러오는 중…</AppText> : !cands?.length ? (
        <EmptyState title="숙소 후보를 모아 비교해요" description="마음에 드는 숙소를 2~3곳 담으면, 일정 장소들과의 거리와 내 메모로 비교할 수 있어요."
          actionLabel="숙소 찾기" onAction={() => router.push({ pathname: '/place/search', params: { pick: 'stay', cat: 'stay' } })} />
      ) : (
        <>
          <DayTabs trip={trip} withDate={false} />
          <MapView pins={pins} height={280} emptyCenter={cityCenter(trip.city)} />
          <AppText v="caption" color={color.sub} style={{ marginTop: space.xs }}>
            검은 네모 A·B·C = 숙소 후보, 빨간 네모 = 정한 숙소, 숫자 = {day.dayNumber}일차 일정 · 거리는 직선 거리예요
          </AppText>
          {cands.some((c) => c.source === 'google') ? <GoogleAttribution /> : null}
          <View style={{ marginTop: space.lg, gap: space.md }}>
            {scored.map(({ c, p, idx, per, overall }) => (
              <CandidateCard key={c.candId} c={c} p={p} letter={LETTERS[idx]} chosen={isChosen(trip, c)} best={best?.c.candId === c.candId && scored.length > 1}
                distances={[
                  { label: '1일차', v: per[firstDay - 1] },
                  ...(lastDay > 1 ? [{ label: `${lastDay}일차`, v: per[lastDay - 1] }] : []),
                  { label: '전체 평균', v: overall },
                ]}
                onChoose={() => edit.choose.mutate(isChosen(trip, c) ? null : { source: c.source, id: c.id })}
                onRemove={() => edit.remove.mutate(c)}
                onSave={(patch) => edit.update.mutate({ candId: c.candId, patch })} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const isChosen = (trip: Trip, c: StayCandidate) => trip.stay?.source === c.source && trip.stay.id === c.id;

function CandidateCard({ c, p, letter, chosen, best, distances, onChoose, onRemove, onSave }: {
  c: StayCandidate; p?: ResolvedPlace; letter: string; chosen: boolean; best: boolean;
  distances: { label: string; v: number | null }[];
  onChoose: () => void; onRemove: () => void; onSave: (patch: { memo?: string; priceNote?: string }) => void;
}) {
  const [price, setPrice] = useState(c.priceNote);
  const [memo, setMemo] = useState(c.memo);
  useEffect(() => { setPrice(c.priceNote); setMemo(c.memo); }, [c.priceNote, c.memo]);
  return (
    <View style={[s.card, chosen && s.cardChosen]}>
      <View style={s.cardHead}>
        <View style={[s.letter, { backgroundColor: chosen ? color.brand : color.ink }]}><AppText v="caption" color={color.white} style={{ fontWeight: '800' }}>{letter}</AppText></View>
        <View style={{ flex: 1 }}>
          <AppText v="bodyBold" numberOfLines={1}>{p?.name ?? '불러오는 중…'}</AppText>
          <AppText v="caption" color={color.sub} numberOfLines={1}>{p?.area ?? ''}</AppText>
        </View>
        {chosen ? <Tag label="정한 숙소" /> : best ? <Tag label="일정과 가장 가까움" tone="rating" /> : null}
      </View>
      <View style={s.dist}>
        {distances.map((d) => (
          <View key={d.label} style={{ flex: 1 }}>
            <AppText v="caption" color={color.sub}>{d.label}</AppText>
            <AppText v="bodyBold">{d.v == null ? '–' : fmtKm(d.v)}</AppText>
          </View>
        ))}
      </View>
      <TextInput value={price} onChangeText={setPrice} onEndEditing={() => price !== c.priceNote && onSave({ priceNote: price })} onBlur={() => price !== c.priceNote && onSave({ priceNote: price })}
        placeholder="가격 메모 (예: 1박 12만원, 조식 포함)" maxLength={60} style={s.input} accessibilityLabel={`${letter} 가격 메모`} />
      <TextInput value={memo} onChangeText={setMemo} onEndEditing={() => memo !== c.memo && onSave({ memo })} onBlur={() => memo !== c.memo && onSave({ memo })}
        placeholder="메모 (예: 역 도보 3분, 방이 좁다는 후기)" maxLength={500} multiline style={[s.input, { minHeight: 64 }]} textAlignVertical="top" accessibilityLabel={`${letter} 메모`} />
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        <Button label={chosen ? '선택 해제' : '이 숙소로 정하기'} variant={chosen ? 'secondary' : 'primary'} onPress={onChoose} style={{ flex: 1 }} />
        <Button label="후보에서 빼기" variant="ghost" onPress={onRemove} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg },
  cardChosen: { backgroundColor: color.brandSoft, borderWidth: 1, borderColor: color.brand },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  letter: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  dist: { flexDirection: 'row', gap: space.sm, marginVertical: space.md, backgroundColor: color.bg, borderRadius: radius.md, padding: space.md },
  input: { ...font.body, fontSize: 16, minHeight: 44, borderRadius: radius.md, backgroundColor: color.bg, paddingHorizontal: space.md, paddingVertical: space.sm, color: color.ink, marginTop: space.sm },
});
