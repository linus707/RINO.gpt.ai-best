// 앱 토큰 인증.
// 앱이 `Authorization: Bearer <APP_TOKEN>` 헤더를 보내야 요청을 받아 줍니다.
// 주의: 이 토큰은 앱 안에 들어가므로 완전한 비밀이 아닙니다. 요청 제한과 함께 써야 합니다.

import { errors } from "./http.js";

async function sha256(text) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(bytes);
}

/** 길이나 내용에 따라 비교 시간이 달라지지 않도록 해시끼리 비교합니다. */
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function requireAppToken(request, env) {
  // 서버에 토큰이 설정되지 않았으면 모든 요청을 거절합니다 (실수로 열린 채 배포되는 것 방지).
  if (!env.APP_TOKEN) throw errors.misconfigured();

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !(await safeEqual(match[1].trim(), env.APP_TOKEN))) {
    throw errors.unauthorized();
  }
}
