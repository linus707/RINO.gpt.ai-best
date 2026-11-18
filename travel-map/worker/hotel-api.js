// 여행 숙소 지도 ③ 실시간 가격용 Cloudflare 워커
// 역할: 브라우저 대신 아고다 제휴 API(Affiliate Lite / Long Tail Search)를 불러요.
//       API 키는 워커 비밀값(secret)에만 있고, 브라우저에는 절대 내려가지 않아요.
// 필요한 비밀값: AGODA_SITE_ID, AGODA_API_KEY   (wrangler secret put 으로 넣어요)
// 선택 설정(vars): ALLOWED_ORIGINS  예) "https://linuscompany.co.kr,http://localhost:8000"
//                  AGODA_ENDPOINT   아고다 담당자가 다른 주소를 알려준 경우에만
const DEFAULT_ENDPOINT = 'http://affiliateapi7643.agoda.com/affiliateservice/lt_v1';
const SORTS = new Set(['Recommended', 'PriceDesc', 'PriceAsc', 'StarRatingDesc', 'StarRatingAsc', 'AllGuestsReviewScore']);
const CACHE_SECONDS = 600;

const json = (body, status, extra) => new Response(JSON.stringify(body), {
  status, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' }, extra),
});

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || 'https://linuscompany.co.kr').split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : null;
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const dayMs = 86400000;

// 들어온 검색 조건을 검사해요. 이상한 값이면 아고다에 보내지 않아요.
export function readParams(url, now = Date.now()) {
  const q = url.searchParams;
  const cityId = Number(q.get('cityId'));
  if (!Number.isInteger(cityId) || cityId < 1 || cityId > 1e9) return { error: '도시 ID가 올바르지 않아요.' };
  const checkIn = q.get('checkIn') || ''; const checkOut = q.get('checkOut') || '';
  if (!isDate(checkIn) || !isDate(checkOut)) return { error: '날짜 형식은 YYYY-MM-DD 예요.' };
  const a = Date.parse(checkIn + 'T00:00:00Z'); const b = Date.parse(checkOut + 'T00:00:00Z');
  if (a < now - 2 * dayMs) return { error: '체크인 날짜가 지났어요.' };
  if (a > now + 500 * dayMs) return { error: '체크인은 500일 이내로 골라주세요.' };
  if (b <= a || b - a > 30 * dayMs) return { error: '체크아웃은 체크인 다음 날부터 30박 이내예요.' };
  const adults = Number(q.get('adults') || 2);
  if (!Number.isInteger(adults) || adults < 1 || adults > 10) return { error: '인원은 1~10명이에요.' };
  const currency = (q.get('currency') || 'KRW').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { error: '통화 코드가 올바르지 않아요.' };
  const language = (q.get('lang') || 'ko-kr').toLowerCase();
  if (!/^[a-z]{2}-[a-z]{2}$/.test(language)) return { error: '언어 코드가 올바르지 않아요.' };
  const sortBy = q.get('sort') || 'Recommended';
  if (!SORTS.has(sortBy)) return { error: '정렬 방식이 올바르지 않아요.' };
  const maxResult = Math.min(30, Math.max(1, Number(q.get('max')) || 20));
  return { cityId, checkIn, checkOut, adults, currency, language, sortBy, maxResult };
}

const agodaUrl = (u) => { try { const x = new URL(u); return (x.hostname === 'agoda.com' || x.hostname.endsWith('.agoda.com')) ? x.href.replace(/^http:/, 'https:') : ''; } catch { return ''; } };
const imgUrl = (u) => { try { const x = new URL(u); return (x.hostname.endsWith('.agoda.net') || x.hostname.endsWith('.agoda.com')) ? x.href.replace(/^http:/, 'https:') : ''; } catch { return ''; } };
const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// 아고다 응답을 화면에 필요한 값만 골라서 정리해요.
export function shapeResults(data) {
  return (Array.isArray(data && data.results) ? data.results : []).map((r) => ({
    id: n(r.hotelId), name: String(r.hotelName || '').slice(0, 200), stars: n(r.starRating), reviewScore: n(r.reviewScore), reviewCount: n(r.reviewCount),
    price: n(r.dailyRate), crossedOut: n(r.crossedOutRate), discount: n(r.discountPercentage), currency: String(r.currency || '').slice(0, 3),
    image: imgUrl(r.imageURL), url: agodaUrl(r.landingURL), breakfast: r.includeBreakfast === true, wifi: r.freeWifi === true,
  })).filter((r) => r.name && r.url && r.price !== null);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') {
      if (!cors) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: Object.assign({ 'access-control-allow-methods': 'GET', 'access-control-allow-headers': 'Accept', 'access-control-max-age': '86400' }, cors) });
    }
    if (url.pathname !== '/search') return json({ error: '없는 주소예요.' }, 404);
    if (req.method !== 'GET') return json({ error: 'GET 만 돼요.' }, 405);
    if (!cors) return json({ error: '허용되지 않은 사이트예요.' }, 403); // 내 사이트에서만 쓰도록
    if (!env.AGODA_SITE_ID || !env.AGODA_API_KEY) return json({ error: '워커에 아고다 키가 아직 없어요.' }, 503, cors);

    const p = readParams(url);
    if (p.error) return json({ error: p.error }, 400, cors);

    // 같은 조건은 10분 동안 저장해 두고 재사용해요 (아고다 호출 횟수 절약)
    const cacheKey = new Request(`https://cache.travel-map/search?${new URLSearchParams(Object.entries(p).map(([k, v]) => [k, String(v)]))}`);
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    if (cache) {
      const hit = await cache.match(cacheKey);
      if (hit) return new Response(hit.body, { status: 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'x-cache': 'HIT' }, cors) });
    }

    const body = { criteria: {
      additional: { currency: p.currency, language: p.language, maxResult: p.maxResult, sortBy: p.sortBy, discountOnly: false,
        minimumReviewScore: 0, minimumStarRating: 0, occupancy: { numberOfAdult: p.adults, numberOfChildren: 0 } },
      checkInDate: p.checkIn, checkOutDate: p.checkOut, cityId: p.cityId } };

    let data;
    try {
      const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), 10000);
      const res = await fetch(env.AGODA_ENDPOINT || DEFAULT_ENDPOINT, {
        method: 'POST', signal: ac.signal,
        headers: { 'content-type': 'application/json', 'accept-encoding': 'gzip,deflate', authorization: `${env.AGODA_SITE_ID}:${env.AGODA_API_KEY}` },
        body: JSON.stringify(body),
      });
      clearTimeout(timer);
      data = await res.json();
    } catch {
      return json({ error: '아고다 서버에 연결하지 못했어요.' }, 502, cors);
    }
    if (data && data.error) {
      if (data.error.id === 911) return json({ results: [] }, 200, cors); // 911 = 검색 결과 없음
      return json({ error: `아고다 오류 (${Number(data.error.id) || '?'})` }, 502, cors); // 자세한 메시지는 밖으로 내보내지 않아요
    }
    const out = JSON.stringify({ results: shapeResults(data) });
    if (cache) ctx.waitUntil(cache.put(cacheKey, new Response(out, { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${CACHE_SECONDS}` } })));
    return new Response(out, { status: 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, cors) });
  },
};
