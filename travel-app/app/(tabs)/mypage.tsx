import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { UsageBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Screen } from '@/components/Screen';
import { SignupNudge } from '@/components/SignupNudge';
import { color, radius, space } from '@/constants/design';
import { deleteAccount, signOut } from '@/features/auth/api';
import { useAccount } from '@/features/auth/hooks';
import { shortDate } from '@/features/trips/dates';
import { useExport } from '@/features/export/hooks';
import { useLists } from '@/features/lists/hooks';
import { useSaved } from '@/features/saved/hooks';
import { useTrips } from '@/features/trips/hooks';
import { useDemoStore } from '@/stores/demoStore';

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.box}>
      <AppText v="bodyBold">{title}</AppText>
      <View style={{ marginTop: space.xs }}>{children}</View>
    </View>
  );
}

/** 마이페이지 — 계정, 무료 횟수, 내 일정, 구매한 가이드북, 저장한 장소 */
export default function MyPage() {
  const { data: trips } = useTrips();
  const account = useAccount();
  const { data: saved } = useSaved();
  const { data: lists } = useLists();
  const exp = useExport();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<'logout' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const act = async () => {
    setBusy(true); setErr('');
    try {
      if (confirm === 'logout') await signOut();
      if (confirm === 'delete') await deleteAccount();
      setConfirm(null);
      qc.invalidateQueries();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };

  return (
    <Screen title="마이페이지">
      <Box title="계정">
        {account.kind === 'member' ? (
          <>
            <AppText v="body">{account.name ?? '회원님'}</AppText>
            <AppText v="caption" color={color.sub}>{account.label}로 로그인{account.email ? ` · ${account.email}` : ''}</AppText>
          </>
        ) : account.kind === 'anonymous' ? (
          <>
            <AppText v="body">가입 전이에요</AppText>
            <AppText v="caption" color={color.sub}>지금 기록은 이 기기에만 연결돼 있어요. 가입하면 그대로 보관돼요.</AppText>
            <Button label="가입하고 기록 지키기" onPress={() => router.push('/login')} style={{ marginTop: space.md }} />
          </>
        ) : account.kind === 'demo' ? (
          <AppText v="caption" color={color.sub}>데모 모드 · 서버를 연결하면 카카오·Apple·이메일로 가입할 수 있어요.</AppText>
        ) : (
          <AppText v="caption" color={color.sub}>확인 중…</AppText>
        )}
      </Box>
      <SignupNudge />
      <View style={{ height: space.sm }} />
      <Box title="무료 일정 만들기"><UsageBadge /><AppText v="caption" color={color.sub} style={{ marginTop: space.xs }}>새 여행을 만들 때만 1회 줄어요. 만든 일정은 계속 고칠 수 있어요.</AppText></Box>
      <Box title={`내 일정 ${trips?.length ?? 0}개`}>
        {trips?.length ? trips.map((t) => <AppText key={t.id} v="caption" color={color.sub}>{t.city} · {shortDate(t.startDate)} – {shortDate(t.endDate)}</AppText>)
          : <AppText v="caption" color={color.sub}>아직 없어요</AppText>}
      </Box>
      <Box title="구매한 가이드북"><AppText v="caption" color={color.sub}>아직 없어요 · 가이드북 탭에서 첫날 미리보기를 볼 수 있어요</AppText></Box>
      <Box title={`저장한 장소 ${saved?.length ?? 0}곳 · 내 모음 ${lists?.length ?? 0}개`}>
        <AppText v="caption" color={color.sub}>{saved?.length ? '하트 누른 장소, 내 메모·별점, 직접 만든 모음을 모아 봐요' : '장소 탐색에서 하트를 누르면 여기 모여요'}</AppText>
        <Button label="저장한 장소·모음 보기" variant="secondary" onPress={() => router.push('/saved')} style={{ marginTop: space.md }} />
      </Box>
      <Box title="내 데이터 내보내기">
        <AppText v="caption" color={color.sub}>일정·저장한 장소·메모·모음·숙소 후보를 파일로 받아요. Google 장소는 이름 대신 장소 ID와 지도 링크로 담겨요.</AppText>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          <Button label="엑셀용 CSV" variant="secondary" onPress={() => exp.run('csv')} loading={exp.busy === 'csv'} style={{ flex: 1 }} />
          <Button label="전체 백업 JSON" variant="secondary" onPress={() => exp.run('json')} loading={exp.busy === 'json'} style={{ flex: 1 }} />
        </View>
        {exp.error ? <AppText v="caption" color={color.danger} style={{ marginTop: space.sm }}>{exp.error}</AppText> : null}
      </Box>

      {account.kind === 'member' || account.kind === 'anonymous' ? (
        <View style={{ gap: space.xs, marginTop: space.sm }}>
          {account.kind === 'member' ? <Button label="로그아웃" variant="ghost" onPress={() => setConfirm('logout')} /> : null}
          <Button label="계정 삭제" variant="ghost" onPress={() => setConfirm('delete')} />
        </View>
      ) : null}
      {account.kind === 'demo' ? (
        <Button label="데모 데이터 지우기" variant="ghost" onPress={() => { useDemoStore.getState().reset(); qc.invalidateQueries(); }} />
      ) : null}
      {err ? <AppText v="caption" color={color.danger}>{err}</AppText> : null}
      <AppText v="caption" color={color.faint} style={{ marginTop: space.md }}>개인정보 처리방침 · 이용약관 (배포 전 공개 URL 준비)</AppText>

      <ConfirmSheet
        visible={confirm === 'logout'}
        title="로그아웃할까요?"
        body="다시 로그인하면 기록이 그대로 있어요. 로그아웃한 동안 만든 기록은 새 기록으로 따로 시작돼요."
        confirmLabel="로그아웃"
        busy={busy}
        onConfirm={act}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        visible={confirm === 'delete'}
        title="계정을 삭제할까요?"
        body="일정, 저장한 장소, 남은 무료 횟수가 모두 지워지고 되돌릴 수 없어요. 법에 따라 보관해야 하는 결제 기록은 개인 정보와 분리해 정해진 기간 동안만 남아요."
        confirmLabel="계정 삭제"
        danger
        busy={busy}
        onConfirm={act}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({ box: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: space.sm } });
