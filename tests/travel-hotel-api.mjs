// 여행 지도 ③ 실시간 가격 워커(travel-map/worker/hotel-api.js) 테스트
// 진짜 아고다 대신 가짜 아고다 서버를 띄워서, 키 숨김·입력 검사·허용 사이트·응답 정리를 확인해요.
// 실행: node tests/travel-hotel-api.mjs   (추가 설치 불필요)
import http from 'node:http';
import worker, { readParams } from '../travel-map/worker/hotel-api.js';

const SECRET = 'secret-key-0000-should-never-leak';
let lastReq = null; let reply = null;
const fake = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => { body += c; });
  req.on('end', () => { lastReq = { auth: req.headers.authorization, body: JSON.parse(body || '{}') }; res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(reply)); });
});
await new Promise((r) => fake.listen(0, r));
const env = { AGODA_SITE_ID: '123456', AGODA_API_KEY: SECRET, AGODA_ENDPOINT: `http://localhost:${fake.address().port}/lt_v1`, ALLOWED_ORIGINS: 'https://linuscompany.co.kr' };
const ctx = { waitUntil() {} };
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const call = (qs, origin = 'https://linuscompany.co.kr', method = 'GET', e = env) =>
  worker.fetch(new Request(`https://w.example/search?${qs}`, { method, headers: origin ? { Origin: origin } : {} }), e, ctx);
const good = `cityId=9395&checkIn=${day(30)}&checkOut=${day(31)}&adults=2&currency=KRW&lang=ko-kr&sort=PriceAsc`;

const rows = []; const check = (name, pass, detail = '') => rows.push({ name, pass, detail });

reply = { results: [
  { hotelId: 1, hotelName: '테스트 호텔 <b>', starRating: 4, reviewScore: 8.9, reviewCount: 1200, dailyRate: 120000, crossedOutRate: 150000, discountPercentage: 20,
    currency: 'KRW', imageURL: 'http://pix6.agoda.net/hotelImages/1/1.jpg', landingURL: 'https://www.agoda.com/partners/partnersearch.aspx?cid=1&hid=1', includeBreakfast: true, freeWifi: true },
  { hotelId: 2, hotelName: '나쁜 링크 호텔', dailyRate: 1, currency: 'KRW', landingURL: 'https://evil.example/phish' },
] };
let r = await call(good); let j = await r.json(); const text = JSON.stringify(j);
check('정상 검색', r.status === 200 && j.results.length === 1, `status ${r.status}, ${j.results?.length}건`);
check('아고다 외 링크 제거', !text.includes('evil.example'));
check('사진 https 로 변환', j.results[0]?.image.startsWith('https://pix6.agoda.net'));
check('키가 응답에 안 섞임', !text.includes(SECRET));
check('아고다에 키 헤더 전달', lastReq?.auth === `123456:${SECRET}`);
check('요청 본문 형식', lastReq?.body?.criteria?.cityId === 9395 && lastReq.body.criteria.additional.sortBy === 'PriceAsc' && lastReq.body.criteria.additional.occupancy.numberOfAdult === 2);
check('허용 사이트 CORS', r.headers.get('access-control-allow-origin') === 'https://linuscompany.co.kr');

r = await call(good, 'https://evil.example'); check('다른 사이트 차단', r.status === 403, `status ${r.status}`);
r = await call(good, null); check('Origin 없는 요청 차단', r.status === 403);
r = await call(good, 'https://linuscompany.co.kr', 'POST'); check('POST 차단', r.status === 405);
r = await worker.fetch(new Request('https://w.example/../secret', { headers: { Origin: 'https://linuscompany.co.kr' } }), env, ctx); check('없는 경로 404', r.status === 404);
r = await call(good, 'https://linuscompany.co.kr', 'GET', { ...env, AGODA_API_KEY: '' }); check('키 없으면 503', r.status === 503);

for (const [name, qs] of [
  ['도시 ID 주입', `cityId=1;DROP&checkIn=${day(30)}&checkOut=${day(31)}`],
  ['지난 날짜', `cityId=1&checkIn=${day(-10)}&checkOut=${day(-9)}`],
  ['31박 초과', `cityId=1&checkIn=${day(30)}&checkOut=${day(70)}`],
  ['체크아웃이 먼저', `cityId=1&checkIn=${day(31)}&checkOut=${day(30)}`],
  ['이상한 정렬', `cityId=1&checkIn=${day(30)}&checkOut=${day(31)}&sort=__proto__`],
  ['인원 100명', `cityId=1&checkIn=${day(30)}&checkOut=${day(31)}&adults=100`],
  ['통화 주입', `cityId=1&checkIn=${day(30)}&checkOut=${day(31)}&currency=<script>`],
]) { r = await call(qs); check('입력 차단: ' + name, r.status === 400, `status ${r.status}`); }

reply = { error: { id: 911, message: 'No search result' } };
r = await call(good); j = await r.json(); check('결과 없음(911) → 빈 목록', r.status === 200 && j.results.length === 0);
reply = { error: { id: 401, message: `invalid key ${SECRET}` } };
r = await call(good); j = await r.json(); check('아고다 오류 메시지 숨김', r.status === 502 && !JSON.stringify(j).includes(SECRET));

check('readParams 기본값', readParams(new URL(`https://x/search?cityId=5&checkIn=${day(3)}&checkOut=${day(4)}`)).maxResult === 20);

fake.close();
console.log('\n========  여행 지도 실시간 가격 워커 테스트  ========\n');
let fail = 0;
for (const x of rows) { if (!x.pass) fail++; console.log(`  ${x.pass ? '🟢' : '🔴'} ${x.name}${x.detail ? '  · ' + x.detail : ''}`); }
console.log(`\n총 ${rows.length}건 · ${fail ? '❌ 실패 ' + fail + '건' : '✅ 전부 통과'}`);
process.exit(fail ? 1 : 0);
