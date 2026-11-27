import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { color } from '@/constants/design';
import { parseAuthCallback } from '@/lib/authUrl';
import { supabase } from '@/lib/supabase';

/**
 * 소셜 로그인에서 돌아오는 화면.
 * 웹: Supabase가 주소의 코드를 자동으로 세션으로 바꾼다 → 끝나면 마이페이지로.
 * 앱: 보통 로그인 창 안에서 끝나지만, 이 화면으로 오면 마이페이지로 보낸다.
 */
export default function AuthCallback() {
  const [error, setError] = useState('');
  useEffect(() => {
    const url = Platform.OS === 'web' ? window.location.href : '';
    const r = url ? parseAuthCallback(url) : { kind: 'none' as const };
    if (r.kind === 'error') {
      const provider = (Platform.OS === 'web' && sessionStorage.getItem('rino-auth-provider')) || 'kakao';
      if (['identity_already_exists', 'email_exists', 'user_already_exists'].includes(r.code)) {
        router.replace({ pathname: '/login', params: { exists: provider } });
      } else setError(r.message || r.code);
      return;
    }
    let tries = 0;
    const t = setInterval(async () => {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (data.session || ++tries > 20) { clearInterval(t); router.replace('/mypage'); }
    }, 300);
    return () => clearInterval(t);
  }, []);
  return (
    <Screen>
      {error ? (
        <EmptyState title="로그인하지 못했어요" description={error} actionLabel="다시 시도" onAction={() => router.replace('/login')} />
      ) : (
        <AppText color={color.sub}>로그인을 마무리하는 중…</AppText>
      )}
    </Screen>
  );
}
