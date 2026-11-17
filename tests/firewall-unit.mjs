import w, { firewallReset, ROUTES } from '../worker/worker.js';
import assert from 'node:assert/strict';
const ORI = 'https://linuscompany.co.kr';
const env = { GIST_TOKEN: 't', GIST_ID: 'abcdefabcdefabcdefabcdef', VAPID_PRIVATE_KEY: 'k', CAL_KEY: 'secretkeysecretkey12', NOTION_TOKEN: 'n', NOTION_DB_ID: 'd' };
let calls = [];
globalThis.fetch = async (u, o) => { calls.push(String(u)); return new Response(JSON.stringify({ files: { 'accounts.json': { content: '{"v":1,"users":[]}' }, 'rino-workspace.json': { content: '{}' } } }), { status: 200 }); };
const rq = (path, { method = 'GET', ip = '1.1.1.1', origin = ORI, body, ct = 'application/json', ua = 'Mozilla/5.0', headers = {} } = {}) => {
  const h = { 'CF-Connecting-IP': ip, 'User-Agent': ua, ...headers };
  if (origin) h.Origin = origin;
  if (body !== undefined && ct) h['Content-Type'] = ct;
  return w.fetch(new Request('https://w.example.workers.dev' + path, { method, headers: h, body }), env);
};
const j = async (r) => [r.status, await r.json()];
let n = 0; const t = async (name, fn) => { firewallReset(); calls = []; await fn(); n++; console.log('ok', name); };

await t('health passes + firewall flag + security headers', async () => {
  const r = await rq('/health'); const b = await r.json();
  assert.equal(r.status, 200); assert.equal(b.firewall, true); assert.equal(b.version, 6); assert.equal(b.configured, true);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('cache-control'), 'no-store'); assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
});
await t('preflight ok with CORS', async () => {
  const r = await rq('/login', { method: 'OPTIONS' }); assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-origin'), ORI); assert.equal(r.headers.get('access-control-max-age'), '600');
});
await t('valid login request reaches handler (401 invalid)', async () => {
  const [s, b] = await j(await rq('/login', { method: 'POST', body: JSON.stringify({ email: 'a@b.co', ph: 'a'.repeat(64) }) }));
  assert.equal(s, 401); assert.equal(b.error, 'invalid'); assert.equal(calls.length, 1);
});
await t('valid signup works', async () => {
  const [s, b] = await j(await rq('/signup', { method: 'POST', body: JSON.stringify({ email: 'a@b.co', name: '홍길동', ph: 'a'.repeat(64) }) }));
  assert.equal(s, 200); assert.equal(b.status, 'pending');
});
await t('notify bad id still 400, valid id reaches gist', async () => {
  assert.equal((await rq('/notify', { method: 'POST', body: '{"id":"!!"}' })).status, 400);
  const r = await rq('/notify', { method: 'POST', body: '{"id":"abc123"}', ip: '1.1.1.2' }); assert.ok(calls.length >= 1); assert.ok([404, 502].includes(r.status));
});
await t('unknown path 404, no backend call', async () => { assert.equal((await rq('/admin')).status, 404); assert.equal(calls.length, 0); });
await t('wrong method 405', async () => { assert.equal((await rq('/login')).status, 405); assert.equal((await rq('/health', { method: 'DELETE' })).status, 405); });
await t('POST from other origin 403; no origin 403', async () => {
  assert.equal((await rq('/login', { method: 'POST', origin: 'https://evil.example', body: '{}' })).status, 403);
  assert.equal((await rq('/login', { method: 'POST', origin: '', body: '{}' })).status, 403); assert.equal(calls.length, 0);
});
await t('non-JSON content-type 415', async () => { assert.equal((await rq('/login', { method: 'POST', body: 'a=1', ct: 'text/plain' })).status, 415); });
await t('oversize by Content-Length 413', async () => { assert.equal((await rq('/notify', { method: 'POST', body: JSON.stringify({ id: 'x'.repeat(2000) }) })).status, 413); assert.equal(calls.length, 0); });
await t('oversize streamed without honest length 413', async () => {
  const big = new TextEncoder().encode(JSON.stringify({ id: 'y'.repeat(5000) }));
  const stream = new ReadableStream({ start(c) { c.enqueue(big); c.close(); } });
  const r = await w.fetch(new Request('https://w.example.workers.dev/notify', { method: 'POST', duplex: 'half', body: stream, headers: { Origin: ORI, 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.1.1.1' } }), env);
  assert.equal(r.status, 413); assert.equal(calls.length, 0);
});
await t('array/null JSON body 400', async () => { assert.equal((await rq('/login', { method: 'POST', body: '[1]' })).status, 400); assert.equal((await rq('/login', { method: 'POST', body: 'null' })).status, 400); assert.equal((await rq('/login', { method: 'POST', body: '{bad' })).status, 400); });
await t('scanner paths ban instantly', async () => {
  for (const [i, p] of ['/.env', '/wp-login.php', '/x.php?a=1', '/.git/config', '/health?q=%3Cscript%3E', '/health?id=1+union+select+1', '/phpmyadmin/'].entries()) {
    const ip = '9.9.9.' + i; assert.equal((await rq(p, { ip })).status, 403, p); assert.equal((await rq('/health', { ip })).status, 403, 'banned after ' + p);
  }
  assert.equal((await rq('/health', { ip: '1.1.1.1' })).status, 200);
});
await t('scanner user-agent banned', async () => { assert.equal((await rq('/health', { ua: 'sqlmap/1.7' })).status, 403); assert.equal((await rq('/health')).status, 403); });
await t('10 violations -> 15 min ban, other IPs unaffected', async () => {
  for (let i = 0; i < 9; i++) assert.equal((await rq('/nope' + i)).status, 404);
  assert.equal((await rq('/health')).status, 200);
  assert.equal((await rq('/nope')).status, 404);
  const [s, b] = await j(await rq('/health')); assert.equal(s, 403); assert.equal(b.error, 'blocked');
  assert.equal((await rq('/login', { method: 'OPTIONS' })).status, 403);
  assert.equal((await rq('/health', { ip: '2.2.2.2' })).status, 200);
});
await t('wrong cal key counts toward ban', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await rq('/cal', { method: 'POST', body: '{"op":"check"}', headers: { 'x-cal-key': 'wrong' + i } })).status, 403);
  assert.equal((await rq('/health')).status, 403);
});
await t('rate limit 60/min then 429 (no ban)', async () => {
  for (let i = 0; i < 60; i++) assert.equal((await rq('/health')).status, 200);
  assert.equal((await rq('/health')).status, 429);
  assert.equal((await rq('/health', { ip: '3.3.3.3' })).status, 200);
});
await t('failed logins do not ban the user (own limiter only)', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await rq('/login', { method: 'POST', body: JSON.stringify({ email: 'z@b.co', ph: 'b'.repeat(64) }) })).status, 401);
  assert.equal((await rq('/login', { method: 'POST', body: JSON.stringify({ email: 'z@b.co', ph: 'b'.repeat(64) }) })).status, 429);
  assert.equal((await rq('/health')).status, 200);
});
await t('localhost origin only with ALLOW_LOCALHOST', async () => {
  assert.equal((await rq('/login', { method: 'POST', origin: 'http://localhost:8000', body: '{}' })).status, 403);
});
console.log(n, 'tests passed; route limits', JSON.stringify(ROUTES));
