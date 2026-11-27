import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { HeartButton } from '@/components/HeartButton';
import { Screen } from '@/components/Screen';
import { categoryOf } from '@/constants/categories';
import { color, font, radius, space } from '@/constants/design';
import { GoogleAttribution } from '@/features/places/GoogleAttribution';
import { useResolvedPlaces } from '@/features/places/hooks';
import { fromRouteId, refKey } from '@/features/places/types';
import { useSavedFor, useToggleSave, useUpdateSaved } from '@/features/saved/hooks';
import { useCurrentTrip } from '@/features/trips/hooks';
import { sameRef } from '@/features/trips/itemRef';
import { useItineraryEdit } from '@/features/trips/itineraryHooks';
import { useAppStore } from '@/stores/appStore';

const today = () => new Date().toISOString().slice(0, 10);

/** 장소 상세 — 저장(하트)하면 내 메모·별점·다녀옴을 남길 수 있다 (사용자 기록은 내 DB에 영구 저장) */
export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ref = fromRouteId(decodeURIComponent(id ?? ''));
  const { byKey, loading } = useResolvedPlaces([ref]);
  const place = byKey.get(refKey(ref));
  const { trip } = useCurrentTrip();
  const dayNo = useAppStore((st) => st.selectedDay);
  const edit = useItineraryEdit(trip);
  const day = trip?.days.find((d) => d.dayNumber === dayNo) ?? trip?.days[0];
  const saved = useSavedFor(ref);
  const toggle = useToggleSave();
  const update = useUpdateSaved();
  const [memo, setMemo] = useState('');
  const [memoMsg, setMemoMsg] = useState('');
  useEffect(() => { setMemo(saved?.memo ?? ''); }, [saved?.id, saved?.memo]);

  if (!place) {
    return (
      <Screen>
        {loading ? <AppText color={color.sub}>장소 정보를 불러오는 중…</AppText>
          : <EmptyState title="장소를 찾을 수 없어요" description="목록으로 돌아가 다시 골라 주세요." />}
      </Screen>
    );
  }
  const c = categoryOf(place.category);
  const real = saved && !saved.id.startsWith('tmp-');
  const saveMemo = () => {
    if (!real) return;
    update.mutate({ id: saved.id, patch: { memo: memo.trim() } }, { onSuccess: () => setMemoMsg('메모를 저장했어요') });
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: place.name }} />
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <AppText v="caption" color={c.color} style={{ fontWeight: '700' }}>{c.label}{place.source === 'our' ? ' · 리노 추천' : ''}</AppText>
          <AppText v="title">{place.name}</AppText>
          <AppText v="body" color={color.sub}>{place.area}{place.note ? ` · ${place.note}` : ''}</AppText>
        </View>
        <HeartButton place={ref} name={place.name} size={26} />
      </View>
      {place.source === 'google' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <GoogleAttribution />
          {place.mapsUri ? (
            <Pressable onPress={() => Linking.openURL(place.mapsUri!)} accessibilityRole="link" hitSlop={8}>
              <AppText v="caption" color={color.action}>Google 지도에서 영업시간·후기 보기 ›</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={s.box}>
          <AppText v="bodyBold">확인 정보</AppText>
          <AppText v="caption" color={color.sub}>영업시간·입장료는 공식 출처로 확인한 뒤 확인일과 함께 표시돼요 (지금은 샘플)</AppText>
        </View>
      )}

      <View style={{ marginTop: space.lg }}>
        {!trip || !day ? (
          <Button label="여행을 먼저 만들어 주세요" onPress={() => router.push('/trip/new')} />
        ) : place.city && trip.city !== place.city ? (
          <Button label={`${trip.city} 여행에는 담을 수 없어요`} disabled />
        ) : day.items.some((i) => sameRef(i, ref)) ? (
          <Button label={`${day.dayNumber}일차에 담겨 있어요`} variant="secondary" disabled />
        ) : (
          <Button label={`${trip.city} ${day.dayNumber}일차에 담기`} onPress={() => edit.add(day.dayNumber, ref)} />
        )}
      </View>

      <View style={s.mine}>
        <AppText v="subtitle">내 기록</AppText>
        {!saved ? (
          <>
            <AppText v="caption" color={color.sub} style={{ marginTop: space.xs }}>저장하면 메모·별점·다녀온 날을 남길 수 있어요.</AppText>
            <Button label="이 장소 저장하기" variant="secondary" onPress={() => toggle.mutate({ ref, on: true })} style={{ marginTop: space.md }} />
          </>
        ) : (
          <>
            <AppText v="caption" style={s.label}>내 별점</AppText>
            <View style={s.wrap}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Chip key={n} label={'★'.repeat(n)} selected={saved.myRating === n}
                  onPress={() => real && update.mutate({ id: saved.id, patch: { myRating: saved.myRating === n ? null : n } })} />
              ))}
            </View>
            <AppText v="caption" style={s.label}>다녀왔나요?</AppText>
            <View style={s.wrap}>
              <Chip label={saved.visitedAt ? `다녀옴 · ${saved.visitedAt}` : '아직 안 가 봤어요'} selected={!!saved.visitedAt}
                onPress={() => real && update.mutate({ id: saved.id, patch: { visitedAt: saved.visitedAt ? null : today() } })} />
            </View>
            <AppText v="caption" style={s.label}>메모</AppText>
            <TextInput value={memo} onChangeText={(t) => { setMemo(t); setMemoMsg(''); }} multiline maxLength={1000}
              placeholder="예) 웨이팅 30분, 2층 창가 자리 추천" style={s.memo} accessibilityLabel="메모" textAlignVertical="top" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm }}>
              <Button label="메모 저장" onPress={saveMemo} disabled={!real || memo.trim() === (saved.memo ?? '')} loading={update.isPending} />
              {memoMsg ? <AppText v="caption" color={color.action} accessibilityLiveRegion="polite">{memoMsg}</AppText> : null}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  box: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginTop: space.lg },
  mine: { marginTop: space.xxl, borderTopWidth: 1, borderTopColor: color.line, paddingTop: space.xl },
  label: { fontWeight: '700', marginTop: space.lg, marginBottom: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  memo: { ...font.body, fontSize: 16, minHeight: 96, borderRadius: radius.md, backgroundColor: color.surface, padding: space.md, color: color.ink },
});
