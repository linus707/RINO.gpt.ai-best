// 배포할 때 로그인 서버(푸시 워커) 주소를 사이트(_site/index.html)의 AUTH_WORKER에 넣어요.
// 그래서 처음 여는 기기(직원 폰·매장 태블릿)도 따로 연결하지 않아도 바로 로그인·회원가입이 돼요.
// 주소는 앱 설정 → 연결·동기화 → 푸시 알림 서버에 저장된 값(동기화 Gist의 set.push.worker)을 읽어요.
// 비밀값: SYNC_GIST_TOKEN, SYNC_GIST_ID (push.yml과 같은 값). 없거나 실패해도 배포는 멈추지 않아요.
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://api.github.com';
const FILE = process.argv[2] || '_site/index.html';
const clean = (v) => String(v || '').trim();

export function pickWorker(D) {
  const u = clean(D && D.set && D.set.push && D.set.push.worker).replace(/\/+$/, '');
  return /^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/[A-Za-z0-9._~\/-]*)?$/.test(u) ? u : '';
}
export function inject(html, url) {
  const re = /const AUTH_WORKER="[^"]*";/;
  if (!re.test(html)) return null;
  return html.replace(re, `const AUTH_WORKER=${JSON.stringify(url)};`);
}

async function main() {
  const token = clean(process.env.SYNC_GIST_TOKEN);
  const gid0 = clean(process.env.SYNC_GIST_ID), gid = (gid0.match(/([0-9a-f]{20,40})\/?$/i) || [, gid0])[1];
  if (!token || !gid) { console.log('SYNC_GIST_TOKEN·SYNC_GIST_ID가 없어서 로그인 서버 주소를 넣지 않고 배포해요'); return; }
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'linus-pages' };
  const r = await fetch(`${API}/gists/${gid}`, { headers });
  if (!r.ok) { console.log(`::warning::동기화 Gist를 읽지 못했어요(${r.status}). SYNC_GIST_ID·SYNC_GIST_TOKEN을 확인해 주세요. 로그인 서버 주소 없이 배포해요`); return; }
  const f = ((await r.json()).files || {})['rino-workspace.json'];
  if (!f) { console.log('::warning::Gist에 rino-workspace.json이 없어요'); return; }
  const text = f.truncated ? await (await fetch(f.raw_url, { headers })).text() : f.content;
  const url = pickWorker(JSON.parse(text));
  if (!url) { console.log('::warning::앱 설정에 푸시 알림 서버(워커) 주소가 없어요'); return; }
  const out = inject(readFileSync(FILE, 'utf8'), url);
  if (!out) { console.log('::warning::index.html에서 AUTH_WORKER 자리를 찾지 못했어요'); return; }
  writeFileSync(FILE, out);
  console.log(`로그인 서버 주소를 넣었어요: ${new URL(url).host}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => console.log(`::warning::로그인 서버 주소 넣기 실패: ${e.message}`));
