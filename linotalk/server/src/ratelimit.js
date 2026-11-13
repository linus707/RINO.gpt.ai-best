// 요청 제한 (rate limit).
// 1) Cloudflare의 Rate Limiting 바인딩이 있으면 그것을 씁니다 (wrangler.toml의 [[ratelimits]]).
// 2) 추가로, 서버 메모리에 간단한 카운터를 둡니다. 로컬 실행·테스트에서도 동작하게 하는 안전망입니다.
//    (Cloudflare는 서버 인스턴스가 여러 개라 메모리 카운터만으로는 정확하지 않습니다.)

import { errors } from "./http.js";

const WINDOW_MS = 60_000;
export const LIMITS = { device: 40, ip: 120 }; // 1분당 허용 횟수

const counters = new Map(); // key → { count, resetAt }

function memoryAllow(key, limit, now) {
  const entry = counters.get(key);
  if (!entry || entry.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // 오래된 기록 정리 (메모리가 계속 늘지 않게)
    if (counters.size > 5000) {
      for (const [k, v] of counters) if (v.resetAt <= now) counters.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

async function allow(binding, key, limit, now) {
  if (!memoryAllow(key, limit, now)) return false;
  if (binding) {
    const { success } = await binding.limit({ key });
    if (!success) return false;
  }
  return true;
}

/** 기기 ID는 앱이 설치 때 만든 무작위 값입니다. 사람을 식별하는 정보가 아닙니다. */
function installId(request) {
  const id = request.headers.get("x-install-id") ?? "";
  return /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
}

export async function enforceRateLimit(request, env, now = Date.now()) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!(await allow(env.RL_IP, `ip:${ip}`, LIMITS.ip, now))) throw errors.rateLimited();

  const device = installId(request);
  if (device && !(await allow(env.RL_DEVICE, `dev:${device}`, LIMITS.device, now))) {
    throw errors.rateLimited();
  }
}

/** 테스트용: 메모리 카운터 초기화 */
export function resetRateLimitForTests() {
  counters.clear();
}
