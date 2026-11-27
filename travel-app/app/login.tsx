import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { AppleButton, KakaoButton } from '@/components/SocialButtons';
import { color, font, radius, space } from '@/constants/design';
import {
  AccountExistsError, CancelledError, appleNative, appleNativeAvailable, emailSendCode, emailVerifyCode, oauth, type OAuthProvider,
} from '@/features/auth/api';
import { useAccount } from '@/features/auth/hooks';
import { useTrips } from '@/features/trips/hooks';

type Method = OAuthProvider | 'email';
const LABEL: Record<Method, string> = { kakao: '카카오', apple: 'Apple', email: '이메일' };

/**
 * 로그인·가입 — 지금까지 만든 기록(익명 계정)에 로그인 수단을 연결한다.
 * 이미 가입된 수단이면 "그 계정으로 로그인"을 따로 확인받는다(이 기기의 가입 전 기록은 옮겨지지 않음).
 */
export default function Login() {
  const params = useLocalSearchParams<{ exists?: Method }>();
  const account = useAccount();
  const { data: trips } = useTrips();
  // link: 지금 기록에 연결해 가입 / signin: 기존 계정으로 로그인
  const [mode, setMode] = useState<'link' | 'signin'>('link');
  const [exists, setExists] = useState<Method | null>(params.exists ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const demo = account.kind === 'demo';

  const done = () => router.canGoBack() ? router.back() : router.replace('/mypage');

  const run = async (method: Method, fn: () => Promise<void>) => {
    setBusy(true); setMsg('');
    try {
      await fn();
      if (method !== 'email' || codeSent) {
        if (Platform.OS !== 'web' || method === 'email') done();
      }
    } catch (e) {
      if (e instanceof AccountExistsError) { setExists(method); setMode('signin'); }
      else if (!(e instanceof CancelledError)) setMsg(e instanceof Error ? e.message : '로그인하지 못했어요');
    } finally { setBusy(false); }
  };

  const social = async (p: OAuthProvider, m = mode) => {
    if (p === 'apple' && (await appleNativeAvailable())) return run('apple', () => appleNative(m));
    return run(p, () => oauth(p, m));
  };

  const sendCode = (m = mode) => run('email', async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('이메일 주소를 확인해 주세요');
    await emailSendCode(email.trim(), m);
    setCodeSent(true);
    setMsg(`${email.trim()}로 6자리 코드를 보냈어요`);
  });
  const verify = () => run('email', async () => {
    await emailVerifyCode(email.trim(), code.trim(), mode);
  });

  if (account.kind === 'member') {
    return (
      <Screen edges={['bottom']}>
        <View style={s.note}>
          <AppText v="bodyBold">이미 로그인돼 있어요</AppText>
          <AppText v="caption" color={color.sub}>{account.label}{account.email ? ` · ${account.email}` : ''}</AppText>
        </View>
        <Button label="마이페이지로" onPress={() => router.replace('/mypage')} />
      </Screen>
    );
  }

  const tripCount = trips?.length ?? 0;
  return (
    <Screen edges={['bottom']}>
      {demo ? (
        <View style={s.note}>
          <AppText v="bodyBold">데모 모드예요</AppText>
          <AppText v="caption" color={color.sub}>.env에 Supabase 주소와 공개 키를 넣으면 로그인이 동작해요. 지금은 기기 안에만 저장돼요.</AppText>
        </View>
      ) : null}

      <AppText v="title" style={{ marginBottom: space.xs }}>{mode === 'link' ? '기록을 안전하게 보관해요' : '가입한 계정으로 로그인'}</AppText>
      <AppText v="body" color={color.sub} style={{ marginBottom: space.xl }}>
        {mode === 'link'
          ? '지금까지 만든 일정과 남은 무료 횟수를 그대로 가지고 가입해요. 다른 기기에서도 이어서 볼 수 있어요.'
          : tripCount > 0
            ? `기존 계정으로 들어가면, 이 기기에서 가입 전에 만든 여행 ${tripCount}개는 옮겨지지 않아요.`
            : '다른 기기에서 쓰던 계정으로 들어가요.'}
      </AppText>

      {exists ? (
        <View style={[s.note, { backgroundColor: color.actionSoft }]} accessibilityLiveRegion="polite">
          <AppText v="bodyBold">이미 가입된 {LABEL[exists]} 계정이 있어요</AppText>
          <AppText v="caption" color={color.sub}>아래에서 {LABEL[exists]}(으)로 다시 누르면 그 계정으로 로그인해요.</AppText>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <AppleButton onPress={() => social('apple')} disabled={demo || busy} />
        <KakaoButton onPress={() => social('kakao')} disabled={demo || busy} />
        <Button label="이메일로 계속하기" variant="secondary" onPress={() => setEmailOpen((v) => !v)} disabled={demo || busy} />
      </View>

      {emailOpen ? (
        <View style={{ marginTop: space.lg }}>
          <AppText v="caption" style={s.label}>이메일</AppText>
          <TextInput value={email} onChangeText={(t) => { setEmail(t); setCodeSent(false); }} style={s.input} autoCapitalize="none"
            keyboardType="email-address" autoComplete="email" accessibilityLabel="이메일" placeholder="name@example.com" editable={!busy} />
          {codeSent ? (
            <>
              <AppText v="caption" style={s.label}>메일로 받은 6자리 코드</AppText>
              <TextInput value={code} onChangeText={setCode} style={s.input} keyboardType="number-pad" autoComplete="one-time-code"
                accessibilityLabel="인증 코드" maxLength={6} placeholder="123456" />
              <Button label="확인" onPress={verify} disabled={code.trim().length !== 6} loading={busy} style={{ marginTop: space.md }} />
              <Pressable onPress={() => sendCode()} accessibilityRole="button" style={{ marginTop: space.sm, minHeight: 36, justifyContent: 'center' }}>
                <AppText v="caption" color={color.sub}>코드 다시 받기</AppText>
              </Pressable>
            </>
          ) : (
            <Button label="코드 받기" onPress={() => sendCode()} disabled={!email || demo} loading={busy} style={{ marginTop: space.md }} />
          )}
          <AppText v="caption" color={color.sub} style={{ marginTop: space.sm }}>비밀번호 없이 메일로 받은 코드로 들어와요.</AppText>
        </View>
      ) : null}

      {msg ? <AppText v="caption" color={msg.includes('보냈어요') ? color.action : color.danger} style={{ marginTop: space.md }} accessibilityLiveRegion="polite">{msg}</AppText> : null}

      <Pressable onPress={() => { setMode(mode === 'link' ? 'signin' : 'link'); setExists(null); setMsg(''); setCodeSent(false); }}
        accessibilityRole="button" style={s.switch}>
        <AppText v="caption" color={color.sub}>
          {mode === 'link' ? '다른 기기에서 쓰던 계정이 있나요? 기존 계정으로 로그인 ›' : '‹ 지금 기록으로 새로 가입하기'}
        </AppText>
      </Pressable>
      <AppText v="caption" color={color.faint} style={{ marginTop: space.lg }}>
        계속하면 이용약관과 개인정보 처리방침에 동의하게 돼요. 이메일·닉네임과 여행 기록만 저장해요.
      </AppText>
    </Screen>
  );
}

const s = StyleSheet.create({
  note: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: space.lg },
  label: { fontWeight: '700', marginTop: space.md, marginBottom: space.sm },
  input: { ...font.body, fontSize: 16, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.md, color: color.ink },
  switch: { marginTop: space.xl, minHeight: 40, justifyContent: 'center' },
});
