/**
 * 소셜 로그인 후 돌아온 주소에서 결과를 읽는다.
 * 예) rinotrip://auth/callback?code=abc  → 성공(코드 교환)
 *     ...#error=server_error&error_code=identity_already_exists&error_description=... → 실패
 */
export type CallbackResult =
  | { kind: 'code'; code: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; code: string; message: string }
  | { kind: 'none' };

export function parseAuthCallback(url: string): CallbackResult {
  const params = new Map<string, string>();
  const take = (part: string) => {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const i = pair.indexOf('=');
      const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
      const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      params.set(k, v);
    }
  };
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
  const q = beforeHash.indexOf('?');
  if (q >= 0) take(beforeHash.slice(q + 1));
  if (hashAt >= 0) take(url.slice(hashAt + 1));

  const errorCode = params.get('error_code') || params.get('error');
  if (errorCode) return { kind: 'error', code: errorCode, message: params.get('error_description') ?? '' };
  const code = params.get('code');
  if (code) return { kind: 'code', code };
  const at = params.get('access_token'), rt = params.get('refresh_token');
  if (at && rt) return { kind: 'tokens', accessToken: at, refreshToken: rt };
  return { kind: 'none' };
}
