import { StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import { AppText } from './AppText';
import { Button } from './Button';

/** 빈 상태 — 무엇이 없는지 + 다음 행동 (설계서 6장 공통 규칙) */
export function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.box}>
      <AppText v="subtitle" style={s.center}>{title}</AppText>
      <AppText v="body" color={color.sub} style={[s.center, { marginTop: space.xs }]}>{description}</AppText>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} style={{ marginTop: space.lg, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderRadius: radius.xl, backgroundColor: color.surface, padding: space.xl, marginVertical: space.sm },
  center: { textAlign: 'center' },
});
