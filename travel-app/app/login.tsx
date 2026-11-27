import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { color, font, radius, space } from '@/constants/design';
import { isDemoMode } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/**
 * 로그인 틀 — 이메일 + 비밀번호. 로그인 필수 시점은 미정(설계서 13장)이라,
 * 그전까지는 익명 계정으로 쓰다가 여기서 이메일을 연결한다.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const run = async (mode: 'in' | 'up') => {
    if (!supabase) return;
    setBusy(true); setMsg('');
    const { error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    qc.invalidateQueries();
    if (mode === 'up') setMsg('확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.');
    else router.back();
  };

  return (
    <Screen edges={['bottom']}>
      {isDemoMode ? (
        <View style={s.note}>
          <AppText v="bodyBold">데모 모드예요</AppText>
          <AppText v="caption" color={color.sub}>.env에 Supabase 주소와 공개 키를 넣으면 로그인이 동작해요. 지금은 기기 안에만 저장돼요.</AppText>
        </View>
      ) : null}
      <AppText v="caption" style={s.label}>이메일</AppText>
      <TextInput value={email} onChangeText={setEmail} style={s.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel="이메일" />
      <AppText v="caption" style={s.label}>비밀번호</AppText>
      <TextInput value={pw} onChangeText={setPw} style={s.input} secureTextEntry autoComplete="password" accessibilityLabel="비밀번호" />
      {msg ? <AppText v="caption" color={color.danger} style={{ marginTop: space.md }}>{msg}</AppText> : null}
      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Button label="로그인" onPress={() => run('in')} disabled={isDemoMode || !email || !pw} loading={busy} />
        <Button label="회원가입" variant="secondary" onPress={() => run('up')} disabled={isDemoMode || !email || !pw} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  note: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: space.lg },
  label: { fontWeight: '700', marginTop: space.lg, marginBottom: space.sm },
  input: { ...font.body, fontSize: 16, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.md, color: color.ink },
});
