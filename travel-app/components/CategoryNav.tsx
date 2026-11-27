import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { CATEGORIES } from '@/constants/categories';
import { space } from '@/constants/design';
import { AppText } from './AppText';
import { FilledIcon } from './Icon';

/** 홈 상단 카테고리 줄 — 색이 든 채움 아이콘 + 이름. 누르면 장소 탐색(해당 카테고리) */
export function CategoryNav() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {CATEGORIES.map((c) => (
        <Pressable key={c.key} accessibilityRole="link" style={s.item}
          onPress={() => router.push({ pathname: '/place/search', params: { cat: c.key } })}>
          <FilledIcon d={c.icon} color={c.color} size={15} />
          <AppText v="caption" style={{ fontWeight: '600' }}>{c.label}</AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { gap: space.xl, paddingHorizontal: space.lg, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
});
