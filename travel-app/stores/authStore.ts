import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

/** 지금 로그인 상태 (Supabase가 알려 주는 대로만 바뀐다) */
type AuthState = { session: Session | null; ready: boolean; set: (s: Session | null) => void };

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  ready: false,
  set: (session) => set({ session, ready: true }),
}));

export type AccountKind = 'demo' | 'loading' | 'anonymous' | 'member';
const PROVIDER_LABEL: Record<string, string> = { kakao: '카카오', apple: 'Apple', email: '이메일', google: 'Google' };

/** 화면에서 쓰는 계정 요약 */
export function describeAccount(session: Session | null, ready: boolean, demo: boolean) {
  if (demo) return { kind: 'demo' as AccountKind, label: '데모 모드', providers: [] as string[], email: null as string | null };
  if (!ready || !session) return { kind: 'loading' as AccountKind, label: '확인 중', providers: [], email: null };
  const u = session.user;
  const providers = (u.identities ?? []).map((i) => i.provider).filter((p) => p !== 'anonymous');
  if (u.is_anonymous || providers.length === 0) return { kind: 'anonymous' as AccountKind, label: '가입 전 (이 기기에만 연결)', providers: [], email: null };
  return { kind: 'member' as AccountKind, label: providers.map((p) => PROVIDER_LABEL[p] ?? p).join(' · '), providers, email: u.email ?? null };
}
