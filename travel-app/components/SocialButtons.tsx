import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color, font, radius, space } from '@/constants/design';
import { appleNativeAvailable } from '@/features/auth/api';
import { AppText } from './AppText';

/**
 * 로그인 버튼은 각 회사의 디자인 규정을 따른다(D안의 '버튼은 파랑' 규칙의 예외).
 * - 카카오: 노란 바탕 #FEE500, 말풍선 심볼, 검정 85% 글자
 * - Apple: 아이폰은 Apple 기본 버튼, 그 밖에는 검정 바탕 흰 글자
 */
export function KakaoButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel="카카오 로그인"
      style={({ pressed }) => [s.btn, { backgroundColor: '#FEE500' }, (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 }]}>
      <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.5.1.9.1 1.4.1 5.5 0 10-3.6 10-8S17.5 3 12 3Z" fill="#000" /></Svg>
      <AppText style={[font.bodyBold, { color: 'rgba(0,0,0,0.85)' }]}>카카오 로그인</AppText>
    </Pressable>
  );
}

export function AppleButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const [native, setNative] = useState(false);
  useEffect(() => { appleNativeAvailable().then(setNative).catch(() => setNative(false)); }, []);
  if (native && Platform.OS === 'ios') {
    return (
      <View style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.lg}
          style={{ height: 50 }}
          onPress={onPress}
        />
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel="Apple로 계속하기"
      style={({ pressed }) => [s.btn, { backgroundColor: '#000' }, (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 }]}>
      <AppText style={[font.bodyBold, { color: color.white }]}>Apple로 계속하기</AppText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { height: 50, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
});
