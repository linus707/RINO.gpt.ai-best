import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, layout, space } from '@/constants/design';
import { AppText } from './AppText';

/**
 * 모든 화면의 바깥 틀: 안전 영역(노치·홈 인디케이터), 스크롤, 넓은 화면에서 가운데 정렬.
 * 화면 코드는 플랫폼을 구분하지 않는다.
 */
export function Screen({ title, right, children, edges = ['top'], padded = true }: {
  title?: string; right?: ReactNode; children: ReactNode; edges?: ('top' | 'bottom')[]; padded?: boolean;
}) {
  return (
    <SafeAreaView style={s.safe} edges={edges}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={[s.inner, padded && s.padded]}>
          {title ? (
            <View style={s.head}>
              <AppText v="title" accessibilityRole="header" style={{ flex: 1 }}>{title}</AppText>
              {right}
            </View>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  scroll: { flexGrow: 1 },
  inner: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: space.xxxl },
  padded: { paddingHorizontal: space.lg, paddingTop: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg },
});
