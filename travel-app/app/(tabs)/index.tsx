import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { UsageBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { ComingSoonCard, GuidebookCard, TripCard } from '@/components/Cards';
import { CategoryNav } from '@/components/CategoryNav';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SignupNudge } from '@/components/SignupNudge';
import { useAccount } from '@/features/auth/hooks';
import { color, font, radius, space } from '@/constants/design';
import { GUIDEBOOKS } from '@/features/guidebooks/data';
import { useTrips } from '@/features/trips/hooks';
import { useUsage } from '@/features/usage/hooks';
import { isDemoMode } from '@/lib/env';
import { useAppStore } from '@/stores/appStore';

/**
 * 홈 / 내 여행 — 레이아웃은 참고 코드(가운데 큰 헤드라인 + 버튼 하나 + 카테고리 줄 + 테두리 없는 썸네일 카드),
 * 색은 D안(브랜드 빨강 한 점, 행동은 파랑).
 */
export default function Home() {
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 3 : width >= 560 ? 2 : 1;
  const { data: trips, isLoading } = useTrips();
  const { data: usage } = useUsage();
  const selectTrip = useAppStore((s) => s.selectTrip);
  const account = useAccount();
  const goNew = () => router.push('/trip/new');

  return (
    <Screen padded={false}>
      {/* 상단 바: 앱 이름 · 모드(여행 계획 | 가이드북) · 검색 · 로그인 */}
      <View style={s.gnb}>
        <AppText v="bodyBold" numberOfLines={1} style={s.logo}>리노 트립</AppText>
        <AppText v="bodyBold" numberOfLines={1} color={color.brand}>여행 계획</AppText>
        <View style={s.divider} />
        <Pressable onPress={() => router.push('/store')} accessibilityRole="link" hitSlop={8}>
          <AppText v="caption" numberOfLines={1} color={color.sub}>가이드북</AppText>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push('/place/search')} accessibilityRole="button" accessibilityLabel="장소 검색" style={s.iconBtn}>
          <Icon name="search" size={20} />
        </Pressable>
        <Pressable onPress={() => router.push(account.kind === 'member' ? '/mypage' : '/login')} accessibilityRole="button" style={s.login}>
          <AppText v="caption" style={{ fontWeight: '700' }}>{account.kind === 'member' ? '내 계정' : '로그인'}</AppText>
        </Pressable>
      </View>

      <CategoryNav />

      {/* 히어로: 가운데 정렬, 강조 단어만 빨강, 버튼 하나 */}
      <View style={s.hero}>
        <LinearGradient colors={['rgba(247,50,63,0.08)', 'rgba(247,50,63,0)']} style={StyleSheet.absoluteFill} />
        <AppText v="caption" color={color.sub} style={{ fontWeight: '700' }}>리노 트립</AppText>
        <AppText style={[font.display, s.headline]} accessibilityRole="header">
          <AppText style={[font.display, { color: color.brand }]}>무료 {usage?.limit ?? 5}번</AppText>으로{'\n'}짜 보는 내 여행
        </AppText>
        <Button variant="cta" label="새 여행 만들기" onPress={goNew} accessibilityHint="만들 때 무료 횟수가 1회 줄어요" />
        <View style={{ marginTop: space.md }}><UsageBadge /></View>
        <Pressable onPress={() => router.push('/guidebook/osaka-3n4d')} accessibilityRole="link" style={s.more} hitSlop={8}>
          <AppText v="caption" style={{ fontWeight: '600' }}>오사카 가이드북 첫날 미리보기 ›</AppText>
        </Pressable>
      </View>

      <View style={s.body}>
        {isDemoMode ? (
          <View style={s.demo}><AppText v="caption" color={color.sub}>데모 모드 · 서버 연결 전이라 이 기기에만 저장돼요</AppText></View>
        ) : null}

        <SignupNudge />
        <SectionHeader title="내 여행" actionLabel={trips?.length ? '일정 보기' : undefined} onAction={() => router.push('/itinerary')} />
        {isLoading ? (
          <AppText v="body" color={color.sub}>불러오는 중…</AppText>
        ) : trips && trips.length ? (
          trips.map((t) => (
            <TripCard key={t.id} trip={t} onPress={() => { selectTrip(t.id); router.push('/itinerary'); }} />
          ))
        ) : (
          <EmptyState
            title="아직 만든 여행이 없어요"
            description="도시와 날짜만 정하면 일자별 일정 틀이 만들어져요. 새 여행을 만들 때만 무료 횟수가 1회 줄어요."
            actionLabel="첫 여행 만들기"
            onAction={goNew}
          />
        )}

        <SectionHeader title="지금 인기 있는 코스" actionLabel="가이드북 전체" onAction={() => router.push('/store')} />
        <View style={[s.grid, { flexDirection: cols === 1 ? 'column' : 'row' }]}>
          {GUIDEBOOKS.map((b) => (
            <View key={b.id} style={cols === 1 ? s.cellFull : { flex: 1 }}>
              <GuidebookCard book={b} onPress={() => router.push(`/guidebook/${b.id}`)} />
            </View>
          ))}
          {cols > 1 ? Array.from({ length: cols - GUIDEBOOKS.length }, (_, i) => (
            <View key={i} style={{ flex: 1 }}><ComingSoonCard city={['도쿄', '후쿠오카'][i] ?? '다음 도시'} /></View>
          )) : null}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  logo: { fontSize: 17, fontWeight: '800' },
  gnb: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  divider: { width: 1, height: 14, backgroundColor: color.line },
  iconBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  login: { height: 36, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: color.surface, justifyContent: 'center' },
  hero: { alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.xxl, paddingBottom: space.xl, overflow: 'hidden' },
  headline: { textAlign: 'center', marginTop: space.md, marginBottom: space.xl },
  more: { marginTop: space.md, minHeight: 32, justifyContent: 'center' },
  body: { paddingHorizontal: space.lg },
  demo: { backgroundColor: color.surface, borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.md, marginTop: space.sm },
  grid: { gap: space.lg },
  cellFull: { width: '100%' },
});
