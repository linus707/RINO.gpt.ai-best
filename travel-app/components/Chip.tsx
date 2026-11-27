import { Pressable, StyleSheet } from 'react-native';
import { color, radius, space } from '@/constants/design';
import { AppText } from './AppText';

/** 선택 칩 — 선택되면 파란 테두리·옅은 파랑 바탕 */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }}
      style={[s.chip, selected && s.on]}>
      <AppText v="caption" color={selected ? color.action : color.ink} style={{ fontWeight: '600' }}>{label}</AppText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { minHeight: 36, paddingHorizontal: space.lg, borderRadius: radius.full, borderWidth: 1, borderColor: color.line, justifyContent: 'center', backgroundColor: color.bg },
  on: { borderColor: color.action, backgroundColor: color.actionSoft },
});
