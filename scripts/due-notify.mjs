// 미수금 푸시 알림 (GitHub Actions에서 5분마다 실행, 하루에 한 번만 보내요)
// 동기화 Gist(비공개)의 장부에서 잔금이 남은 주문을 찾아, 예정일이 지났거나 3일 이내인 건이 있으면
// 앱 설정의 시각(기본 오전 9시, 한국 시간) 이후 첫 실행 때 관리자 기기로 웹 푸시를 한 번 보내요.
// 기본 알림에는 건수와 금액만 담고, 고객 이름은 앱에서 '알림에 고객 이름 표시'를 켰을 때만 넣어요. 내용은 로그에 남기지 않아요.
// 필요한 비밀값: SYNC_GIST_TOKEN, SYNC_GIST_ID, VAPID_PRIVATE_KEY (기존과 같아요)
import webpush from 'web-push';
import { createHash } from 'node:crypto';

const API = 'https://api.github.com';
const ADMIN = '관리자';
const hash = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
const clip = (s, n) => Array.from(String(s || '').replace(/\s+/g, ' ').trim()).slice(0, n).join('');
const kst = (ms) => new Date(ms + 9 * 3600e3);
const ymdOf = (d) => d.toISOString().slice(0, 10);

/* 앱(index.html)의 ledCalc·ledPayInfo·ledDueAlerts와 같은 계산이에요 */
export function calcReal(e) {
  const n = (v) => Math.max(0, +v || 0), pct = (v) => Math.min(100, n(v));
  let price, da;
  if (Array.isArray(e.lines) && e.lines.length) {
    price = 0; da = 0;
    for (const l of e.lines) { const q = Math.max(1, Math.round(+l.qty || 1)), p = n(l.price) * q; price += p; da += Math.round(p * pct(l.disc) / 100); }
    if (e.bundle) da = +e.bfinal > 0 ? Math.min(price, Math.max(0, price - Math.round(+e.bfinal))) : Math.round(price * pct(e.bdisc) / 100);
  } else { price = n(e.price); da = Math.round(price * pct(e.disc) / 100); }
  return price - da;
}
export function payInfo(x) {
  const pays = Array.isArray(x.pays) ? x.pays : [];
  let recv = 0, canc = 0;
  for (const p of pays) { const a = Math.max(0, Math.round(+p.amount || 0)); if (p.kind === '취소') canc += a; else recv += a; }
  const total = +x.total > 0 ? Math.round(+x.total) : calcReal(x), net = recv - canc, due = total - net;
  return { pays, total, net, due, st: !pays.length ? 'unset' : net <= 0 ? 'none' : due > 0 ? 'partial' : due === 0 ? 'paid' : 'over' };
}
const dayDiff = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 864e5);
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export function dueAlerts(D, today) {
  const days = Math.max(1, Math.round(+(D.set && D.set.dueDays) || 14));
  return (D.ledger || []).filter((x) => x && x.id && x.date).map((x) => ({ x, i: payInfo(x) }))
    .filter((o) => o.i.due > 0 && (o.i.st === 'partial' || (o.i.st === 'none' && o.i.pays.length)))
    .map((o) => { const basis = o.x.dueDate || addDays(o.x.date, days), diff = dayDiff(basis, today); return { ...o, basis, diff, level: diff < 0 ? 'over' : diff <= 3 ? 'soon' : 'ok' }; })
    .filter((o) => o.level !== 'ok').sort((a, b) => a.basis.localeCompare(b.basis));
}

export async function run(env = process.env, deps = {}) {
  const doFetch = deps.fetch || fetch;
  const wp = deps.webpush || webpush;
  const now = deps.now || Date.now();
  const log = deps.log || console.log;
  // 비밀값에 앞뒤 공백·줄바꿈이 섞여 들어가도(복사·붙여넣기) 404가 나지 않게 다듬어요. Gist ID는 주소 전체를 넣어도 끝의 ID만 써요
  const { SYNC_GIST_TOKEN, SYNC_GIST_ID, VAPID_PRIVATE_KEY } = Object.fromEntries(Object.entries(env).map(([k, v]) => [k, typeof v === 'string' ? (k === 'SYNC_GIST_ID' ? (v.trim().match(/([0-9a-f]{20,40})\/?$/i) || [, v.trim()])[1] : v.trim()) : v]));
  const subject = env.VAPID_SUBJECT || 'mailto:admin@linuscompany.co.kr';
  if (!SYNC_GIST_TOKEN || !SYNC_GIST_ID || !VAPID_PRIVATE_KEY) { log('필요한 비밀값이 아직 없어서 건너뜀'); return { skipped: 'secrets' }; }
  const headers = { Authorization: `Bearer ${SYNC_GIST_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  const gr = await doFetch(`${API}/gists/${SYNC_GIST_ID}`, { headers });
  if (!gr.ok) throw new Error(`gist 읽기 실패 ${gr.status}`);
  const files = (await gr.json()).files || {};
  const read = async (f) => (f ? (f.truncated ? await (await doFetch(f.raw_url, { headers })).text() : f.content) : null);
  const D = JSON.parse((await read(files['rino-workspace.json'])) || '{}');
  const state = JSON.parse((await read(files['push-state.json'])) || '{}');
  const pub = D.set && D.set.push && D.set.push.pub;
  if (!pub) { log('앱에 푸시 키가 아직 없어서 건너뜀'); return { skipped: 'nokey' }; }
  const cfg = (D.set && D.set.dueNotify) || {};
  if (cfg.on === 0) { log('미수금 푸시가 꺼져 있어서 건너뜀'); return { skipped: 'off' }; }
  const hour = Number.isFinite(+cfg.hour) ? Math.min(23, Math.max(0, Math.round(+cfg.hour))) : 9;
  const k = kst(now), today = ymdOf(k);
  if (k.getUTCHours() < hour) { log('아직 알림 시각 전'); return { skipped: 'early' }; }
  if (state.due && state.due.day === today) { log('오늘은 이미 보냈어요'); return { skipped: 'sent' }; }
  const al = dueAlerts(D, today);
  const save = async () => {
    const r = await doFetch(`${API}/gists/${SYNC_GIST_ID}`, { method: 'PATCH', headers, body: JSON.stringify({ files: { 'push-state.json': { content: JSON.stringify(state) } } }) });
    if (!r.ok) throw new Error(`상태 저장 실패 ${r.status}`);
  };
  if (!al.length) { state.due = { day: today, n: 0 }; await save(); log('알릴 미수금 없음'); return { sent: 0, alerts: 0 }; }
  const over = al.filter((o) => o.level === 'over').length, sum = al.reduce((a, o) => a + o.i.due, 0);
  const title = `💳 미수금 알림 · ${al.length}건`;
  const head = `${over ? `기한 지남 ${over}건 · ` : ''}${al.length - over ? `임박 ${al.length - over}건 · ` : ''}잔금 합계 ${won(sum)}`;
  const names = cfg.names ? ' · ' + al.slice(0, 3).map((o) => `${clip(o.x.cname || '고객', 6)} ${won(o.i.due)}`).join(', ') + (al.length > 3 ? ` 외 ${al.length - 3}건` : '') : '';
  const payload = { kind: 'due', preview: { title, body: clip(head + names, 170) } };
  const subs = (D.pushsubs || []).filter((s) => s && s.sub && s.sub.endpoint && s.name === ADMIN);
  wp.setVapidDetails(subject, pub, VAPID_PRIVATE_KEY);
  const dead = state.dead || {};
  let sent = 0, failed = 0;
  for (const s of subs) {
    const eh = hash(s.sub.endpoint);
    if (dead[eh]) continue;
    try { await wp.sendNotification(s.sub, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'normal' }); sent++; }
    catch (e) {
      failed++;
      if (e && (e.statusCode === 404 || e.statusCode === 410)) dead[eh] = now;
      else log(`발송 실패 ${e && e.statusCode ? e.statusCode : 'error'}`);
    }
  }
  state.dead = dead;
  state.due = { day: today, n: al.length, sent };
  await save();
  log(`미수금 ${al.length}건 · 기기 ${subs.length}대 · 발송 ${sent} · 실패 ${failed}`);
  return { sent, failed, alerts: al.length };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  run().catch((e) => { console.error('오류:', e.message); process.exit(1); });
}
