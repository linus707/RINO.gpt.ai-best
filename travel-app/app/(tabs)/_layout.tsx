import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { color, layout } from '@/constants/design';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: '홈', icon: 'home' },
  { name: 'itinerary', title: '일정', icon: 'list' },
  { name: 'map', title: '지도', icon: 'map' },
  { name: 'store', title: '가이드북', icon: 'book' },
  { name: 'mypage', title: '마이페이지', icon: 'user' },
];

/** 하단 탭 5개. 넓은 화면(PC 웹·태블릿 가로)에서는 왼쪽 사이드바로 바뀐다 — 화면 코드는 그대로 */
export default function TabLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= layout.wideBreakpoint;
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.sub,
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarVariant: wide ? 'material' : 'uikit',
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
        tabBarStyle: wide
          ? { backgroundColor: color.bg, borderColor: color.line, width: 220, minWidth: 220 }
          : { backgroundColor: color.bg, borderColor: color.line, height: 62 + insets.bottom, paddingTop: 4, paddingBottom: 4 + insets.bottom },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused }) => <Icon name={t.icon} color={focused ? color.action : color.sub} />,
          }}
        />
      ))}
    </Tabs>
  );
}
