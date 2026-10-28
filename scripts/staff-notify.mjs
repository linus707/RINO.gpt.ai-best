// AI 직원 진행 알림 (GitHub Actions에서 5분마다 실행)
// 비공개 Linus Company 저장소의 지시함(지시/*.md)에서 직원이 '착수'하거나 '보고'한 것을 찾아,
// 앱을 열지 않아도 대표 기기로 웹 푸시를 보내요. 지시 내용·보고 내용은 로그에 남기지 않아요(개수만 출력).
// 필요한 비밀값: SYNC_GIST_TOKEN, SYNC_GIST_ID, VAPID_PRIVATE_KEY (기존) + SOLAMEN_READ_TOKEN (Linus Company 저장소 Contents 읽기 전용 토큰)
import webpush from 'web-push';
import { createHash } from 'node:crypto';

const API = 'https://api.github.com';
const hash = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
const clip = (s, n) => Array.from(String(s || '').replace(/\s+/g, ' ').trim()).slice(0, n).join('');
const STATUS = { 착수: 'work', 보고: 'rep' };

export const parseInstr = (txt) => {
  const f = (k) => ((txt.match(new RegExp(`^- ${k}:\\s*(.+)$`, 'm')) || [])[1] || '').trim();
  const title = ((txt.split('\n## 제목')[1] || '').trim().split('\n').find((l) => l.trim()) || '').trim();
  return { status: f('상태'), name: f('담당이름'), result: f('결과'), title };
};

export async function run(env = process.env, deps = {}) {
  const doFetch = deps.fetch || fetch;
  const wp = deps.webpush || webpush;
  const now = deps.now || Date.now();
  const log = deps.log || console.log;
  const { SYNC_GIST_TOKEN, SYNC_GIST_ID, VAPID_PRIVATE_KEY, SOLAMEN_READ_TOKEN } = env;
  const repo = env.SOLAMEN_REPO || 'linus707/SOLAMEN';
  const branch = env.SOLAMEN_BRANCH || 'work';
  if (!SYNC_GIST_TOKEN || !SYNC_GIST_ID || !VAPID_PRIVATE_KEY || !SOLAMEN_READ_TOKEN) {
    log('필요한 비밀값(SYNC_GIST_TOKEN, SYNC_GIST_ID, VAPID_PRIVATE_KEY, SOLAMEN_READ_TOKEN)이 아직 없어서 건너뜀');
    return { skipped: 'secrets' };
  }
  const gh = { Authorization: `Bearer ${SYNC_GIST_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  const rh = { Authorization: `Bearer ${SOLAMEN_READ_TOKEN}`, Accept: 'application/vnd.github+json' };
  const gr = await doFetch(`${API}/gists/${SYNC_GIST_ID}`, { headers: gh });
  if (!gr.ok) throw new Error(`gist 읽기 실패 ${gr.status}`);
  const files = (await gr.json()).files || {};
  const read = async (f) => (f ? (f.truncated ? await (await doFetch(f.raw_url, { headers: gh })).text() : f.content) : null);
  const D = JSON.parse((await read(files['rino-workspace.json'])) || '{}');
  const state = JSON.parse((await read(files['push-state.json'])) || '{}');
  const pub = D.set && D.set.push && D.set.push.pub;
  if (!pub) { log('앱에 푸시 키가 아직 없어서 건너뜀'); return { skipped: 'nokey' }; }

  const lr = await doFetch(`${API}/repos/${repo}/contents/${encodeURI('지시')}?ref=${encodeURIComponent(branch)}`, { headers: rh });
  if (!lr.ok) throw new Error(`지시함 목록 읽기 실패 ${lr.status}`);
  const list = (await lr.json()).filter((x) => x && x.type === 'file' && /^\d{12}-[a-z]+\.md$/.test(x.name));
  const save = async () => {
    const r = await doFetch(`${API}/gists/${SYNC_GIST_ID}`, { method: 'PATCH', headers: gh, body: JSON.stringify({ files: { 'push-state.json': { content: JSON.stringify(state) } } }) });
    if (!r.ok) throw new Error(`상태 저장 실패 ${r.status}`);
  };
  const shaNow = Object.fromEntries(list.map((x) => [x.name, x.sha]));
  if (!state.inbox) { // 첫 실행: 지금까지의 지시는 모두 기준으로만 저장해 한꺼번에 알림이 가지 않게 해요
    state.inbox = shaNow;
    state.inboxSt = {};
    await save();
    log(`첫 실행: 지시 ${list.length}건을 기준으로 저장`);
    return { first: true };
  }
  const inboxSt = state.inboxSt || {};
  const changed = list.filter((x) => state.inbox[x.name] !== x.sha).slice(0, 30);
  const notes = [];
  for (const it of changed) {
    const r = await doFetch(it.url, { headers: rh });
    if (!r.ok) continue; // 다음 실행 때 다시 시도
    const txt = Buffer.from((await r.json()).content || '', 'base64').toString('utf8');
    const p = parseInstr(txt);
    const key = STATUS[p.status];
    const id = it.name.replace(/\.md$/, '');
    state.inbox[it.name] = it.sha;
    if (!key || inboxSt[id] === key) continue;
    inboxSt[id] = key;
    // 앱이 같은 상태를 이미 메신저에 올렸으면(대표가 앱을 연 경우) 알림은 그쪽에서 갔어요
    if ((D.msgs || []).some((m) => m && m.tk && String(m.tk) === id && m.st === key)) continue;
    notes.push({ id, key, who: p.name || '직원', title: p.title, result: p.result });
  }
  for (const k of Object.keys(state.inbox)) if (!shaNow[k]) delete state.inbox[k];
  state.inboxSt = inboxSt;

  const subs = (D.pushsubs || []).filter((s) => s && s.sub && s.sub.endpoint && s.name === '관리자');
  const dead = state.dead || {};
  let sent = 0, failed = 0;
  if (notes.length && subs.length) {
    wp.setVapidDetails(env.VAPID_SUBJECT || 'mailto:admin@linuscompany.co.kr', pub, VAPID_PRIVATE_KEY);
    const last = notes[notes.length - 1];
    const payload = notes.length === 1
      ? { room: 'alert', preview: { title: last.key === 'rep' ? `📝 ${last.who} 보고가 도착했어요` : `🔄 ${last.who} 착수했어요`, body: clip(last.title, 120) } }
      : { room: 'alert', preview: { title: `직원 진행 ${notes.length}건`, body: clip(`${last.who}: ${last.title}`, 120) } };
    for (const s of subs) {
      const eh = hash(s.sub.endpoint);
      if (dead[eh]) continue;
      try { await wp.sendNotification(s.sub, JSON.stringify(payload), { TTL: 3600, urgency: 'normal' }); sent++; }
      catch (e) {
        failed++;
        if (e && (e.statusCode === 404 || e.statusCode === 410)) dead[eh] = now;
        else log(`발송 실패 ${e && e.statusCode ? e.statusCode : 'error'}`);
      }
    }
  }
  state.dead = dead;
  await save();
  log(`바뀐 지시 ${changed.length}건 · 알림 ${notes.length}건 · 기기 ${subs.length}대 · 발송 ${sent} · 실패 ${failed}`);
  return { changed: changed.length, notes: notes.length, sent, failed };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  run().catch((e) => { console.error('오류:', e.message); process.exit(1); });
}
