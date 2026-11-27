import { Pressable, StyleSheet, View } from 'react-native';
import { color, space } from '@/constants/design';
import { AppText } from './AppText';

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.row}>
      <AppText v="subtitle" accessibilityRole="header" style={{ flex: 1 }}>{title}</AppText>
      {actionLabel ? (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={8}>
          <AppText v="caption" color={color.sub}>{actionLabel} ›</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md, marginTop: space.xxl } });
