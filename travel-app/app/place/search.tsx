import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AddTarget } from '@/components/AddTarget';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PlaceRow } from '@/components/Cards';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { HeartButton } from '@/components/HeartButton';
import { Screen } from '@/components/Screen';
import { CATEGORIES, type CategoryKey } from '@/constants/categories';
import { color, font, radius, space } from '@/constants/design';
import { SAMPLE_PLACES } from '@/features/places/data';
import { GoogleAttribution } from '@/features/places/GoogleAttribution';
import { GoogleUnavailableError } from '@/features/places/google';
import { ourToResolved, useGoogleSearch } from '@/features/places/hooks';
import { josa } from '@/features/places/josa';
import { routeId, type ResolvedPlace } from '@/features/places/types';
import { cityCenter } from '@/features/trips/cities';
import { useCurrentTrip } from '@/features/trips/hooks';
import { sameRef } from '@/features/trips/itemRef';
import { useItineraryEdit } from '@/features/trips/itineraryHooks';
import { useStayEdit, useStays } from '@/features/stay/hooks';
import { useAppStore } from '@/stores/appStore';

const UNAVAILABLE: Record<GoogleUnavailableError['reason'], string> = {
  demo: '데모 모드라 Google 검색은 꺼져 있어요. 아래 추천 장소로 흐름을 확인해 보세요.',
  not_configured: 'Google 검색 키가 아직 설정되지 않았어요. 추천 장소만 보여 드려요.',
  daily_limit: '오늘 검색 횟수를 다 썼어요. 내일 다시 검색할 수 있어요.',
  error: 'Google 검색에 실패했어요. 잠시 후 다시 시도해 주세요.',
};

/**
 * 장소 탐색 — 위: 리노 추천(우리가 확인한 장소) / 아래: Google 검색 결과.
 * Google 검색은 검색 버튼·카테고리를 눌렀을 때만 부른다 (글자마다 부르지 않아 비용 절약).
 */
export default function PlaceSearch() {
  const params = useLocalSearchParams<{ cat?: CategoryKey; pick?: 'stay' }>();
  const pickStay = params.pick === 'stay';
  const [cat, setCat] = useState<CategoryKey | 'all'>(params.cat ?? 'all');
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState<{ query: string; category?: CategoryKey } | null>(params.cat ? { query: '', category: params.cat } : null);
  const [notice, setNotice] = useState('');
  const { trip } = useCurrentTrip();
  const dayNo = useAppStore((s) => s.selectedDay);
  const edit = useItineraryEdit(trip);
  const { data: stays } = useStays(pickStay ? trip?.id : undefined);
  const stayEdit = useStayEdit(trip?.id);
  const city = trip?.city ?? '오사카';
  const center = cityCenter(city);
  const day = trip?.days.find((d) => d.dayNumber === dayNo) ?? trip?.days[0];
  const term = q.trim();

  const ours = SAMPLE_PLACES.filter((p) => p.city === city && (cat === 'all' || p.category === cat) && (!term || p.name.includes(term) || p.area.includes(term))).map(ourToResolved);
  const google = useGoogleSearch(submitted ? { ...submitted, center: { lat: center.lat, lng: center.lng }, cityName: city } : null);
  const gList = (google.data ?? []).filter((g) => cat === 'all' || g.category === cat || submitted?.category === cat);
  const unavailable = google.error instanceof GoogleUnavailableError ? google.error.reason : google.error ? 'error' : null;

  const search = (category = cat) => {
    if (!term && category === 'all') return;
    setSubmitted({ query: term, category: category === 'all' ? undefined : category });
  };
  const pickCat = (c: CategoryKey | 'all') => { setCat(c); if (c !== 'all') search(c); };

  const add = (p: ResolvedPlace) => {
    if (!trip || !day) return router.push('/trip/new');
    if (day.items.some((i) => sameRef(i, p))) return setNotice(`${josa(p.name, '은', '는')} 이미 ${day.dayNumber}일차에 있어요`);
    edit.add(day.dayNumber, p);
    setNotice(`${day.dayNumber}일차에 ${josa(p.name, '을', '를')} 담았어요`);
  };
  const addStay = (p: ResolvedPlace) => {
    if (stays?.some((c) => c.source === p.source && c.id === p.id)) return setNotice(`${josa(p.name, '은', '는')} 이미 후보에 있어요`);
    stayEdit.add.mutate(p);
    setNotice(`숙소 후보에 ${josa(p.name, '을', '를')} 담았어요`);
  };
  const row = (p: ResolvedPlace) => {
    const added = pickStay ? !!stays?.some((c) => c.source === p.source && c.id === p.id) : !!day?.items.some((i) => sameRef(i, p));
    return (
      <PlaceRow key={p.key} place={p} onPress={() => router.push(`/place/${encodeURIComponent(routeId(p))}`)}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <HeartButton place={p} name={p.name} />
            {trip && pickStay ? <Chip label={added ? '후보' : '후보 추가'} selected={added} onPress={() => addStay(p)} />
              : trip ? <Chip label={added ? '담김' : '담기'} selected={added} onPress={() => add(p)} /> : null}
          </View>
        } />
    );
  };

  return (
    <Screen edges={['bottom']}>
      {pickStay && trip ? (
        <View style={s.pick}>
          <AppText v="bodyBold">{trip.city} 여행 숙소 후보 고르기</AppText>
          <AppText v="caption" color={color.sub}>후보에 담은 숙소는 '숙소 후보 비교'에서 거리·메모로 비교해요.</AppText>
          <Button label="비교하러 가기" variant="secondary" onPress={() => router.dismissTo('/trip/stay')} style={{ marginTop: space.sm, minHeight: 40 }} />
        </View>
      ) : <AddTarget trip={trip} />}
      <View style={s.searchRow}>
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => search()} placeholder={`${city}에서 장소 검색`} style={s.input}
          accessibilityLabel="장소 검색" returnKeyType="search" />
        <Button label="검색" onPress={() => search()} disabled={!term && cat === 'all'} style={{ minHeight: 48 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <Chip label="전체" selected={cat === 'all'} onPress={() => pickCat('all')} />
        {CATEGORIES.map((c) => <Chip key={c.key} label={c.label} selected={cat === c.key} onPress={() => pickCat(c.key)} />)}
      </ScrollView>
      {notice ? <AppText v="caption" color={color.action} style={{ marginBottom: space.sm, fontWeight: '700' }} accessibilityLiveRegion="polite">{notice}</AppText> : null}

      {ours.length ? (
        <View style={{ marginBottom: space.lg }}>
          <AppText v="bodyBold" style={{ marginBottom: space.sm }}>리노 추천 <AppText v="caption" color={color.sub}>· 직접 확인한 장소 (지금은 샘플)</AppText></AppText>
          {ours.map(row)}
        </View>
      ) : null}

      <AppText v="bodyBold" style={{ marginBottom: space.sm }}>검색 결과</AppText>
      {!submitted ? (
        <AppText v="caption" color={color.sub}>가게 이름이나 "도톤보리 라멘"처럼 검색하거나, 카테고리를 눌러 보세요.</AppText>
      ) : google.isFetching ? (
        <AppText v="caption" color={color.sub}>찾는 중…</AppText>
      ) : unavailable ? (
        <AppText v="caption" color={color.sub}>{UNAVAILABLE[unavailable]}</AppText>
      ) : gList.length ? (
        <View>
          {gList.map(row)}
          <GoogleAttribution />
        </View>
      ) : (
        <EmptyState title="찾는 장소가 없어요" description="검색어를 바꾸거나 카테고리를 전체로 돌려 보세요." />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: space.sm },
  input: { ...font.body, flex: 1, fontSize: 16, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.lg, color: color.ink },
  chips: { gap: space.sm, paddingVertical: space.md },
  pick: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: space.md },
});
