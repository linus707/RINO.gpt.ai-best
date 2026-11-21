// 여행 지도 도시별 테스트: 로마(유럽·geojson 영역) · 방콕(태국어 이름) · 뉴욕(서반구, 경도 음수) · 시드니(남반구, 위도 음수)
// 호텔은 모두 가상의 "테스트 호텔"이에요. 구글 시트·장소 검색·주변 호텔 서버는 실제 응답 형식의 가짜 응답으로 대신해요.
// 확인: 지도(핀·명소·영역·제목), 동네 탭+카드, 내 목록 검색(태그 포함), 장소 검색(한글 못 찾음 안내, 도시 근처 우선), 주변 호텔, 순위, 방화벽 위반·오류 없음
// 실행: node tests/travel-map-cities.mjs   (Playwright·Chromium 필요)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..', 'travel-map');
const FIX = path.join(HERE, 'fixtures', 'travel-map');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.csv': 'text/csv; charset=utf-8', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  try { const buf = await readFile(path.join(SITE, p === '/' ? 'index.html' : path.normalize(p).replace(/^(\.\.[/\\])+/, ''))); res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(buf); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}/index.html`;

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { try { ({ chromium } = await import('playwright')); } catch { console.error('Playwright가 필요해요.'); process.exit(2); } }

const meta = JSON.parse(readFileSync(path.join(FIX, 'meta.json'), 'utf8'));
// 같은 이름이 여러 나라에 있는 장소: 지도 근처(viewbox 안)를 고르는 실제 서버 동작을 흉내 내요
const GEO = {
  '콜로세움': [[41.8902, 12.4922]], 'Khao San Road': [[13.7590, 100.4974]], '카오산로드': [], '짜뚜짝 시장': [],
  '타임스 스퀘어': [[22.27834, 114.18214], [40.7580, -73.9855]], '본디 비치': [[-33.8908, 151.2743]],
};
const rows = []; const check = (name, pass, detail = '') => rows.push({ name, pass, detail });
const b = await chromium.launch({ args: ['--no-sandbox'] });

for (const [key, m] of Object.entries(meta)) {
  const errs = []; let overpassBox = null; let allViewbox = true;
  const csv = readFileSync(path.join(FIX, key + '.csv'), 'utf8');
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.route('https://docs.google.com/**', (r) => r.fulfill({ contentType: 'text/csv; charset=utf-8', body: csv }));
  await ctx.route('https://images.unsplash.com/**', (r) => r.fulfill({ status: 404, body: '' }));
  await ctx.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 204, body: '' }));
  await ctx.route('https://nominatim.openstreetmap.org/**', (r) => {
    const u = new URL(r.request().url()); const vbs = u.searchParams.get('viewbox'); if (!vbs) allViewbox = false;
    const vb = (vbs || '').split(',').map(Number);
    const cands = GEO[u.searchParams.get('q')] || [];
    const pick = cands.find((c) => vb.length === 4 && c[1] >= vb[0] && c[1] <= vb[2] && c[0] <= vb[1] && c[0] >= vb[3]) || cands[0];
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(pick ? [{ lat: String(pick[0]), lon: String(pick[1]), name: 'x', boundingbox: [pick[0] - .001, pick[0] + .001, pick[1] - .001, pick[1] + .001].map(String) }] : []) });
  });
  await ctx.route('https://overpass-api.de/**', (r) => {
    const q = new URLSearchParams(r.request().postData() || '').get('data') || '';
    const [s, w, n, e] = (q.match(/\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/) || []).slice(1).map(Number); overpassBox = [s, w, n, e];
    const els = [0, 1, 2].map((i) => ({ type: 'node', lat: (s + n) / 2 + (i - 1) * (n - s) / 5, lon: (w + e) / 2 + (i - 1) * (e - w) / 5, tags: { tourism: 'hotel', name: `Mock ${i}` } }));
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: els }) });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await p.addInitScript(() => { window.__v = []; document.addEventListener('securitypolicyviolation', (e) => window.__v.push(e.effectiveDirective)); });
  await p.goto(BASE + '?sheet=' + encodeURIComponent('https://docs.google.com/spreadsheets/d/e/' + key + '/pub?output=csv'));
  await p.waitForSelector('.pin', { timeout: 15000 }); await p.waitForTimeout(600);
  const T = m.title;
  check(`${T} 제목`, (await p.textContent('h1')) === T);
  check(`${T} 핀·명소·영역`, (await p.locator('.leaflet-marker-pane .pin').count()) === m.hotels && (await p.locator('.leaflet-marker-pane .landmark').count()) === m.landmarks
    && (await p.locator('.leaflet-overlay-pane path').count()) === m.areas);
  await p.locator('.tab').nth(1).click(); await p.waitForTimeout(300);
  await p.locator('.leaflet-marker-pane .pin').first().click(); await p.waitForTimeout(300);
  check(`${T} 동네 탭·상세 카드`, await p.isVisible('#card') && (await p.textContent('#card-name')).length > 0);
  await p.click('#card-close');
  await p.fill('#search-input', m.local); await p.press('#search-input', 'Enter'); await p.waitForTimeout(400);
  check(`${T} 내 목록 검색 "${m.local}"`, /추천 호텔 \d+곳/.test(await p.textContent('#list-title')));
  if (key === 'bangkok') {
    await p.fill('#search-input', '짜뚜짝 시장'); await p.press('#search-input', 'Enter'); await p.waitForTimeout(1800);
    check('한글 지명 못 찾음 → 영어 안내', (await p.textContent('#status')).includes('영어로'));
  }
  await p.fill('#search-input', m.place[0]); await p.press('#search-input', 'Enter'); await p.waitForTimeout(1800);
  if (await p.isVisible('#nearby-btn') && !(await p.locator('.leaflet-marker-pane .dot').count())) { await p.click('#nearby-btn'); await p.waitForTimeout(800); }
  const dots = await p.locator('.leaflet-marker-pane .dot').count();
  const c = overpassBox ? [(overpassBox[0] + overpassBox[2]) / 2, (overpassBox[1] + overpassBox[3]) / 2] : [0, 0];
  check(`${T} 장소 검색 "${m.place[0]}" → 주변 호텔`, dots === 3 && Math.abs(c[0] - m.place[1]) < 0.05 && Math.abs(c[1] - m.place[2]) < 0.05, `점 ${dots}개, 중심 ${c.map((x) => x.toFixed(3))}`);
  check(`${T} 장소 검색에 도시 범위(viewbox) 전달`, allViewbox);
  check(`${T} 검색 후 동네 탭은 전체 보기`, (await p.textContent('.tab.active')) === '전체 보기');
  await p.click('.view-btn[data-view="rank"]'); await p.waitForTimeout(400);
  const ranking = await p.locator('#rk-list .rk-name').allTextContents();
  check(`${T} 순위 ${m.hotels}곳, 후기 40개 호텔은 1위가 아님`, ranking.length === m.hotels && !/B\b|B,|B$/.test(ranking[0]), ranking[0]);
  check(`${T} 방화벽 위반·오류 없음`, !(await p.evaluate(() => window.__v.length)) && !errs.length, errs.join(' | '));
  await ctx.close();
}
await b.close(); server.close();
console.log('\n========  여행 지도 도시별 테스트  ========\n');
let fail = 0;
for (const x of rows) { if (!x.pass) fail++; console.log(`  ${x.pass ? '🟢' : '🔴'} ${x.name}${x.detail ? '  · ' + x.detail : ''}`); }
console.log(`\n총 ${rows.length}건 · ${fail ? '❌ 실패 ' + fail + '건' : '✅ 전부 통과'}`);
process.exit(fail ? 1 : 0);
