import { Pressable, StyleSheet, View } from 'react-native';
import { categoryOf } from '@/constants/categories';
import { color, radius, space } from '@/constants/design';
import type { Guidebook } from '@/features/guidebooks/data';
import type { Place } from '@/features/places/data';
import { nightsDays, shortDate } from '@/features/trips/dates';
import type { Trip } from '@/features/trips/types';
import { AppText } from './AppText';
import { LockBadge, Tag } from './Badges';
import { FilledIcon, Icon } from './Icon';
import { Suitcase } from './Suitcase';

/** 여행 카드 — 그림자·테두리 없이 회색 면으로만 */
export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.trip, pressed && s.pressed]}>
      <View style={{ flex: 1 }}>
        <AppText v="bodyBold">{trip.city} {nightsDays(trip.days.length)}</AppText>
        <AppText v="caption" color={color.sub}>{shortDate(trip.startDate)} – {shortDate(trip.endDate)} · {trip.companion} · {trip.style}</AppText>
      </View>
      <Icon name="chevron" size={18} color={color.faint} />
    </Pressable>
  );
}

/**
 * 가이드북 카드 — 홈 '코스' 그리드와 스토어 공통.
 * 썸네일(16:9, 모서리 12) 위에 제목, 아래에 설명·메타. 카드에는 테두리·그림자 없음.
 */
export function GuidebookCard({ book, purchased, onPress }: { book: Guidebook; purchased?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${book.title} 가이드북`} style={({ pressed }) => [s.book, pressed && { opacity: 0.85 }]}>
      <View style={[s.thumb, { backgroundColor: color.brand }]}>
        <View style={s.thumbArt}><Suitcase width={96} height={110} /></View>
        <View style={s.thumbTag}><Tag label={`${book.previewDays}일차 무료`} tone="outline" /></View>
        <AppText v="subtitle" color={color.white} style={s.thumbTitle}>{book.title}{'\n'}가이드북</AppText>
      </View>
      <AppText v="body" style={{ marginTop: space.sm }}>{book.theme}</AppText>
      <AppText v="caption" color={color.sub}>{book.city} · {book.days}일 코스{book.isSample ? ' · 샘플' : ''}</AppText>
      <View style={s.bookFoot}>
        <AppText v="bodyBold">가격 미정</AppText>
        {purchased ? <Tag label="구매함" tone="outline" /> : <LockBadge />}
      </View>
    </Pressable>
  );
}

/** 준비 중 카드 — 다음 도시 자리 */
export function ComingSoonCard({ city }: { city: string }) {
  return (
    <View style={s.book} accessibilityLabel={`${city} 가이드북 준비 중`}>
      <View style={[s.thumb, { backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }]}>
        <AppText v="subtitle" color={color.faint}>{city}</AppText>
      </View>
      <AppText v="body" style={{ marginTop: space.sm }}>다음 도시 가이드북</AppText>
      <AppText v="caption" color={color.sub}>준비 중이에요</AppText>
    </View>
  );
}

export function PlaceRow({ place, order, onPress, right }: { place: Place; order?: number; onPress?: () => void; right?: React.ReactNode }) {
  const c = categoryOf(place.category);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.place, pressed && s.pressed]}>
      {order ? (
        <View style={[s.num, { backgroundColor: c.color }]}><AppText v="caption" color={color.white} style={{ fontWeight: '700' }}>{order}</AppText></View>
      ) : (
        <View style={[s.num, { backgroundColor: color.bg }]}><FilledIcon d={c.icon} color={c.color} /></View>
      )}
      <View style={{ flex: 1 }}>
        <AppText v="bodyBold">{place.name}</AppText>
        <AppText v="caption" color={color.sub}><AppText v="caption" color={c.color} style={{ fontWeight: '700' }}>{c.label}</AppText> · {place.area}</AppText>
      </View>
      {right}
    </Pressable>
  );
}

const s = StyleSheet.create({
  trip: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: space.sm },
  pressed: { opacity: 0.8 },
  book: { flex: 1, minWidth: 0 },
  thumb: { aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden', position: 'relative' },
  thumbArt: { position: 'absolute', right: -6, top: 2 },
  thumbTag: { position: 'absolute', left: 10, top: 10 },
  thumbTitle: { position: 'absolute', left: 12, bottom: 10, fontWeight: '800' },
  bookFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },
  place: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.sm },
  num: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
