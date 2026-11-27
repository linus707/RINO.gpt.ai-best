import { StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import { useUsage } from '@/features/usage/hooks';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** 남은 무료 횟수 — 홈·여행 만들기·마이페이지 공통 */
export function UsageBadge() {
  const { data, isError } = useUsage();
  return (
    <View style={s.usage} accessibilityLabel={data ? `무료 ${data.limit}회 중 ${data.remaining}회 남음` : '무료 횟수 확인 중'}>
      <View style={s.dot} />
      <AppText v="caption" style={{ fontWeight: '700' }}>{data ? `무료 ${data.limit}회 중 ${data.remaining}회 남음` : isError ? '연결을 확인해 주세요' : '확인 중…'}</AppText>
    </View>
  );
}

export function LockBadge({ label = '잠금' }: { label?: string }) {
  return (
    <View style={s.lock}>
      <Icon name="lock" size={13} color={color.danger} strokeWidth={2.2} />
      <AppText v="caption" color={color.danger} style={{ fontWeight: '700' }}>{label}</AppText>
    </View>
  );
}

/** 썸네일 위 작은 표시 (빨강 solid / 노랑 / 회색 테두리) */
export function Tag({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'rating' | 'outline' }) {
  const bg = tone === 'brand' ? color.brand : tone === 'rating' ? color.rating : color.bg;
  const fg = tone === 'brand' ? color.white : color.ink;
  return (
    <View style={[s.tag, { backgroundColor: bg }, tone === 'outline' && { borderWidth: 1, borderColor: color.line }]}>
      <AppText v="caption" color={fg} style={{ fontSize: 11, lineHeight: 14, fontWeight: '700' }}>{label}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  usage: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.surface, borderRadius: radius.full, paddingHorizontal: space.md, paddingVertical: 6, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.action },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 6, height: 20, borderRadius: radius.sm, justifyContent: 'center' },
});
