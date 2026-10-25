// Linus Company 푸시 알림 발송 스크립트 (GitHub Actions에서 5분마다 실행)
// 동기화 Gist(비공개)에서 새 메시지와 기기 구독을 읽어 웹 푸시를 보내요.
// 메시지 내용은 로그에 남기지 않아요(개수만 출력). 필요한 비밀값은 GitHub Secrets에 있어요.
import webpush from 'web-push';
import { createHash } from 'node:crypto';

const API = 'https://api.github.com';
const ROOM_NAMES = { notice: '공지사항', talk: '업무 대화', alert: '알림' };
const dn = (n) => (n === '관리자' ? '리노' : n || '');
const hash = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
const clip = (s, n) => Array.from(String(s || '').replace(/\s+/g, ' ').trim()).slice(0, n).join('');

export async function run(env = process.env, deps = {}) {
  const doFetch = deps.fetch || fetch;
  const wp = deps.webpush || webpush;
  const now = deps.now || Date.now();
  const log = deps.log || console.log;
  const { SYNC_GIST_TOKEN, SYNC_GIST_ID, VAPID_PRIVATE_KEY } = env;
  const subject = env.VAPID_SUBJECT || 'mailto:admin@linuscompany.co.kr';
  if (!SYNC_GIST_TOKEN || !SYNC_GIST_ID || !VAPID_PRIVATE_KEY) {
    log('필요한 비밀값(SYNC_GIST_TOKEN, SYNC_GIST_ID, VAPID_PRIVATE_KEY)이 아직 없어서 건너뜀');
    return { skipped: 'secrets' };
  }
  const headers = { Authorization: `Bearer ${SYNC_GIST_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  const gr = await doFetch(`${API}/gists/${SYNC_GIST_ID}`, { headers });
  if (!gr.ok) throw new Error(`gist 읽기 실패 ${gr.status}`);
  const files = (await gr.json()).files || {};
  const read = async (f) => (f ? (f.truncated ? await (await doFetch(f.raw_url, { headers })).text() : f.content) : null);
  const D = JSON.parse((await read(files['rino-workspace.json'])) || '{}');
  const state = JSON.parse((await read(files['push-state.json'])) || '{}');
  const pub = D.set && D.set.push && D.set.push.pub;
  if (!pub) { log('앱에 푸시 키가 아직 없어서 건너뜀'); return { skipped: 'nokey' }; }
  const msgs = (D.msgs || []).filter((m) => m && m.id && m.t);
  const save = async () => {
    const r = await doFetch(`${API}/gists/${SYNC_GIST_ID}`, { method: 'PATCH', headers, body: JSON.stringify({ files: { 'push-state.json': { content: JSON.stringify(state) } } }) });
    if (!r.ok) throw new Error(`상태 저장 실패 ${r.status}`);
  };
  if (!Array.isArray(state.seen)) { // 첫 실행: 기존 메시지는 모두 보낸 것으로 보고 한꺼번에 알림이 가지 않게 해요
    state.seen = msgs.map((m) => m.id).slice(-500);
    state.dead = {};
    await save();
    log(`첫 실행: 기존 메시지 ${msgs.length}건을 기준으로 저장`);
    return { first: true };
  }
  const seen = new Set(state.seen);
  const fresh = msgs.filter((m) => !seen.has(m.id) && m.t > now - 2 * 864e5).sort((a, b) => a.t - b.t).slice(-30);
  if (!fresh.length) { log('새 메시지 없음'); return { sent: 0 }; }
  const subs = (D.pushsubs || []).filter((s) => s && s.sub && s.sub.endpoint);
  // 참여자가 정해진 방(members 또는 예전 직원 지시 방)은 참여자와 관리자에게만 보내요
  const canSee = (id, name) => {
    const r = ((D.set && D.set.rooms) || []).find((x) => x.id === id);
    if (!r || !(Array.isArray(r.members) || r.staff)) return true;
    return name === '관리자' || (r.members || []).includes(name);
  };
  const roomName = (id) => ((D.set && D.set.rooms) || []).find((r) => r.id === id)?.name || ROOM_NAMES[id] || '메신저';
  wp.setVapidDetails(subject, pub, VAPID_PRIVATE_KEY);
  const dead = state.dead || {};
  let sent = 0, failed = 0;
  for (const s of subs) {
    const eh = hash(s.sub.endpoint);
    if (dead[eh]) continue;
    const key = '@' + dn(s.name);
    const mine = fresh.filter((m) => m.by !== s.name && m.actor !== s.name && canSee(m.room, s.name) && (!(s.mute && s.mute[m.room]) || (m.text || '').includes(key)));
    if (!mine.length) continue;
    const last = mine[mine.length - 1];
    const payload = mine.length === 1
      ? { room: last.room, preview: { title: `${roomName(last.room)} · ${dn(last.by)}`, body: clip(last.text || '[사진]', 120) || '[사진]' } }
      : { room: last.room, preview: { title: `새 메시지 ${mine.length}건`, body: clip(`${dn(last.by)}: ${last.text || '[사진]'}`, 120) } };
    try {
      await wp.sendNotification(s.sub, JSON.stringify(payload), { TTL: 3600, urgency: 'normal' });
      sent++;
    } catch (e) {
      failed++;
      if (e && (e.statusCode === 404 || e.statusCode === 410)) dead[eh] = now; // 만료된 기기는 다시 보내지 않아요
      else log(`발송 실패 ${e && e.statusCode ? e.statusCode : 'error'}`);
    }
  }
  for (const k of Object.keys(dead)) if (now - dead[k] > 30 * 864e5) delete dead[k];
  state.dead = dead;
  state.seen = [...state.seen, ...fresh.map((m) => m.id)].slice(-500);
  await save();
  log(`새 메시지 ${fresh.length}건 · 기기 ${subs.length}대 · 발송 ${sent} · 실패 ${failed}`);
  return { sent, failed, fresh: fresh.length };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  run().catch((e) => { console.error('오류:', e.message); process.exit(1); });
}
