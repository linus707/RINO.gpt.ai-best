import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
      },
    });

/**
 * 무료 횟수는 사용자별로 서버에서 센다. 로그인 전이면 익명 계정을 만들어 두고,
 * 나중에 이메일 로그인과 연결한다. (Supabase 대시보드에서 Anonymous sign-ins 허용 필요)
 */
export async function ensureSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session;
}
