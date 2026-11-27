// Google 장소 검색·상세 (3-2)
// - Google API 키는 이 서버 함수 안에만 있다 (앱 코드·번들에 없음)
// - 로그인(익명 포함)한 사용자만, 하루 호출 수 제한 (비용 안전장치)
// - 꼭 필요한 필드만 요청해 비용 등급을 낮게 유지 (평점·영업시간·전화는 요청하지 않음)
// - 응답을 DB에 저장하지 않는다 (Google 약관: place_id만 영구 저장 가능)
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

const LIMITS = { search: 100, details: 400 }; // 사용자 1명 하루 최대
const FIELDS_SEARCH = 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types';
const FIELDS_DETAILS = 'id,displayName,formattedAddress,location,primaryType,types,googleMapsUri';

type Category = 'attraction' | 'food' | 'stay' | 'cafe' | 'shop' | 'photo';
const INCLUDED_TYPE: Partial<Record<Category, string>> = {
  attraction: 'tourist_attraction', food: 'restaurant', stay: 'lodging', cafe: 'cafe', shop: 'store',
};
const LABEL: Record<Category, string> = { attraction: '관광지', food: '맛집', stay: '숙소', cafe: '카페', shop: '쇼핑', photo: '포토 스팟' };

/** Google 장소 유형 → 앱의 카테고리 6개 */
function toCategory(primary: string | undefined, types: string[] = []): Category {
  const all = [primary ?? '', ...types];
  const has = (re: RegExp) => all.some((t) => re.test(t));
  if (has(/^(lodging|hotel|hostel|motel|resort_hotel|japanese_inn|guest_house|bed_and_breakfast|inn)$/)) return 'stay';
  if (has(/^(cafe|coffee_shop|tea_house|bakery|dessert_shop|cafeteria)$/)) return 'cafe';
  if (has(/restaurant$|^(food|meal_takeaway|bar|izakaya_restaurant|ramen_restaurant|food_court)$/)) return 'food';
  if (has(/store$|^(shopping_mall|market|department_store|supermarket)$/)) return 'shop';
  if (has(/^(observation_deck|scenic_spot|vista_point)$/)) return 'photo';
  return 'attraction';
}

type GPlace = {
  id: string; displayName?: { text: string }; formattedAddress?: string;
  location?: { latitude: number; longitude: number }; primaryType?: string; types?: string[]; googleMapsUri?: string;
};
const normalize = (p: GPlace) => ({
  id: p.id,
  name: p.displayName?.text ?? '',
  address: p.formattedAddress ?? '',
  lat: p.location?.latitude ?? null,
  lng: p.location?.longitude ?? null,
  category: toCategory(p.primaryType, p.types),
  mapsUri: p.googleMapsUri ?? null,
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!key) return json({ error: 'not_configured' }, 503);
  const base = Deno.env.get('GOOGLE_PLACES_BASE') ?? 'https://places.googleapis.com';
  const url = Deno.env.get('SUPABASE_URL')!;

  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: who } = await asUser.auth.getUser();
  if (!who.user) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: { action?: string; query?: string; category?: Category; center?: { lat: number; lng: number }; cityName?: string; ids?: string[] };
  try { body = await req.json(); } catch { return json({ error: 'bad_request' }, 400); }

  const kind = body.action === 'details' ? 'details' : 'search';
  const { data: allowed, error: limErr } = await admin.rpc('bump_api_usage', { p_user: who.user.id, p_kind: kind, p_limit: LIMITS[kind] });
  if (limErr) return json({ error: 'usage_check_failed' }, 500);
  if (!allowed) return json({ error: 'daily_limit' }, 429);

  const headers = { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key };

  if (kind === 'search') {
    const q = (body.query ?? '').trim().slice(0, 80);
    const cat = body.category && LABEL[body.category] ? body.category : undefined;
    const textQuery = q || (cat ? `${body.cityName ?? ''} ${LABEL[cat]}`.trim() : '');
    if (!textQuery) return json({ places: [] });
    const payload: Record<string, unknown> = { textQuery, languageCode: 'ko', pageSize: 20 };
    if (cat && INCLUDED_TYPE[cat]) payload.includedType = INCLUDED_TYPE[cat];
    if (body.center && Number.isFinite(body.center.lat) && Number.isFinite(body.center.lng)) {
      payload.locationBias = { circle: { center: { latitude: body.center.lat, longitude: body.center.lng }, radius: 20000 } };
    }
    const r = await fetch(`${base}/v1/places:searchText`, { method: 'POST', headers: { ...headers, 'X-Goog-FieldMask': FIELDS_SEARCH }, body: JSON.stringify(payload) });
    if (!r.ok) return json({ error: 'google_error', status: r.status }, 502);
    const data = await r.json() as { places?: GPlace[] };
    return json({ places: (data.places ?? []).map(normalize) });
  }

  const ids = [...new Set((body.ids ?? []).filter((i) => typeof i === 'string' && /^[\w-]{10,300}$/.test(i)))].slice(0, 20);
  const results = await Promise.all(ids.map(async (id) => {
    const r = await fetch(`${base}/v1/places/${encodeURIComponent(id)}?languageCode=ko`, { headers: { ...headers, 'X-Goog-FieldMask': FIELDS_DETAILS } });
    if (!r.ok) return null;
    return normalize(await r.json() as GPlace);
  }));
  return json({ places: results.filter(Boolean) });
});
