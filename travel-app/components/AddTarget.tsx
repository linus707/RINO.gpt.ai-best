import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import type { Trip } from '@/features/trips/types';
import { useAppStore } from '@/stores/appStore';
import { AppText } from './AppText';
import { Button } from './Button';
import { DayTabs } from './DayTabs';

/** 장소를 어디에 담을지 — 지금 보고 있는 여행과 일차. 일차는 여기서 바로 바꿀 수 있다 */
export function AddTarget({ trip }: { trip: Trip | null }) {
  const day = useAppStore((s) => s.selectedDay);
  if (!trip) {
    return (
      <View style={s.box}>
        <AppText v="bodyBold">담을 여행이 없어요</AppText>
        <AppText v="caption" color={color.sub}>여행을 먼저 만들면 고른 장소를 일차별로 담을 수 있어요.</AppText>
        <Button label="여행 만들기" onPress={() => router.push('/trip/new')} style={{ marginTop: space.md }} />
      </View>
    );
  }
  return (
    <View style={s.box}>
      <AppText v="caption" color={color.sub}>담을 곳</AppText>
      <AppText v="bodyBold" style={{ marginBottom: space.sm }}>{trip.city} · {day}일차</AppText>
      <DayTabs trip={trip} withDate={false} />
    </View>
  );
}

const s = StyleSheet.create({ box: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, paddingBottom: space.xs, marginBottom: space.md } });
