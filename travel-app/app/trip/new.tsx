import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { UsageBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FreeLimitSheet } from '@/components/FreeLimitSheet';
import { Screen } from '@/components/Screen';
import { color, font, radius, space } from '@/constants/design';
import { CITIES } from '@/features/trips/cities';
import { dayCount, isValidDate, MAX_TRIP_DAYS } from '@/features/trips/dates';
import { useCreateTrip } from '@/features/trips/hooks';
import { FreeLimitError } from '@/features/trips/types';
import { useUsage } from '@/features/usage/hooks';

const WHO = ['혼자', '친구', '연인', '가족'];
const STYLES = ['맛집 중심', '사진 중심', '쇼핑 중심', '여유롭게'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ marginTop: space.lg }}><AppText v="caption" style={{ fontWeight: '700', marginBottom: space.sm }}>{label}</AppText>{children}</View>;
}
function Choice({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return <View style={s.wrap}>{items.map((i) => <Chip key={i} label={i} selected={i === value} onPress={() => onChange(i)} />)}</View>;
}

/** 여행 만들기 — 저장하는 순간 무료 1회 차감 (서버 판정) */
export default function NewTrip() {
  const [city, setCity] = useState('오사카');
  const [start, setStart] = useState('2027-01-15');
  const [end, setEnd] = useState('2027-01-18');
  const [who, setWho] = useState('친구');
  const [style, setStyle] = useState('사진 중심');
  const [error, setError] = useState('');
  const [limitOpen, setLimitOpen] = useState(false);
  const { data: usage } = useUsage();
  const create = useCreateTrip();

  const save = () => {
    setError('');
    if (!isValidDate(start) || !isValidDate(end)) return setError('날짜를 2027-01-15 형식으로 적어 주세요.');
    const n = dayCount(start, end);
    if (n < 1) return setError('종료일을 시작일과 같거나 뒤로 골라 주세요.');
    if (n > MAX_TRIP_DAYS) return setError(`한 여행은 최대 ${MAX_TRIP_DAYS}일까지 만들 수 있어요.`);
    if (usage && usage.remaining <= 0) return setLimitOpen(true);
    create.mutate(
      { city, startDate: start, endDate: end, companion: who, style },
      {
        onSuccess: () => router.replace('/itinerary'),
        onError: (e) => (e instanceof FreeLimitError ? setLimitOpen(true) : setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')),
      },
    );
  };

  return (
    <Screen edges={['bottom']}>
      <UsageBadge />
      <AppText v="caption" color={color.sub} style={{ marginTop: space.xs }}>저장하면 무료 횟수가 1회 줄어요.</AppText>
      <Field label="도시"><Choice items={CITIES.map((c) => c.name)} value={city} onChange={setCity} /></Field>
      <View style={s.row}>
        <View style={{ flex: 1 }}><Field label="시작일"><TextInput value={start} onChangeText={setStart} style={s.input} placeholder="2027-01-15" accessibilityLabel="시작일" inputMode="numeric" /></Field></View>
        <View style={{ flex: 1 }}><Field label="종료일"><TextInput value={end} onChangeText={setEnd} style={s.input} placeholder="2027-01-18" accessibilityLabel="종료일" inputMode="numeric" /></Field></View>
      </View>
      <Field label="동행"><Choice items={WHO} value={who} onChange={setWho} /></Field>
      <Field label="여행 스타일"><Choice items={STYLES} value={style} onChange={setStyle} /></Field>
      {error ? <AppText v="caption" color={color.danger} style={{ marginTop: space.md }} accessibilityLiveRegion="polite">{error}</AppText> : null}
      <Button label="여행 저장하고 일정 짜기" onPress={save} loading={create.isPending} style={{ marginTop: space.xl }} />
      <FreeLimitSheet visible={limitOpen} onClose={() => setLimitOpen(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  input: { ...font.body, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.md, color: color.ink, fontSize: 16 },
});
