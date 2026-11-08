// Linus Company 즉시 푸시 워커 (Cloudflare Workers)
// 앱이 메시지를 보낸 직후 POST /notify {id} 를 부르면, 비공개 동기화 Gist에서 그 메시지와 기기 구독을 읽어
// 바로 웹 푸시를 보내요. 메시지 내용은 앱이 보내지 않고 Gist에서만 읽어서, 가짜 요청으로는 알림을 만들 수 없어요.
// 필요한 비밀값(Workers → Settings → Variables and Secrets): GIST_TOKEN, GIST_ID, VAPID_PRIVATE_KEY
// 선택값: ALLOWED_ORIGIN(기본 https://linuscompany.co.kr, 쉼표로 여러 개), VAPID_SUBJECT
// 외부 라이브러리 없이 WebCrypto만 써요(RFC 8291 aes128gcm 암호화 + RFC 8292 VAPID).

const API = 'https://api.github.com';
const te = new TextEncoder();
const ROOM_NAMES = { notice: '공지사항', talk: '업무 대화', alert: '알림' };
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
  const rm = ((g.D.set && g.D.set.rooms) || []).find((r) => r.id === msg.room);
  const allow = rm && (Array.isArray(rm.members) || rm.staff) ? new Set(['관리자', ...(rm.members || [])]) : null; // 참여자가 정해진 방은 참여자·관리자에게만
  const roomName = rm?.name || ROOM_NAMES[msg.room] || '메신저';
  const payload = { room: msg.room, preview: { title: `${roomName} · ${dn(msg.by)}`, body: clip(msg.text || '[사진]', 120) || '[사진]' } };
  let sent = 0, failed = 0;
  for (const s of (g.D.pushsubs || []).filter((x) => x && x.sub && x.sub.endpoint)) {
    const eh = await hash16(s.sub.endpoint);
    if (dead[eh]) continue;
    if (msg.by === s.name || msg.actor === s.name) continue;
    if (allow && !allow.has(s.name)) continue;
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


/* ---------- 이메일 계정: 회원가입(POST /signup) · 로그인(POST /login) ----------
   계정 목록은 같은 비공개 Gist의 accounts.json 에 있어요. 가입하면 '승인 대기'로 들어가고, 관리자가 앱 「직원 관리」에서 승인해야 로그인돼요.
   비밀번호는 앱이 먼저 PBKDF2(30만 회)로 바꾼 값(ph)만 보내고, 워커는 계정마다 다른 소금(salt)을 붙여 SHA-256으로 한 번 더 바꿔 저장해요.
   비밀번호 원문은 워커에도 Gist에도 남지 않아요. */
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const PH_RE = /^[0-9a-f]{64}$/;
const hex = (buf) => Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, '0')).join('');
const sha256hex = async (s) => hex(await crypto.subtle.digest('SHA-256', te.encode(s)));
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const normEmail = (e) => String(e || '').trim().toLowerCase();

export async function loadAccts(env, doFetch = fetch) {
  const headers = { Authorization: `Bearer ${env.GIST_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'linus-push-worker' };
  const r = await doFetch(`${API}/gists/${env.GIST_ID}`, { headers });
  if (!r.ok) throw new Error(`gist ${r.status}`);
  const f = ((await r.json()).files || {})['accounts.json'];
  const text = f ? (f.truncated ? await (await doFetch(f.raw_url, { headers })).text() : f.content) : '';
  let A = { v: 1, users: [] };
  try { const j = JSON.parse(text || '{}'); if (j && Array.isArray(j.users)) A = j; } catch {}
  return { A, headers };
}
async function saveAccts(env, A, headers, doFetch = fetch) {
  const r = await doFetch(`${API}/gists/${env.GIST_ID}`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ files: { 'accounts.json': { content: JSON.stringify(A, null, 1) } } }) });
  if (!r.ok) throw new Error(`gist save ${r.status}`);
}

// 실패·가입 횟수 제한 (워커 인스턴스마다 따로 세는 간단한 방식)
const tries = new Map();
function over(key, limit, windowMs) {
  const now = Date.now(), a = (tries.get(key) || []).filter((t) => now - t < windowMs);
  tries.set(key, a);
  if (tries.size > 2000) for (const k of tries.keys()) { tries.delete(k); if (tries.size < 1000) break; }
  return a.length >= limit;
}
const mark = (key) => { const a = tries.get(key) || []; a.push(Date.now()); tries.set(key, a); };

export async function signup(body, ip, env, deps = {}) {
  const doFetch = deps.fetch || fetch;
  const email = normEmail(body.email), name = clip(body.name, 30), ph = String(body.ph || '');
  if (!EMAIL_RE.test(email) || !name || !PH_RE.test(ph)) return { status: 400, body: { error: 'bad request' } };
  if (over(`su:${ip}`, 5, 3600000)) return { status: 429, body: { error: 'slow down' } };
  mark(`su:${ip}`);
  const { A, headers } = await loadAccts(env, doFetch);
  const u = A.users.find((x) => x.email === email);
  if (u && u.status === 'reset') { // 관리자가 비밀번호를 초기화한 계정: 새 비밀번호로 다시 승인 대기
    const salt = randHex(16);
    Object.assign(u, { name, status: 'pending', salt, h: await sha256hex(`${salt}:${ph}`), at: Date.now(), u: Date.now() });
    await saveAccts(env, A, headers, doFetch);
    return { status: 200, body: { ok: true, status: 'pending' } };
  }
  if (u) return u.status === 'pending' ? { status: 200, body: { ok: true, status: 'pending' } } : { status: 409, body: { error: 'exists' } };
  if (A.users.filter((x) => x.status === 'pending').length >= 100) return { status: 429, body: { error: 'too many pending' } };
  const salt = randHex(16), now = Date.now();
  A.users.push({ email, name, role: 'staff', status: 'pending', salt, h: await sha256hex(`${salt}:${ph}`), at: now, u: now });
  await saveAccts(env, A, headers, doFetch);
  return { status: 200, body: { ok: true, status: 'pending' } };
}

export async function login(body, ip, env, deps = {}) {
  const doFetch = deps.fetch || fetch;
  const email = normEmail(body.email), ph = String(body.ph || '');
  if (!EMAIL_RE.test(email) || !PH_RE.test(ph)) return { status: 400, body: { error: 'bad request' } };
  if (over(`lf:${email}`, 5, 900000) || over(`li:${ip}`, 20, 900000)) return { status: 429, body: { error: 'slow down' } };
  const { A } = await loadAccts(env, doFetch);
  const u = A.users.find((x) => x.email === email);
  if (u && u.status === 'reset') return { status: 403, body: { error: 'reset' } };
  const ok = !!u && u.salt && sameKey(await sha256hex(`${u.salt}:${ph}`), u.h || '');
  if (!ok) { mark(`lf:${email}`); mark(`li:${ip}`); return { status: 401, body: { error: 'invalid' } }; }
  if (u.status === 'pending') return { status: 403, body: { error: 'pending' } };
  if (u.status !== 'approved') return { status: 403, body: { error: 'denied' } };
  tries.delete(`lf:${email}`);
  return { status: 200, body: { ok: true, token: env.GIST_TOKEN, gist: env.GIST_ID, role: u.role === 'admin' ? 'admin' : 'staff', name: u.name, email } };
}

/* ---------- Notion 일정표 연동 (POST /cal) ----------
   앱 일정표 ↔ Notion '스케쥴' 데이터베이스. 비밀값: NOTION_TOKEN(내부 통합 토큰), NOTION_DB_ID(데이터베이스 ID), CAL_KEY(앱과 나눠 가진 접속 키)
   앱이 보낸 일정만 쓰고(최대 20건), 지운 일정은 Notion 휴지통으로 보내요(복구 가능). 보관·삭제 외에 Notion 데이터를 지우지 않아요. */
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const KST = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
let _schema = null;
async function nfetch(env, path, method = 'GET', body) {
  const r = await fetch('https://api.notion.com' + path, { method, headers: { Authorization: 'Bearer ' + env.NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || 'notion ' + r.status); e.status = r.status; throw e; }
  return j;
}
async function calSchema(env) {
  if (_schema && _schema.id === env.NOTION_DB_ID) return _schema;
  const db = await nfetch(env, '/v1/databases/' + env.NOTION_DB_ID);
  const ps = Object.entries(db.properties || {});
  const by = (t, pref) => { const l = ps.filter(([, p]) => p.type === t); return (l.find(([n]) => pref && pref.includes(n)) || l[0] || [])[0] || ''; };
  const status = by('status', ['상태']);
  const cat = by('select', ['일정분류', '분류']);
  const opts = status ? db.properties[status].status.options.map((o) => o.name) : [];
  _schema = {
    id: env.NOTION_DB_ID, name: (db.title || []).map((t) => t.plain_text).join(''),
    title: by('title'), date: by('date', ['날짜', 'Date', '일정']), memo: by('rich_text', ['한줄메모', '메모']),
    cat, catOpts: cat ? db.properties[cat].select.options.map((o) => o.name) : [], status, statusOpt: opts.find((n) => /일정/.test(n)) || '',
  };
  return _schema;
}
function fromNotionDate(d) {
  if (!d || !d.start) return null;
  const one = (x) => { if (x.length <= 10) return { date: x, time: '' }; const q = KST.format(new Date(x)); return { date: q.slice(0, 10), time: q.slice(11, 16) }; };
  const a = one(d.start), b = d.end ? one(d.end) : null;
  return { date: a.date, time: a.time, end: b && b.date > a.date ? b.date : '' };
}
function toNotionDate(e) {
  if (e.time) return { start: `${e.date}T${e.time}:00+09:00`, end: e.end && e.end > e.date ? `${e.end}T${e.time}:00+09:00` : null };
  return { start: e.date, end: e.end && e.end > e.date ? e.end : null };
}
function calClean(x) {
  if (!x || !YMD.test(x.date || '') || !String(x.title || '').trim()) return null;
  return { title: String(x.title).trim().slice(0, 200), date: x.date, end: YMD.test(x.end || '') ? x.end : '', time: HM.test(x.time || '') ? x.time : '', memo: String(x.memo || '').slice(0, 1800), cat: String(x.cat || '').slice(0, 40) };
}
function calProps(s, e, create) {
  const p = {};
  p[s.title] = { title: [{ text: { content: e.title } }] };
  if (s.date) p[s.date] = { date: toNotionDate(e) };
  if (s.memo) p[s.memo] = { rich_text: e.memo ? [{ text: { content: e.memo } }] : [] };
  if (s.cat && e.cat && s.catOpts.includes(e.cat)) p[s.cat] = { select: { name: e.cat } };
  if (create && s.status && s.statusOpt) p[s.status] = { status: { name: s.statusOpt } };
  return p;
}
async function calList(env, s, from, to) {
  const and = [{ property: s.date, date: { on_or_after: from } }, { property: s.date, date: { on_or_before: to } }];
  if (s.status && s.statusOpt) and.push({ property: s.status, status: { equals: s.statusOpt } });
  const out = [];
  let cursor;
  for (let i = 0; i < 4; i++) {
    const r = await nfetch(env, `/v1/databases/${env.NOTION_DB_ID}/query`, 'POST', { filter: { and }, page_size: 100, start_cursor: cursor });
    for (const pg of r.results || []) {
      const pr = pg.properties || {}, d = fromNotionDate((pr[s.date] || {}).date);
      if (!d) continue;
      out.push({ nid: pg.id, title: ((pr[s.title] || {}).title || []).map((t) => t.plain_text).join('') || '(제목 없음)', ...d, memo: ((pr[s.memo] || {}).rich_text || []).map((t) => t.plain_text).join(''), cat: s.cat && (pr[s.cat] || {}).select ? pr[s.cat].select.name : '' });
    }
    if (!r.has_more) break;
    cursor = r.next_cursor;
  }
  return out;
}
const sameKey = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function calHandle(req, env, json) {
  if (!(env.NOTION_TOKEN && env.NOTION_DB_ID && env.CAL_KEY)) return json({ error: 'not configured' }, 503);
  if (!sameKey(req.headers.get('x-cal-key') || '', env.CAL_KEY)) return json({ error: 'forbidden' }, 403);
  let b;
  try { b = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  try {
    const s = await calSchema(env);
    if (!s.title || !s.date) return json({ error: 'DB에 제목·날짜 속성이 없어요' }, 422);
    if (b.op === 'check') return json({ ok: true, db: s.name, title: s.title, date: s.date, memo: s.memo, cat: s.cat, status: s.status, statusOpt: s.statusOpt });
    const from = YMD.test(b.from || '') ? b.from : '', to = YMD.test(b.to || '') ? b.to : '';
    if (b.op !== 'sync' || !from || !to) return json({ error: 'bad request' }, 400);
    const map = {}, failed = [], deleted = [];
    for (const x of (Array.isArray(b.push) ? b.push : []).slice(0, 20)) {
      const e = calClean(x);
      if (!e || !x.ref) { failed.push(String(x.ref || '')); continue; }
      try {
        if (x.nid && UUID.test(x.nid)) { await nfetch(env, '/v1/pages/' + x.nid, 'PATCH', { properties: calProps(s, e, false) }); map[x.ref] = x.nid; }
        else { const r = await nfetch(env, '/v1/pages', 'POST', { parent: { database_id: env.NOTION_DB_ID }, properties: calProps(s, e, true) }); map[x.ref] = r.id; }
      } catch { failed.push(String(x.ref)); }
    }
    for (const nid of (Array.isArray(b.del) ? b.del : []).slice(0, 15)) {
      if (!UUID.test(nid || '')) continue;
      try { await nfetch(env, '/v1/pages/' + nid, 'PATCH', { archived: true }); deleted.push(nid); } catch (e) { if (e.status === 404 || e.status === 400) deleted.push(nid); }
    }
    return json({ ok: true, events: await calList(env, s, from, to), map, failed, deleted });
  } catch (e) {
    return json({ error: e.status === 401 ? 'Notion 토큰이 올바르지 않아요' : e.status === 404 ? 'Notion 데이터베이스를 찾지 못했어요. 통합에 데이터베이스를 연결(공유)했는지 확인해 주세요' : String(e.message || 'failed').slice(0, 160) }, 502);
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || 'https://linuscompany.co.kr').split(',').map((s) => s.trim());
    const okOrigin = allowed.includes(origin) || (env.ALLOW_LOCALHOST === '1' && /^http:\/\/localhost(:\d+)?$/.test(origin));
    const cors = { 'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type, x-cal-key', Vary: 'Origin' };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/health' && url.searchParams.get('check') === '1') {
      const out = { ok: true, version: 5, gist_token: !!env.GIST_TOKEN, gist_id: !!env.GIST_ID };
      if (env.GIST_TOKEN && env.GIST_ID) {
        try {
          const r = await fetch(`${API}/gists/${env.GIST_ID}`, { method: 'HEAD', headers: { Authorization: `Bearer ${env.GIST_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'linus-push-worker' } });
          out.gist_read = r.status;
          const sc = r.headers.get('x-oauth-scopes');
          out.token_type = sc === null ? 'fine-grained' : 'classic';
          if (sc !== null) out.gist_write = sc.split(',').map((x) => x.trim()).includes('gist');
        } catch (e) { out.gist_read = 'error'; }
      }
      return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, configured: !!(env.GIST_TOKEN && env.GIST_ID && env.VAPID_PRIVATE_KEY), cal: !!(env.NOTION_TOKEN && env.NOTION_DB_ID && env.CAL_KEY), auth: !!(env.GIST_TOKEN && env.GIST_ID), version: 5 }), { headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } }); // 연결 확인용: 어느 주소에서 열어도 응답
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
    if ((url.pathname === '/signup' || url.pathname === '/login') && req.method === 'POST') {
      if (!okOrigin) return json({ error: 'forbidden' }, 403);
      const ip = req.headers.get('CF-Connecting-IP') || 'x';
      if (throttled(ip)) return json({ error: 'slow down' }, 429);
      if (!(env.GIST_TOKEN && env.GIST_ID)) return json({ error: 'not configured' }, 503);
      let body = {};
      try { body = (await req.json()) || {}; } catch { return json({ error: 'bad request' }, 400); }
      try {
        const r = await (url.pathname === '/signup' ? signup : login)(body, ip, env);
        return json(r.body, r.status);
      } catch (e) {
        // 원인(예: 'gist 401', 'gist save 403')만 알려 줘요. 토큰·내용은 넣지 않아요.
        return json({ error: 'failed', detail: String((e && e.message) || e).slice(0, 80) }, 502);
      }
    }
    if (url.pathname === '/cal' && req.method === 'POST') {
      if (!okOrigin) return json({ error: 'forbidden' }, 403);
      if (throttled(req.headers.get('CF-Connecting-IP') || 'x')) return json({ error: 'slow down' }, 429);
      return calHandle(req, env, json);
    }
    return json({ error: 'not found' }, 404);
  },
};
