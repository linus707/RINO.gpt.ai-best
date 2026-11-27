import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { parseAuthCallback } from '@/lib/authUrl';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * 로그인·가입 (3-1).
 * 원칙: 지금 쓰고 있는 익명 계정에 로그인 수단을 "연결(link)"한다 → 같은 사용자 id라 일정·무료 횟수가 그대로 남는다.
 * 그 로그인 수단이 이미 다른 계정에 있으면 AccountExistsError → 화면에서 "그 계정으로 로그인할지" 묻는다.
 */
export type OAuthProvider = 'kakao' | 'apple';

export class AccountExistsError extends Error {
  constructor(public provider: OAuthProvider | 'email') { super('ACCOUNT_EXISTS'); this.name = 'AccountExistsError'; }
}
export class CancelledError extends Error {
  constructor() { super('CANCELLED'); this.name = 'CancelledError'; }
}

const EXISTS = new Set(['identity_already_exists', 'email_exists', 'user_already_exists']);
const need = () => { if (!supabase) throw new Error('DEMO_MODE'); return supabase; };

/** 소셜 로그인 후 돌아올 주소 (Supabase 대시보드의 Redirect URLs에 등록해야 한다) */
export const redirectTo = () => (Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : Linking.createURL('auth/callback'));

/** 돌아온 주소를 읽어 세션을 완성한다 (앱: 아래 oauth에서, 웹: /auth/callback 화면에서) */
export async function completeFromUrl(url: string, provider: OAuthProvider) {
  const sb = need();
  const r = parseAuthCallback(url);
  if (r.kind === 'error') {
    if (EXISTS.has(r.code)) throw new AccountExistsError(provider);
    throw new Error(r.message || r.code);
  }
  if (r.kind === 'code') {
    const { error } = await sb.auth.exchangeCodeForSession(r.code);
    if (error) throw error;
  } else if (r.kind === 'tokens') {
    const { error } = await sb.auth.setSession({ access_token: r.accessToken, refresh_token: r.refreshToken });
    if (error) throw error;
  }
}

/** 카카오·Apple(웹/Android) — 브라우저로 로그인 화면을 열고 돌아온다 */
export async function oauth(provider: OAuthProvider, mode: 'link' | 'signin') {
  const sb = need();
  const web = Platform.OS === 'web';
  const options = { redirectTo: redirectTo(), skipBrowserRedirect: !web };
  if (web) sessionStorage.setItem('rino-auth-provider', provider);
  const { data, error } = mode === 'link'
    ? await sb.auth.linkIdentity({ provider, options })
    : await sb.auth.signInWithOAuth({ provider, options });
  if (error) {
    if (error.code && EXISTS.has(error.code)) throw new AccountExistsError(provider);
    throw error;
  }
  if (web) return; // 웹은 그 페이지로 이동 → /auth/callback에서 마무리
  const res = await WebBrowser.openAuthSessionAsync(data.url!, options.redirectTo);
  if (res.type !== 'success') throw new CancelledError();
  await completeFromUrl(res.url, provider);
}

/** 아이폰: Apple 기본 로그인 창 (Apple 심사 기준에 맞는 방식) */
export async function appleNative(mode: 'link' | 'signin') {
  const sb = need();
  const raw = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  let cred: AppleAuthentication.AppleAuthenticationCredential;
  try {
    cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new CancelledError();
    throw e;
  }
  if (!cred.identityToken) throw new Error('Apple 로그인 정보를 받지 못했어요');
  const creds = { provider: 'apple' as const, token: cred.identityToken, nonce: raw };
  const { error } = mode === 'link' ? await sb.auth.linkIdentity(creds) : await sb.auth.signInWithIdToken(creds);
  if (error) {
    if (error.code && EXISTS.has(error.code)) throw new AccountExistsError('apple');
    throw error;
  }
  // Apple은 이름을 처음 한 번만 알려 준다 → 프로필에 저장
  const name = [cred.fullName?.familyName, cred.fullName?.givenName].filter(Boolean).join('');
  if (name) await updateDisplayName(name);
}

export const appleNativeAvailable = () =>
  Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false);

/**
 * 이메일 — 비밀번호 없이 6자리 코드로.
 * link: 익명 계정에 이메일을 붙인다 (updateUser → 코드 메일 → 'email_change' 확인)
 * signin: 다른 기기에서 기존 계정으로 들어온다 (signInWithOtp → 'email' 확인)
 */
export async function emailSendCode(email: string, mode: 'link' | 'signin') {
  const sb = need();
  if (mode === 'link') {
    const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: redirectTo() });
    if (error) {
      if (error.code && EXISTS.has(error.code)) throw new AccountExistsError('email');
      throw error;
    }
  } else {
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: redirectTo() } });
    if (error) throw error;
  }
}

export async function emailVerifyCode(email: string, token: string, mode: 'link' | 'signin') {
  const sb = need();
  const { error } = await sb.auth.verifyOtp({ email, token, type: mode === 'link' ? 'email_change' : 'email' });
  if (error) throw error;
}

export async function updateDisplayName(name: string) {
  const sb = need();
  const { data } = await sb.auth.getUser();
  if (!data.user) return;
  await sb.from('profiles').upsert({ id: data.user.id, display_name: name.slice(0, 30) });
}

/** 로그아웃 — 다음에 앱을 쓰면 새 익명 계정으로 시작한다 */
export async function signOut() {
  await need().auth.signOut();
}

/** 계정 삭제 — 서버 함수가 확인 후 계정과 모든 기록(일정·무료 횟수·구매 기록 연결)을 지운다 */
export async function deleteAccount() {
  const sb = need();
  const { error } = await sb.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await sb.auth.signOut({ scope: 'local' });
}
