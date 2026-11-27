import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { env, isDemoMode } from './env';

/** 데모 모드면 null. 서버가 있으면 로그인 세션을 기기에 저장해 둔다. */
export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce', // 소셜 로그인 후 돌아올 때 코드 교환 방식 (앱·웹 공통)
      },
    });

let pending: Promise<Session | null> | null = null;

/**
 * 무료 횟수는 사용자별로 서버에서 센다. 로그인 전이면 익명 계정을 만들어 두고,
 * 나중에 카카오·Apple·이메일을 이 계정에 연결한다(기록이 그대로 이어진다).
 * 화면 여러 곳이 동시에 불러도 익명 계정은 하나만 만든다.
 */
export function ensureSession(): Promise<Session | null> {
  if (!supabase) return Promise.resolve(null);
  if (pending) return pending;
  pending = (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return anon.session;
  })().finally(() => { pending = null; });
  return pending;
}
