import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { UsageBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { color, radius, space } from '@/constants/design';
import { shortDate } from '@/features/trips/dates';
import { useTrips } from '@/features/trips/hooks';
import { isDemoMode } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useDemoStore } from '@/stores/demoStore';

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.box}>
      <AppText v="bodyBold">{title}</AppText>
      <View style={{ marginTop: space.xs }}>{children}</View>
    </View>
  );
}

const say = (msg: string) => (Platform.OS === 'web' ? globalThis.alert?.(msg) : Alert.alert(msg));

/** 마이페이지 — 내 일정, 구매한 가이드북, 저장한 장소, 무료 횟수, 계정 */
export default function MyPage() {
  const { data: trips } = useTrips();
  const qc = useQueryClient();
  const resetDemo = () => { useDemoStore.getState().reset(); qc.invalidateQueries(); };
  return (
    <Screen title="마이페이지">
      <Box title="무료 일정 만들기"><UsageBadge /><AppText v="caption" color={color.sub} style={{ marginTop: space.xs }}>새 여행을 만들 때만 1회 줄어요. 만든 일정은 계속 고칠 수 있어요.</AppText></Box>
      <Box title={`내 일정 ${trips?.length ?? 0}개`}>
        {trips?.length ? trips.map((t) => <AppText key={t.id} v="caption" color={color.sub}>{t.city} · {shortDate(t.startDate)} – {shortDate(t.endDate)}</AppText>)
          : <AppText v="caption" color={color.sub}>아직 없어요</AppText>}
      </Box>
      <Box title="구매한 가이드북"><AppText v="caption" color={color.sub}>아직 없어요 · 가이드북 탭에서 첫날 미리보기를 볼 수 있어요</AppText></Box>
      <Box title="저장한 장소"><AppText v="caption" color={color.sub}>장소 탐색에서 하트로 모아요 (Phase 3)</AppText></Box>
      <Box title="계정">
        <View style={{ gap: space.sm, marginTop: space.xs }}>
          <Button label="로그인 / 회원가입" variant="secondary" onPress={() => router.push('/login')} />
          {!isDemoMode ? <Button label="로그아웃" variant="ghost" onPress={() => supabase?.auth.signOut().then(() => qc.invalidateQueries())} /> : null}
          <Button label="계정 삭제" variant="ghost" onPress={() => say('계정 삭제는 서버 함수 연결 후 동작해요. (스토어 심사 필수 항목)')} />
          <AppText v="caption" color={color.sub}>개인정보 처리방침 · 이용약관 (배포 전 공개 URL 준비)</AppText>
        </View>
      </Box>
      {isDemoMode ? <Button label="데모 데이터 지우기" variant="ghost" onPress={resetDemo} /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({ box: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: space.sm } });
