import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PlaceRow } from '@/components/Cards';
import { DayTabs } from '@/components/DayTabs';
import { EmptyState } from '@/components/EmptyState';
import { MapView } from '@/components/MapView';
import { Screen } from '@/components/Screen';
import { categoryOf } from '@/constants/categories';
import { color, radius, space } from '@/constants/design';
import { GoogleAttribution } from '@/features/places/GoogleAttribution';
import { useResolvedPlaces } from '@/features/places/hooks';
import { refKey, routeId, type ResolvedPlace } from '@/features/places/types';
import { cityCenter } from '@/features/trips/cities';
import { useCurrentTrip } from '@/features/trips/hooks';
import { itemRef } from '@/features/trips/itemRef';
import type { MapPin } from '@/lib/maps';
import { useAppStore } from '@/stores/appStore';

/** 지도 동선 — 일정 순서대로 번호 핀과 선. 날짜를 바꾸면 그날 동선만 보인다 */
export default function MapTab() {
  const { trip } = useCurrentTrip();
  const dayNo = useAppStore((s) => s.selectedDay);
  const day = trip?.days.find((d) => d.dayNumber === dayNo) ?? trip?.days[0];
  const refs = (day?.items ?? []).map(itemRef);
  const stayRefs = trip?.stay ? [trip.stay] : [];
  const { byKey, loading } = useResolvedPlaces([...refs, ...stayRefs]);
  if (!trip || !day) {
    return (
      <Screen title="지도 동선">
        <EmptyState title="동선을 그릴 여행이 없어요" description="여행을 만들고 장소를 담으면 일정 순서대로 핀과 선이 그려져요." actionLabel="여행 만들기" onAction={() => router.push('/trip/new')} />
      </Screen>
    );
  }
  const places = refs.map((r) => byKey.get(refKey(r))).filter((p): p is ResolvedPlace => !!p);
  const pins: MapPin[] = places.flatMap((p, i) => (p.lat != null && p.lng != null
    ? [{ id: p.key, order: i + 1, lat: p.lat, lng: p.lng, label: p.name, color: categoryOf(p.category).color }] : []));
  const stay = trip.stay ? byKey.get(refKey(trip.stay)) : undefined;
  if (stay && stay.lat != null && stay.lng != null) pins.push({ id: stay.key, order: 0, lat: stay.lat, lng: stay.lng, label: `숙소 ${stay.name}`, badge: '숙', color: color.brand });
  const open = (p: ResolvedPlace) => router.push(`/place/${encodeURIComponent(routeId(p))}`);
  const center = cityCenter(trip.city);

  return (
    <Screen title="지도 동선">
      <DayTabs trip={trip} withDate={false} />
      <MapView pins={pins} emptyCenter={center} onPinPress={(key) => { const p = places.find((x) => x.key === key) ?? (stay?.key === key ? stay : undefined); if (p) open(p); }} />
      {places.some((p) => p.source === 'google') ? <GoogleAttribution /> : null}
      {loading && places.length < refs.length ? <AppText v="caption" color={color.sub}>장소 정보를 불러오는 중…</AppText> : null}
      {places.length ? (
        <View style={{ marginTop: space.lg }}>
          <AppText v="subtitle" style={{ marginBottom: space.sm }}>{day.dayNumber}일차 이동 순서</AppText>
          {places.map((p, i) => (
            <View key={`${p.key}-${i}`}>
              <PlaceRow place={p} order={i + 1} onPress={() => open(p)} />
              {i < places.length - 1 ? (
                <View style={s.leg} accessibilityLabel={`${p.name}에서 ${places[i + 1].name}로 이동`}>
                  <View style={s.legLine} />
                  <AppText v="caption" color={color.sub}>다음 장소로 이동 · 이동 시간은 추후 표시</AppText>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: space.lg }}>
          <EmptyState title={`${day.dayNumber}일차에 담은 장소가 없어요`} description="장소를 담으면 그 순서대로 번호 핀과 선이 그려져요." actionLabel="장소 추가" onAction={() => router.push('/place/search')} />
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  leg: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg + 2, marginTop: -space.xs, marginBottom: space.xs, height: 24 },
  legLine: { width: 2, height: 24, borderRadius: radius.sm, backgroundColor: color.action, opacity: 0.4 },
});
