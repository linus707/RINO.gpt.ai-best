import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import { useAccount } from '@/features/auth/hooks';
import { useTrips } from '@/features/trips/hooks';
import { AppText } from './AppText';
import { Button } from './Button';

/** 가입 전 사용자가 기록을 만들기 시작하면 한 번 권한다 (막지는 않는다) */
export function SignupNudge() {
  const account = useAccount();
  const { data: trips } = useTrips();
  if (account.kind !== 'anonymous' || !trips?.length) return null;
  return (
    <View style={s.box}>
      <View style={{ flex: 1 }}>
        <AppText v="bodyBold">여행 {trips.length}개를 안전하게 보관할까요?</AppText>
        <AppText v="caption" color={color.sub}>가입하면 다른 기기에서도 이어서 볼 수 있어요. 지금 기록은 그대로 가져가요.</AppText>
      </View>
      <Button label="가입하기" onPress={() => router.push('/login')} style={{ minHeight: 40, paddingHorizontal: space.md }} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.actionSoft, borderRadius: radius.lg, padding: space.lg, marginTop: space.lg },
});
