import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { isDemoMode } from '@/lib/env';
import { ensureSession, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/** 로그인 상태를 지켜보다가 바뀌면(로그인·로그아웃·계정 연결) 서버 데이터를 새로 불러온다 */
export function AuthListener() {
  const qc = useQueryClient();
  const set = useAuthStore((s) => s.set);
  useEffect(() => {
    if (isDemoMode || !supabase) { set(null); return; }
    ensureSession().then(set).catch(() => set(null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      set(session);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // 인증 콜백 안에서 바로 서버를 부르지 않도록 한 박자 뒤에
        setTimeout(() => {
          if (event === 'SIGNED_OUT') ensureSession().catch(() => {});
          qc.invalidateQueries();
        }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [qc, set]);
  return null;
}
