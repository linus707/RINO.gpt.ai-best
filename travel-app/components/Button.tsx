import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { color, font, radius, space } from '@/constants/design';
import { AppText } from './AppText';

type Variant = 'primary' | 'cta' | 'secondary' | 'ghost' | 'danger';

/**
 * 버튼은 파랑이 기본(D안 규칙). cta는 홈의 큰 버튼(파랑 그라데이션, 모서리 12).
 * 누를 때는 색을 새로 만들지 않고 진한 파랑/검정 7.5% 덮개로만 반응한다.
 */
export function Button({ label, onPress, variant = 'primary', disabled, loading, style, accessibilityHint }: {
  label: string; onPress?: () => void; variant?: Variant; disabled?: boolean; loading?: boolean; style?: ViewStyle; accessibilityHint?: string;
}) {
  const off = disabled || loading;
  const fg = variant === 'secondary' || variant === 'ghost' ? color.ink : color.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [s.base, s[variant], off && s.disabled, style, pressed && variant === 'primary' && { backgroundColor: color.actionPressed }]}
    >
      {({ pressed }) => (
        <>
          {variant === 'cta' && !off ? (
            <LinearGradient colors={['#5AAEFF', color.action]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
          ) : null}
          {pressed && variant !== 'primary' ? <View style={[StyleSheet.absoluteFill, s.pressLayer]} /> : null}
          {loading ? <ActivityIndicator color={fg} /> : (
            <AppText style={[variant === 'cta' ? font.subtitle : font.bodyBold, { color: off ? color.faint : fg }]}>{label}</AppText>
          )}
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.lg, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  primary: { backgroundColor: color.action },
  cta: { backgroundColor: color.action, minHeight: 52, minWidth: 240, paddingHorizontal: space.xxl },
  secondary: { backgroundColor: color.surface },
  ghost: { backgroundColor: 'transparent', minHeight: 44 },
  danger: { backgroundColor: color.danger },
  disabled: { backgroundColor: color.surface },
  pressLayer: { backgroundColor: '#000', opacity: 0.075 },
});
