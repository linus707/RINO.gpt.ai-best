/** 앱에서 읽는 환경변수 이름은 여기 한 곳에만 둔다. 값은 .env (커밋 금지), 이름은 .env.example */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

/** Supabase 값이 없으면 데모 모드 — 기기 안에만 저장하고 화면 흐름만 확인한다 */
export const isDemoMode = !env.supabaseUrl || !env.supabaseAnonKey;
