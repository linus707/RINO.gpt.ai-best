// Linus Company 즉시 푸시 워커 (Cloudflare Workers)
// 앱이 메시지를 보낸 직후 POST /notify {id} 를 부르면, 비공개 동기화 Gist에서 그 메시지와 기기 구독을 읽어
// 바로 웹 푸시를 보내요. 메시지 내용은 앱이 보내지 않고 Gist에서만 읽어서, 가짜 요청으로는 알림을 만들 수 없어요.
// 필요한 비밀값(Workers → Settings → Variables and Secrets): GIST_TOKEN, GIST_ID, VAPID_PRIVATE_KEY
// 선택값: ALLOWED_ORIGIN(기본 https://linuscompany.co.kr, 쉼표로 여러 개), VAPID_SUBJECT
// 외부 라이브러리 없이 WebCrypto만 써요(RFC 8291 aes128gcm 암호화 + RFC 8292 VAPID).

const API = 'https://api.github.com';
const te = new TextEncoder();
const ROOM_NAMES = { notice: '공지사항', talk: '업무 소통', alert: '알림' };
const dn = (n) => (n === '관리자' ? '리노' : n || '');
const clip = (s, n) => Array.from(String(s || '').replace(/\s+/g, ' ').trim()).slice(0, n).join('');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const b64u = (buf) => {
  const a = new Uint8Array(buf);
  let s = '';
  for (const c of a) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const unb64u = (s) => {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const r = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(r, (c) => c.charCodeAt(0));
};
const concat = (...a) => {
  const o = new Uint8Array(a.reduce((x, y) => x + y.length, 0));
  let i = 0;
  for (const y of a) { o.set(y, i); i += y.length; }
  return o;
};
async function hkdf(ikm, salt, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
async function hash16(s) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(String(s))));
  return Array.from(d.slice(0, 8)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// 웹 푸시 본문 암호화 (RFC 8291, aes128gcm)
export async function encryptPayload(sub, plaintext) {
  const uaPub = unb64u(sub.keys.p256dh);
  const auth = unb64u(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(secret, auth, concat(te.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(ikm, salt, te.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const data = concat(te.encode(plaintext), new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, data));
  return concat(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPub.length]), asPub, ct);
}

// VAPID 인증 헤더 (RFC 8292, ES256)
export async function vapidAuth(endpoint, pubB64, privB64, subject, nowSec = Math.floor(Date.now() / 1000)) {
  const pub = unb64u(pubB64);
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: privB64, ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: nowSec + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(`${head}.${body}`)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${pubB64}`;
}

async function sendPush(sub, payload, env, pub, doFetch) {
  const body = await encryptPayload(sub, JSON.stringify(payload));
  const auth = await vapidAuth(sub.endpoint, pub, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT || 'mailto:admin@linuscompany.co.kr');
  return doFetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '3600', Urgency: 'high' },
    body,
  });
}

async function loadGist(env, doFetch) {
  const headers = { Authorization: `Bearer ${env.GIST_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'linus-push-worker' };
  const r = await doFetch(`${API}/gists/${env.GIST_ID}`, { headers });
  if (!r.ok) throw new Error(`gist ${r.status}`);
  const files = (await r.json()).files || {};
  const read = async (f) => (f ? (f.truncated ? await (await doFetch(f.raw_url, { headers })).text() : f.content) : null);
  return { D: JSON.parse((await read(files['rino-workspace.json'])) || '{}'), state: JSON.parse((await read(files['push-state.json'])) || '{}'), headers };
}

// 메시지 하나를 받을 기기에 푸시로 보내요 (보낸 사람 제외, 방별 끄기·멘션 예외 반영)
export async function notify(id, env, deps = {}) {
  const doFetch = deps.fetch || fetch;
  const now = deps.now || Date.now();
  let g, msg;
  for (let i = 0; i < 4; i++) {
    g = await loadGist(env, doFetch);
    msg = (g.D.msgs || []).find((m) => m && m.id === id);
    if (msg) break;
    await sleep(deps.wait ?? 1500); // 앱의 동기화가 Gist에 올라가기를 잠깐 기다려요
  }
  if (!msg) return { status: 404, body: { error: 'not found' } };
  const pub = g.D.set && g.D.set.push && g.D.set.push.pub;
  if (!pub) return { status: 409, body: { error: 'no key' } };
  const state = g.state;
  if (!Array.isArray(state.seen)) state.seen = [];
  if (state.seen.includes(id)) return { status: 200, body: { sent: 0, dup: true } };
  if (now - msg.t > 10 * 60 * 1000) return { status: 200, body: { sent: 0, old: true } };
  state.seen = [...state.seen, id].slice(-500);
  const dead = state.dead || {};
  const save = () => doFetch(`${API}/gists/${env.GIST_ID}`, { method: 'PATCH', headers: { ...g.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ files: { 'push-state.json': { content: JSON.stringify({ ...state, dead }) } } }) });
  await save(); // 먼저 '보냄'으로 기록해 두 군데서 동시에 보내도 중복을 줄여요
  const roomName = ((g.D.set && g.D.set.rooms) || []).find((r) => r.id === msg.room)?.name || ROOM_NAMES[msg.room] || '메신저';
  const payload = { room: msg.room, preview: { title: `${roomName} · ${dn(msg.by)}`, body: clip(msg.text || '[사진]', 120) || '[사진]' } };
  let sent = 0, failed = 0;
  for (const s of (g.D.pushsubs || []).filter((x) => x && x.sub && x.sub.endpoint)) {
    const eh = await hash16(s.sub.endpoint);
    if (dead[eh]) continue;
    if (msg.by === s.name || msg.actor === s.name) continue;
    if (s.mute && s.mute[msg.room] && !(msg.text || '').includes('@' + dn(s.name))) continue;
    try {
      const r = await sendPush(s.sub, payload, env, pub, doFetch);
      if (r.status === 404 || r.status === 410) { dead[eh] = now; failed++; }
      else if (r.ok) sent++;
      else failed++;
    } catch { failed++; }
  }
  if (failed) await save();
  return { status: 200, body: { sent, failed } };
}

const hits = new Map(); // 아주 단순한 속도 제한(분당 60회)
function throttled(ip) {
  const k = `${ip}:${Math.floor(Date.now() / 60000)}`;
  const n = (hits.get(k) || 0) + 1;
  hits.set(k, n);
  if (hits.size > 500) for (const key of hits.keys()) { hits.delete(key); if (hits.size < 250) break; }
  return n > 60;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || 'https://linuscompany.co.kr').split(',').map((s) => s.trim());
    const okOrigin = allowed.includes(origin) || (env.ALLOW_LOCALHOST === '1' && /^http:\/\/localhost(:\d+)?$/.test(origin));
    const cors = { 'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type', Vary: 'Origin' };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/health') {
      return json({ ok: true, configured: !!(env.GIST_TOKEN && env.GIST_ID && env.VAPID_PRIVATE_KEY), version: 1 });
    }
    if (url.pathname === '/notify' && req.method === 'POST') {
      if (!okOrigin) return json({ error: 'forbidden' }, 403);
      if (throttled(req.headers.get('CF-Connecting-IP') || 'x')) return json({ error: 'slow down' }, 429);
      if (!(env.GIST_TOKEN && env.GIST_ID && env.VAPID_PRIVATE_KEY)) return json({ error: 'not configured' }, 503);
      let id = '';
      try { id = String((await req.json()).id || ''); } catch { return json({ error: 'bad request' }, 400); }
      if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) return json({ error: 'bad id' }, 400);
      try {
        const r = await notify(id, env);
        return json(r.body, r.status);
      } catch (e) {
        return json({ error: 'failed' }, 502);
      }
    }
    return json({ error: 'not found' }, 404);
  },
};
