// 워커를 로컬 HTTP 서버로 띄워, 진짜 네트워크 요청으로 공격할 수 있게 해요.
// GitHub/Notion은 가짜로 대신해, 방화벽을 통과한 요청만 그쪽으로 "닿았는지"를 표시해요.
import http from 'node:http';
import worker from '../worker/worker.js';

const GID = 'abcdefabcdefabcdefabcdef';
export const backend = { hits: [] }; // 방화벽을 통과해 Gist/Notion까지 간 요청 기록 = '내부 도달'
globalThis.__backendHits = backend.hits;

const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith('https://api.github.com') || url.startsWith('https://api.notion.com')) {
    backend.hits.push({ url, method: o.method || 'GET' });
    if (/\/gists\//.test(url)) {
      if ((o.method || 'GET') === 'HEAD') return new Response(null, { status: 200, headers: { 'x-oauth-scopes': 'gist' } });
      return new Response(JSON.stringify({ id: GID, files: {
        'rino-workspace.json': { content: JSON.stringify({ set: { push: { pub: 'BPfake', worker: 'https://x.workers.dev' } }, msgs: [], pushsubs: [] }), truncated: false },
        'accounts.json': { content: '{"v":1,"users":[{"email":"admin@linuscompany.co.kr","name":"관리자","role":"admin","status":"approved","salt":"aa","h":"deadbeef"}]}', truncated: false },
        'push-state.json': { content: '{"seen":[]}', truncated: false },
      } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return realFetch(u, o);
};

const env = {
  GIST_TOKEN: 'ghp_SECRET_token_value_must_never_leak_1234567890',
  GIST_ID: GID,
  VAPID_PRIVATE_KEY: 'vapidSecretPrivateKeyMustNeverLeak',
  VAPID_SUBJECT: 'mailto:admin@linuscompany.co.kr',
  CAL_KEY: 'calSecretAccessKey20charsLong!!',
  NOTION_TOKEN: 'ntn_SECRET_notion_token_never_leak',
  NOTION_DB_ID: 'db123456789012345678901234567890',
  ALLOWED_ORIGIN: 'https://linuscompany.co.kr',
};

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      try { headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]); } catch {}
    }
    headers.set('CF-Connecting-IP', req.headers['x-test-ip'] || '203.0.113.' + (Math.floor(Math.random() * 250) + 1));
    const method = req.method;
    const init = { method, headers };
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) init.body = body.length ? body : undefined;
    let wres;
    try {
      wres = await worker.fetch(new Request('https://linus-push.workers.dev' + req.url, init), env);
    } catch (e) {
      res.writeHead(599); res.end('adapter error: ' + e.message); return;
    }
    const buf = Buffer.from(await wres.arrayBuffer());
    const h = {};
    wres.headers.forEach((v, k) => { h[k] = v; });
    res.writeHead(wres.status, h);
    res.end(buf);
  });
});

export function start(port = 0) {
  return new Promise((r) => server.listen(port, () => r(server.address().port)));
}
export function stop() { return new Promise((r) => server.close(r)); }
if (import.meta.url === `file://${process.argv[1]}`) start(8099).then((p) => console.log('worker on', p));
