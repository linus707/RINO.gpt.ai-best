import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DayTabs } from '@/components/DayTabs';
import { DraggableList } from '@/components/DraggableList';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { categoryOf } from '@/constants/categories';
import { color, radius, space } from '@/constants/design';
import { GoogleAttribution } from '@/features/places/GoogleAttribution';
import { useResolvedPlaces } from '@/features/places/hooks';
import { refKey, routeId } from '@/features/places/types';
import { nightsDays } from '@/features/trips/dates';
import { useCurrentTrip } from '@/features/trips/hooks';
import { itemRef } from '@/features/trips/itemRef';
import { useItineraryEdit } from '@/features/trips/itineraryHooks';
import { useAppStore } from '@/stores/appStore';

const ROW = 64;
const GAP = 8;

const move = <T,>(arr: T[], from: number, to: number) => {
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
};

/**
 * 일자별 일정 — 날짜 탭 + 장소 목록. 손잡이를 끌어 순서를 바꾸면 지도 동선도 즉시 바뀐다.
 * (화면 읽기 프로그램에서는 '위로/아래로 이동' 동작으로 같은 일을 할 수 있다)
 */
export default function Itinerary() {
  const { trip, isLoading } = useCurrentTrip();
  const dayNo = useAppStore((s) => s.selectedDay);
  const edit = useItineraryEdit(trip);
  const [dragging, setDragging] = useState(false);
  const day0 = trip?.days.find((d) => d.dayNumber === dayNo) ?? trip?.days[0];
  const { byKey } = useResolvedPlaces((day0?.items ?? []).map(itemRef));

  if (isLoading) return <Screen title="일정"><AppText color={color.sub}>불러오는 중…</AppText></Screen>;
  if (!trip) {
    return (
      <Screen title="일정">
        <EmptyState title="열려 있는 여행이 없어요" description="홈에서 여행을 고르거나 새로 만들어 주세요." actionLabel="여행 만들기" onAction={() => router.push('/trip/new')} />
      </Screen>
    );
  }
  const day = trip.days.find((d) => d.dayNumber === dayNo) ?? trip.days[0];
  const ids = day.items.map((i) => i.id);
  const reorder = (from: number, to: number) => edit.reorder(day.dayNumber, move(ids, from, to));

  return (
    <Screen title={`${trip.city} ${nightsDays(trip.days.length)}`} scrollEnabled={!dragging}>
      <DayTabs trip={trip} />
      {day.items.length ? (
        <>
          <AppText v="caption" color={color.sub} style={{ marginBottom: space.sm }}>손잡이를 끌어 순서를 바꿔요 · 순서가 곧 지도 동선이에요</AppText>
          <DraggableList
            items={day.items}
            keyOf={(i) => i.id}
            rowHeight={ROW + GAP}
            onReorder={reorder}
            onDragChange={setDragging}
            renderRow={(item, i, handle, isDragged) => {
              const p = byKey.get(refKey(itemRef(item)));
              const c = p ? categoryOf(p.category) : null;
              return (
                <View
                  style={[s.row, isDragged && s.rowDragged]}
                  accessible
                  accessibilityLabel={`${i + 1}번 ${p?.name ?? '장소'}`}
                  accessibilityActions={[{ name: 'moveUp', label: '위로 이동' }, { name: 'moveDown', label: '아래로 이동' }, { name: 'delete', label: '삭제' }]}
                  onAccessibilityAction={(e) => {
                    if (e.nativeEvent.actionName === 'moveUp' && i > 0) reorder(i, i - 1);
                    if (e.nativeEvent.actionName === 'moveDown' && i < ids.length - 1) reorder(i, i + 1);
                    if (e.nativeEvent.actionName === 'delete') edit.remove(day.dayNumber, item.id);
                  }}
                >
                  <View {...handle} style={[handle.style, s.handle]} accessibilityLabel="끌어서 순서 바꾸기" testID={`drag-${i}`}>
                    <Icon name="grip" size={20} color={color.faint} strokeWidth={3} />
                  </View>
                  <View style={[s.num, { backgroundColor: c?.color ?? color.faint }]}>
                    <AppText v="caption" color={color.white} style={{ fontWeight: '700' }}>{i + 1}</AppText>
                  </View>
                  <Pressable style={{ flex: 1 }} onPress={() => p && router.push(`/place/${encodeURIComponent(routeId(p))}`)} accessibilityRole="link">
                    <AppText v="bodyBold" numberOfLines={1}>{p?.name ?? '불러오는 중…'}</AppText>
                    {c ? <AppText v="caption" numberOfLines={1} color={c.color} style={{ fontWeight: '700' }}>{c.label} <AppText v="caption" color={color.sub}>· {p!.area}</AppText></AppText> : null}
                  </Pressable>
                  <Pressable onPress={() => edit.remove(day.dayNumber, item.id)} accessibilityRole="button" accessibilityLabel={`${p?.name ?? '장소'} 빼기`} style={s.remove} hitSlop={6}>
                    <Icon name="close" size={18} color={color.sub} />
                  </Pressable>
                </View>
              );
            }}
          />
        </>
      ) : (
        <EmptyState title={`${day.dayNumber}일차가 비어 있어요`} description="장소 탐색에서 가 보고 싶은 곳을 담아 보세요. 정한 순서가 곧 지도 동선이 돼요." />
      )}
      {day.items.some((i) => i.source === 'google') ? <GoogleAttribution /> : null}
      {edit.error ? <AppText v="caption" color={color.danger}>저장하지 못해 되돌렸어요. 연결을 확인해 주세요.</AppText> : null}
      <View style={{ marginTop: space.md, flexDirection: 'row', gap: space.sm }}>
        <Button label="+ 장소 추가" onPress={() => router.push('/place/search')} style={{ flex: 1 }} />
        {day.items.length ? <Button label="지도로 보기" variant="secondary" onPress={() => router.push('/map')} style={{ flex: 1 }} /> : null}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.surface, borderRadius: radius.lg, paddingRight: space.sm },
  rowDragged: { backgroundColor: color.actionSoft, borderWidth: 1, borderColor: color.action },
  handle: { width: 40, height: ROW, alignItems: 'center', justifyContent: 'center' },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
