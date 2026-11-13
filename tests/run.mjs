// 사이트 자동 테스트 실행기.
// 저장소 루트를 임시 웹서버로 띄우고, playwright-cli로 각 화면을 열어 e2e/*.js 점검을 차례로 돌려요.
// 사용법: npm test            (전체)
//         npm test -- pos     (이름에 pos가 들어간 테스트만)
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const CLI = join(HERE, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright-cli.cmd' : 'playwright-cli');
const SESSION = 'linus-test';

// [테스트 이름, 열 페이지, 점검 파일]
const CASES = [
  ['홈 로그인 화면', '', 'e2e/home.js'],
  ['가격표', 'price.html', 'e2e/price.js'],
  ['매장 POS', 'pos.html', 'e2e/pos.js'],
  ['오프라인 안내', 'offline.html', 'e2e/offline.js'],
];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT + sep) && file !== ROOT) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

// 웹서버가 같은 프로세스에서 돌기 때문에 명령은 비동기로 실행해요(동기 실행은 서버를 멈춰요).
function cli(...args) {
  return new Promise(done => {
    const child = spawn(CLI, [`-s=${SESSION}`, ...args], { cwd: HERE, shell: process.platform === 'win32' });
    let out = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => out += d);
    child.on('error', e => done({ ok: false, out: String(e) }));
    child.on('exit', code => setTimeout(() => done({ ok: code === 0, out: out.trim() }), 50));
  });
}

await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;
const only = process.argv[2];
const cases = CASES.filter(([name, , file]) => !only || name.includes(only) || file.includes(only));
let failed = 0;

for (const [name, page, file] of cases) {
  const started = Date.now();
  // 테스트마다 새 브라우저(저장된 데이터 없음)로 시작해요.
  let r = await cli('open', base + page);
  if (r.ok) r = await cli('--raw', 'run-code', '--filename', file);
  await cli('close');
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (r.ok) {
    console.log(`✅ ${name} (${secs}초)`);
    let note = r.out;
    try { note = JSON.parse(r.out); } catch {}
    if (note) console.log(`   ${note}`);
  } else {
    failed++;
    console.log(`❌ ${name} (${secs}초)`);
    console.log(r.out.split('\n').map(l => `   ${l}`).join('\n'));
  }
}

server.close();
console.log(failed ? `\n${failed}개 실패 / ${cases.length}개 중` : `\n모두 통과 (${cases.length}개)`);
process.exit(failed || !cases.length ? 1 : 0);
