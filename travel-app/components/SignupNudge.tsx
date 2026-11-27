import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import { useAccount } from '@/features/auth/hooks';
import { josa } from '@/features/places/josa';
import { useSaved } from '@/features/saved/hooks';
import { useTrips } from '@/features/trips/hooks';
import { AppText } from './AppText';
import { Button } from './Button';

/** 가입 전 사용자가 기록을 만들기 시작하면 한 번 권한다 (막지는 않는다) */
export function SignupNudge() {
  const account = useAccount();
  const { data: trips } = useTrips();
  const { data: saved } = useSaved();
  const t = trips?.length ?? 0, sv = saved?.length ?? 0;
  if (account.kind !== 'anonymous' || (t === 0 && sv === 0)) return null;
  const what = [t ? `여행 ${t}개` : '', sv ? `저장한 장소 ${sv}곳` : ''].filter(Boolean).join('와 ');
  return (
    <View style={s.box}>
      <View style={{ flex: 1 }}>
        <AppText v="bodyBold">{josa(what, '을', '를')} 안전하게 보관할까요?</AppText>
        <AppText v="caption" color={color.sub}>가입하면 다른 기기에서도 이어서 볼 수 있어요. 지금 기록은 그대로 가져가요.</AppText>
      </View>
      <Button label="가입하기" onPress={() => router.push('/login')} style={{ minHeight: 40, paddingHorizontal: space.md }} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.actionSoft, borderRadius: radius.lg, padding: space.lg, marginTop: space.lg },
});
