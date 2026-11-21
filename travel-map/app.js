// 여행 숙소 지도
// - 구글 시트(CSV) 한 장으로 동네 영역·명소·추천 호텔(빨간 번호)을 그려요.
// - 검색창: ① 내 추천 호텔 검색  ② 장소 검색 → 주변 호텔(회색 점, OpenStreetMap)  ③ 아고다 실시간 가격(워커 연결 시)
// 설정은 config.js 에서만 바꾸면 돼요.
(function () {
  'use strict';
  const CFG = Object.assign({
    title: '여행 숙소 지도', subtitle: '', sheetCsvUrl: '', bookingAid: '', disclosure: '',
    hotelApiUrl: '', agodaCityId: '', agodaCities: {}, currency: 'KRW', language: 'ko-kr',
    overpassUrls: ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'],
    geocodeUrl: 'https://nominatim.openstreetmap.org/search',
  }, window.TRAVEL_MAP_CONFIG || {});
  const SAMPLE_URL = 'data/sample.csv';
  // 동네별 색 (남보라 · 산호 · 청록 · 겨자 · 보라 · 하늘 · 벽돌 · 초록)
  const PALETTE = ['#5055B1', '#E0656B', '#2A9D8F', '#E39B2D', '#8E6CC9', '#3A86C8', '#C8553D', '#4DAC27'];
  const ALL = '전체 보기';
  const NEARBY_MIN_ZOOM = 14;
  const $ = (id) => document.getElementById(id);

  // ───────── 1. 데이터 읽기 ─────────
  function parseCSV(text) {
    const rows = []; let row = []; let cell = ''; let q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const head = (rows.shift() || []).map((h) => h.trim());
    return rows
      .filter((r) => r.some((v) => v.trim() !== ''))
      .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }

  // "33.59,130.41; 33.58,130.42" 또는 geojson.io 좌표([[경도,위도],...]) 둘 다 받아요.
  function parsePolygon(s) {
    if (!s) return null;
    try {
      if (s.trim().startsWith('[')) {
        let a = JSON.parse(s);
        while (Array.isArray(a[0]) && Array.isArray(a[0][0])) a = a[0];
        const pts = a.map((p) => [Number(p[1]), Number(p[0])]);
        return pts.length >= 3 && pts.every(okLatLng) ? pts : null;
      }
      const pts = s.split(/[;/\n]/).map((p) => p.split(',').map(Number)).filter((p) => p.length === 2);
      return pts.length >= 3 && pts.every(okLatLng) ? pts : null;
    } catch { return null; }
  }
  const okLatLng = (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
  const num = (v) => { const t = String(v ?? '').replace(/,/g, '').trim(); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };
  // 링크는 https/http 만 허용 (javascript: 같은 위험한 주소 차단)
  const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const hostIs = (u, domain) => { try { const h = new URL(u).hostname; return h === domain || h.endsWith('.' + domain); } catch { return false; } };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('ko-KR');

  function toModel(rows) {
    const areas = new Map(); const hotels = []; const landmarks = []; const settings = {};
    const ensure = (name) => { if (name && !areas.has(name)) areas.set(name, { name, desc: '', good: '', bad: '', polygon: null, color: '' }); return areas.get(name); };
    rows.forEach((r) => {
      const type = r['구분']; const area = r['동네'];
      // '제목' 줄: 이 시트(도시)의 지도 제목·부제목. 도시마다 시트를 따로 쓸 때 편해요.
      if (type === '제목') { settings.title = r['이름']; settings.subtitle = r['한줄소개']; return; }
      if (type === '동네') {
        const a = ensure(area || r['이름']);
        Object.assign(a, { desc: r['한줄소개'], good: r['장점'], bad: r['아쉬운점'], polygon: parsePolygon(r['영역좌표']), color: /^#[0-9a-f]{6}$/i.test(r['색상'] || '') ? r['색상'] : '' });
        return;
      }
      const lat = num(r['위도']); const lng = num(r['경도']);
      if (lat === null || lng === null || !okLatLng([lat, lng])) return; // 좌표 없는 줄은 건너뛰어요
      ensure(area);
      if (type === '명소') landmarks.push({ name: r['이름'], area, lat, lng });
      else if (type === '호텔' || !type) hotels.push({
        area, lat, lng, name: r['이름'], nameEn: r['영문이름'] || '', rank: r['번호'] || String(hotels.length + 1),
        kind: r['유형'] || '호텔', stars: num(r['성급']),
        tags: (r['태그'] || '').split(/[,#·]/).map((t) => t.trim()).filter(Boolean),
        // 아고다 평점(10점 만점). 예전 시트의 '평점'·'후기수' 칸도 그대로 읽어요.
        rating: r['아고다평점'] || r['평점'], reviews: num(r['아고다후기수'] || r['후기수']),
        gRating: num(r['구글평점']), gReviews: num(r['구글후기수']), gUrl: safeUrl(r['구글맵']),
        walk: r['역까지'], price: r['가격'], photo: safeUrl(r['사진']),
        agoda: safeUrl(r['아고다']), trip: safeUrl(r['트립닷컴']), rakuten: safeUrl(r['라쿠텐']), detail: safeUrl(r['상세링크']),
        desc: r['한줄소개'], good: r['장점'], bad: r['아쉬운점'],
        sumBase: num(r['요약후기수']), sumLoc: r['위치교통'], sumRoom: r['객실'], sumService: r['서비스'], sumFor: r['추천대상'],
        checkin: r['체크인'], checkout: r['체크아웃'],
      });
    });
    // 색상 칸이 빈 동네는 팔레트에서 차례로 색을 줘요
    const list = [...areas.values()];
    list.forEach((a, i) => { if (!a.color) a.color = PALETTE[i % PALETTE.length]; });
    const colorOf = (name) => (areas.get(name) || {}).color || PALETTE[0];
    hotels.forEach((h) => { h.color = colorOf(h.area); });
    return { areas: list, hotels, landmarks, settings };
  }

  // 시트 '편집' 주소를 붙여넣어도 CSV 주소로 바꿔줘요. (시트 공유: 링크가 있는 모든 사용자 보기)
  function normalizeSheetUrl(u) {
    const m = u.match(/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})\/(edit|view)/);
    if (m) {
      const gid = (u.match(/[#&?]gid=(\d+)/) || [])[1] || '0';
      return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
    }
    return u;
  }
  function sourceUrl() {
    const p = new URLSearchParams(location.search).get('sheet');
    const u = (p || CFG.sheetCsvUrl || '').trim();
    return u ? normalizeSheetUrl(u) : SAMPLE_URL;
  }

  // ───────── 2. 지도 ─────────
  // 지도 엔진(mapengine.js): 구글 지도 키가 있으면 구글 지도, 없으면 무료 OpenStreetMap
  const E = window.MapEngine;
  const map = E.createMap('map');
  map.setView([37.5665, 126.978], 12);
  const layer = E.layerGroup().addTo(map);      // 추천 호텔·영역·명소
  const nearbyLayer = E.layerGroup().addTo(map); // 주변 호텔(회색 점)

  let model = { areas: [], hotels: [], landmarks: [] };
  let isSampleData = false;
  let autoSearched = false;
  let current = ALL; let markers = new Map(); let selected = null;
  let searchHits = null;   // ① 검색으로 걸러진 추천 호텔 (null 이면 전체)
  let searchText = '';
  let nearby = [];         // ② 주변 호텔
  let autoMoving = false;  // 코드가 지도를 움직이는 중이면 "이 지역 찾기" 버튼을 띄우지 않아요

  function setStatus(msg, isError) { const s = $('status'); s.textContent = msg || ''; s.classList.toggle('error', !!isError); }
  function fit(bounds, opts) { if (!bounds.isValid()) return; autoMoving = true; map.fitBounds(bounds, Object.assign({ padding: [40, 40], maxZoom: 16 }, opts)); setTimeout(() => { autoMoving = false; }, 400); }
  function moveTo(lat, lng, zoom) { autoMoving = true; map.setView([lat, lng], zoom, { animate: false }); setTimeout(() => { autoMoving = false; }, 400); }

  function renderTabs() {
    const tabs = $('tabs'); tabs.textContent = '';
    [ALL, ...model.areas.map((a) => a.name)].forEach((name) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tab' + (name === current ? ' active' : ''); b.textContent = name;
      const ar = model.areas.find((x) => x.name === name);
      if (ar) { b.classList.add('has-dot'); b.style.setProperty('--c', ar.color); }
      b.addEventListener('click', () => { current = name; clearSearch(false); render(); });
      tabs.appendChild(b);
    });
  }

  const visibleHotels = () => model.hotels.filter((h) => (current === ALL || h.area === current) && (!searchHits || searchHits.has(h)));

  function render(skipFit) {
    renderTabs(); layer.clearLayers(); markers = new Map();
    const inArea = (x) => current === ALL || x.area === current;
    const bounds = L.latLngBounds([]);
    const compact = current === ALL && !searchHits;

    model.areas.filter((a) => a.polygon && (current === ALL || a.name === current)).forEach((a) => {
      const poly = E.polygon(a.polygon, { color: a.color, weight: 2, dashArray: '6 6', fillColor: a.color, fillOpacity: current === ALL ? 0.1 : 0.14 }).addTo(layer);
      if (current === ALL) poly.bindTooltip(a.name, { sticky: true });
      poly.on('click', () => { if (current === ALL && !searchHits) { current = a.name; render(); } });
      if (!searchHits) bounds.extend(poly.getBounds());
    });

    if (!searchHits) model.landmarks.filter(inArea).forEach((l) => {
      E.marker([l.lat, l.lng], { interactive: false, keyboard: false, zIndexOffset: -100,
        icon: E.divIcon({ className: '', iconSize: null, iconAnchor: [10, 12], html: `<div class="landmark">${esc(l.name)}</div>` }) }).addTo(layer);
      bounds.extend([l.lat, l.lng]);
    });

    const list = $('list'); list.textContent = '';
    visibleHotels().forEach((h) => {
      const m = E.marker([h.lat, h.lng], { title: h.name, riseOnHover: true, zIndexOffset: 500,
        icon: E.divIcon({ className: '', iconSize: null, iconAnchor: [14, 14],
          html: `<div class="pin${compact ? ' compact' : ''}" style="--c:${h.color}"><div class="num">${esc(h.rank)}</div><div class="label">${esc(h.name)}</div></div>` }) })
        .on('click', () => openHotel(h)).addTo(layer);
      markers.set(h, m); bounds.extend([h.lat, h.lng]);
      list.appendChild(listItem(`<span class="num" style="--c:${h.color}">${esc(h.rank)}</span>`, h.name, [h.area, ratingText(h), h.walk], () => { map.panTo([h.lat, h.lng]); openHotel(h); }, h));
    });
    $('list-title').textContent = searchHits ? `"${searchText}" 추천 호텔 ${searchHits.size}곳` : '추천 호텔';

    const a = model.areas.find((x) => x.name === current);
    $('area-info').style.setProperty('--c', a ? a.color : '');
    $('area-info').innerHTML = !searchHits && a && (a.desc || a.good || a.bad)
      ? `<h3>${esc(a.name)}</h3>${a.desc ? `<p>${esc(a.desc)}</p>` : ''}${a.good ? `<p class="good">${esc(a.good)}</p>` : ''}${a.bad ? `<p class="bad">${esc(a.bad)}</p>` : ''}`
      : '';

    if (!skipFit) fit(bounds);
    document.dispatchEvent(new CustomEvent('travelmap:render'));
  }

  function listItem(iconHtml, title, subs, onClick, key) {
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'item';
    b.innerHTML = `${iconHtml}<span><b>${esc(title)}</b><small>${esc(subs.filter(Boolean).join(' · '))}</small></span>`;
    b.addEventListener('click', onClick);
    if (key) b._key = key;
    li.appendChild(b); return li;
  }

  const ratingText = (h) => h.rating ? `★ ${h.rating}${h.reviews ? ` (${fmt(h.reviews)})` : ''}` : '';

  // ───────── 3. 상세 카드 (추천 호텔·주변 호텔·실시간 결과 공용) ─────────
  function openCard(v, key) {
    highlight(key);
    const img = $('card-img');
    img.hidden = !v.photo; img.src = v.photo || ''; img.alt = v.name;
    img.onerror = () => { img.hidden = true; };
    $('card').classList.toggle('no-photo', !v.photo);
    $('card-rank').textContent = v.rank || '';
    $('card-rank').className = 'card-rank' + (v.kind ? ' ' + v.kind : '');
    $('card-rank').style.setProperty('--c', v.color || '');
    $('card-photo-note').hidden = !v.photoNote;
    $('card-area').textContent = v.area || '';
    $('card-name').textContent = v.name;
    $('card-meta').innerHTML = v.metaHtml || '';
    $('card-desc').textContent = v.desc || '';
    $('card-points').innerHTML = (v.points || []).map(([cls, t]) => `<li class="${cls}">${esc(t)}</li>`).join('')
      + (v.pointsNote ? `<li class="note">${esc(v.pointsNote)}</li>` : '');
    $('card-price').innerHTML = v.priceHtml || '';
    const acts = $('card-actions'); acts.textContent = '';
    (v.actions || []).forEach(([cls, label, href, sponsored]) => {
      const a = document.createElement('a'); a.className = 'btn ' + cls; a.textContent = label; a.href = href;
      a.target = '_blank'; a.rel = sponsored ? 'sponsored noopener' : 'noopener'; acts.appendChild(a);
    });
    $('card').hidden = false; $('sheet-backdrop').hidden = false; $('card-close').focus();
  }
  function highlight(key) {
    if (selected && markers.get(selected)) markers.get(selected).getElement()?.querySelector('.pin')?.classList.remove('on');
    selected = key || null;
    if (key && markers.get(key)) markers.get(key).getElement()?.querySelector('.pin')?.classList.add('on');
    document.querySelectorAll('.item').forEach((el) => el.classList.toggle('on', !!key && el._key === key));
  }
  function closeCard() { $('card').hidden = true; $('sheet-backdrop').hidden = true; highlight(null); }
  $('card-close').addEventListener('click', closeCard);
  $('sheet-backdrop').addEventListener('click', closeCard);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });

  const bookingSearch = (name) => `https://www.booking.com/searchresults.ko.html?ss=${encodeURIComponent(name)}${CFG.bookingAid ? `&aid=${encodeURIComponent(CFG.bookingAid)}` : ''}`;
  const gmaps = (lat, lng, name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name || `${lat},${lng}`)}`;

  // 날짜·인원(순위 화면에서 고른 값)을 아고다 제휴 링크(partnersearch.aspx)에 붙여요. 단축 링크(tpk.lu 등)는 그대로 둬요.
  function withStay(u) {
    const st = window.__travelStay;
    if (!u || !st || !hostIs(u, 'agoda.com') || !/partnersearch\.aspx/i.test(u)) return u;
    const x = new URL(u);
    x.searchParams.set('checkin', st.checkIn); x.searchParams.set('checkout', st.checkOut);
    x.searchParams.set('NumberofAdults', String(st.adults)); x.searchParams.set('Rooms', '1');
    return x.href;
  }
  function priceActions(h) {
    const actions = [];
    if (h.agoda) actions.push(['agoda', '아고다 가격 보기', withStay(h.agoda), true]);
    if (h.trip) actions.push(['trip', '트립닷컴 가격 비교', h.trip, true]);
    if (h.rakuten) actions.push(['rakuten', '라쿠텐 트래블 가격 비교', h.rakuten, true]);
    if (!h.agoda && !h.trip && !h.rakuten) actions.push(['booking', '부킹닷컴에서 가격 보기', bookingSearch(h.name), !!CFG.bookingAid]);
    return actions;
  }
  function openHotel(h) {
    const actions = priceActions(h);
    if (h.detail) actions.push(['map', '자세히 보기 (후기 글)', h.detail, false]);
    actions.push(['map', '구글맵에서 위치 보기', h.gUrl || `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`, false]);
    const summary = [['loc', '위치·교통', h.sumLoc], ['room', '객실', h.sumRoom], ['svc', '서비스', h.sumService], ['for', '이런 분께 추천', h.sumFor]]
      .filter((x) => x[2]).map(([cls, label, t]) => [cls, `${label}: ${t}`]);
    openCard({
      photo: h.photo, photoNote: isSampleData && h.photo, rank: h.rank, color: h.color,
      area: [h.kind, h.stars ? `${h.stars}성급` : '', h.area].filter(Boolean).join(' · '), name: h.name,
      metaHtml: [
        h.rating ? `<span class="src agoda">아고다</span> <span class="stars">${esc(h.rating)}</span>${h.reviews ? ` (${esc(fmt(h.reviews))})` : ''}` : '',
        h.gRating ? `<span class="src google">구글</span> <span class="stars">★ ${esc(h.gRating)}</span>${h.gReviews ? ` (${esc(fmt(h.gReviews))})` : ''}` : '<span class="src none">구글 정보 없음</span>',
        h.walk ? `🚶 ${esc(h.walk)}` : '',
      ].filter(Boolean).join(' &nbsp;·&nbsp; ') + (h.tags.length ? `<br>${h.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(' ')}` : '') + (h.nameEn ? `<br><small>${esc(h.nameEn)}</small>` : ''),
      desc: h.desc,
      points: [...summary, h.good && ['good', h.good], h.bad && ['bad', h.bad],
        (h.checkin || h.checkout) && ['time', `체크인 ${h.checkin || '-'} · 체크아웃 ${h.checkout || '-'}`]].filter(Boolean),
      pointsNote: summary.length && h.sumBase ? `후기 ${fmt(h.sumBase)}개를 읽고 정리했어요` : '',
      priceHtml: h.price ? `1박 <b>${esc(h.price)}</b>부터 <small>(시트 기준, 날짜마다 달라요)</small>` : '가격은 매일 달라요. 아래 버튼에서 확인하세요.',
      actions,
    }, h);
  }

  // ───────── 4. 검색 ─────────
  // ① 내 추천 호텔에서 찾기
  function localSearch(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return model.hotels.filter((h) => {
      const text = [h.name, h.nameEn, h.area, h.kind, (h.tags || []).join(' '), h.desc, h.good, h.walk, h.sumLoc, h.sumFor].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }
  function clearSearch(rerender) {
    searchHits = null; searchText = ''; $('search-clear').hidden = true;
    if (rerender) render();
  }

  // ② 장소 이름 → 좌표 (Nominatim, 무료. 정책상 버튼을 누를 때만 1번 요청해요)
  // 지도 데이터(시트의 호텔·명소) 주변을 먼저 찾도록 범위를 알려줘요.
  // 예: 뉴욕 지도에서 "타임스 스퀘어"를 치면 홍콩의 같은 이름 쇼핑몰이 아니라 뉴욕이 나와요.
  function searchArea() {
    const pts = [...model.hotels, ...model.landmarks].map((x) => [x.lat, x.lng]);
    if (!pts.length) return null;
    let b = L.latLngBounds(pts);
    const minPad = 0.25; // 최소 약 25km 여유
    b = L.latLngBounds([b.getSouth() - minPad, b.getWest() - minPad], [b.getNorth() + minPad, b.getEast() + minPad]);
    return [b.getWest(), b.getNorth(), b.getEast(), b.getSouth()].map((n) => n.toFixed(4)).join(',');
  }
  let lastGeocode = 0;
  async function geocode(q) {
    // 무료 서버 정책: 1초에 1번까지만
    const wait = lastGeocode + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastGeocode = Date.now();
    const area = searchArea();
    const u = `${CFG.geocodeUrl}?format=jsonv2&limit=1&accept-language=ko&q=${encodeURIComponent(q)}${area ? `&viewbox=${area}&bounded=0` : ''}`;
    let res;
    try { res = await fetch(u, { headers: { Accept: 'application/json' } }); }
    catch { throw new Error('인터넷 연결을 확인해 주세요.'); }
    if (res.status === 429) throw new Error('검색이 잠시 몰렸어요. 몇 초 뒤 다시 눌러주세요.');
    if (!res.ok) throw new Error('장소 검색 서버가 잠시 응답하지 않아요 (' + res.status + ').');
    let list;
    try { list = await res.json(); } catch { throw new Error('검색이 잠시 몰렸어요. 몇 초 뒤 다시 눌러주세요.'); }
    const hit = Array.isArray(list) ? list[0] : null;
    if (!hit) return null;
    const bb = (hit.boundingbox || []).map(Number);
    return { lat: Number(hit.lat), lng: Number(hit.lon), name: hit.name || hit.display_name, bbox: bb.length === 4 ? bb : null };
  }

  // ② 지도에 보이는 범위의 호텔 (Overpass, OpenStreetMap 데이터)
  async function findNearby() {
    if (map.getZoom() < NEARBY_MIN_ZOOM) { setStatus('지도를 조금 더 확대한 뒤 눌러주세요.'); return; }
    $('nearby-btn').hidden = true;
    const b = map.getBounds();
    const box = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map((n) => n.toFixed(5)).join(',');
    const query = `[out:json][timeout:20];nwr["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"](${box});out center tags 150;`;
    setStatus('주변 호텔을 찾는 중…');
    let data = null; let lastErr = null;
    for (const url of CFG.overpassUrls) {
      try {
        const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json(); break;
      } catch (e) { lastErr = e; }
    }
    if (!data) { setStatus('주변 호텔 서버가 바빠요. 잠시 뒤 다시 눌러주세요. (' + (lastErr && lastErr.message) + ')', true); $('nearby-btn').hidden = false; return; }
    const near = (lat, lng) => model.hotels.some((h) => map.distance([h.lat, h.lng], [lat, lng]) < 60);
    nearby = (data.elements || []).map((e) => {
      const t = e.tags || {}; const lat = e.lat ?? e.center?.lat; const lng = e.lon ?? e.center?.lon;
      const name = t['name:ko'] || t.name || t['name:en'];
      if (!name || !okLatLng([lat, lng]) || near(lat, lng)) return null; // 추천 호텔과 겹치면 빼요
      return { lat, lng, name, nameEn: t['name:en'] || '', kind: t.tourism, stars: num(t.stars),
        addr: [t['addr:city'], t['addr:street'] || t['addr:place'], t['addr:housenumber']].filter(Boolean).join(' '),
        website: safeUrl(t.website || t['contact:website'] || '') };
    }).filter(Boolean);
    renderNearby();
    setStatus(nearby.length ? '' : '이 범위에는 등록된 호텔이 없어요. 지도를 옮겨서 다시 찾아보세요.');
  }
  const KIND = { hotel: '호텔', hostel: '호스텔', guest_house: '게스트하우스', motel: '모텔', apartment: '레지던스' };
  function renderNearby() {
    nearbyLayer.clearLayers();
    const list = $('nearby-list'); list.textContent = '';
    $('nearby-section').hidden = !nearby.length;
    document.querySelector('.side').classList.toggle('has-nearby', nearby.length > 0);
    $('nearby-title').textContent = `주변 호텔 ${nearby.length}곳`;
    nearby.forEach((n) => {
      E.marker([n.lat, n.lng], { title: n.name, riseOnHover: true,
        icon: E.divIcon({ className: '', iconSize: null, iconAnchor: [7, 7], html: `<div class="dot"><span class="dot-label">${esc(n.name)}</span></div>` }) })
        .on('click', () => openNearby(n)).addTo(nearbyLayer);
      list.appendChild(listItem('<span class="dot static"></span>', n.name, [KIND[n.kind] || '숙소', n.stars ? `${n.stars}성급` : ''], () => { map.panTo([n.lat, n.lng]); openNearby(n); }, n));
    });
  }
  function openNearby(n) {
    const actions = [['booking', '부킹닷컴에서 가격 보기', bookingSearch(n.nameEn || n.name), !!CFG.bookingAid]];
    if (n.website) actions.push(['map', '호텔 홈페이지', n.website, false]);
    actions.push(['map', '구글맵에서 보기', gmaps(n.lat, n.lng, n.nameEn || n.name), false]);
    openCard({
      rank: '·', kind: 'gray', area: `주변 ${KIND[n.kind] || '숙소'} · OpenStreetMap 정보`, name: n.name,
      metaHtml: [n.stars ? `<span class="stars">${'★'.repeat(Math.min(5, Math.round(n.stars)))}</span> ${esc(n.stars)}성급` : '', n.nameEn && n.nameEn !== n.name ? esc(n.nameEn) : ''].filter(Boolean).join(' &nbsp;·&nbsp; '),
      desc: n.addr ? '📍 ' + n.addr : '',
      points: [['bad', '아직 직접 확인하지 않은 숙소예요. 후기와 평점은 예약 사이트에서 확인하세요.']],
      priceHtml: '가격은 날짜마다 달라요. 아래 버튼에서 확인하세요.',
      actions,
    }, n);
  }

  // ③ 아고다 실시간 가격 (워커가 연결된 경우에만)
  const liveOn = !!safeUrl(CFG.hotelApiUrl);
  function cityIdFor(q) {
    const key = Object.keys(CFG.agodaCities || {}).find((k) => q && (q.includes(k) || k.includes(q)));
    return key ? CFG.agodaCities[key] : CFG.agodaCityId;
  }
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  function initDates() {
    const a = new Date(); a.setDate(a.getDate() + 30); const b = new Date(a); b.setDate(b.getDate() + 1);
    $('live-in').value = iso(a); $('live-out').value = iso(b); $('live-in').min = iso(new Date());
  }
  async function liveSearch(q) {
    if (!liveOn) return;
    const cityId = cityIdFor(q || '');
    const list = $('live-list'); list.textContent = '';
    if (!cityId) { $('live-note').textContent = '이 도시의 아고다 도시 ID가 config.js에 없어요.'; return; }
    const p = new URLSearchParams({ cityId, checkIn: $('live-in').value, checkOut: $('live-out').value, adults: $('live-adults').value,
      currency: CFG.currency, lang: CFG.language, sort: $('live-sort').value, max: '20' });
    $('live-note').textContent = '실시간 가격을 불러오는 중…';
    try {
      const res = await fetch(CFG.hotelApiUrl.replace(/\/$/, '') + '/search?' + p, { headers: { Accept: 'application/json' } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
      const results = (body.results || []).filter((r) => r && r.name && hostIs(r.url, 'agoda.com'));
      $('live-note').textContent = results.length ? `${$('live-in').value} 체크인 · 1박 기준 · 아고다 제공` : '조건에 맞는 호텔이 없어요.';
      results.forEach((r) => {
        const li = document.createElement('li');
        const b = document.createElement('button'); b.type = 'button'; b.className = 'live-item';
        const img = safeUrl(r.image);
        b.innerHTML = `${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<span class="live-noimg"></span>'}
          <span class="live-text"><b>${esc(r.name)}</b>
          <small>${r.reviewScore ? `★ ${esc(r.reviewScore)}` : ''}${r.reviewCount ? ` (${esc(fmt(r.reviewCount))})` : ''}${r.stars ? ` · ${esc(r.stars)}성급` : ''}</small>
          <span class="live-price">${r.crossedOut && r.crossedOut > r.price ? `<s>${esc(fmt(Math.round(r.crossedOut)))}</s> ` : ''}<b>${esc(fmt(Math.round(r.price)))}</b> ${esc(r.currency)}${r.discount ? ` <em>-${esc(Math.round(r.discount))}%</em>` : ''}</span></span>`;
        b.querySelectorAll('img').forEach((im) => im.addEventListener('error', () => { im.hidden = true; }));
        b.addEventListener('click', () => openLive(r));
        li.appendChild(b); list.appendChild(li);
      });
    } catch (e) {
      $('live-note').textContent = '실시간 가격을 못 불러왔어요: ' + e.message;
    }
  }
  function openLive(r) {
    openCard({
      photo: safeUrl(r.image), rank: '₩', kind: 'live', area: '아고다 실시간 가격', name: r.name,
      metaHtml: [r.reviewScore ? `<span class="stars">★ ${esc(r.reviewScore)}</span>${r.reviewCount ? ` 후기 ${esc(fmt(r.reviewCount))}개` : ''}` : '', r.stars ? `${esc(r.stars)}성급` : ''].filter(Boolean).join(' &nbsp;·&nbsp; '),
      points: [r.breakfast && ['good', '조식 포함 요금'], r.wifi && ['good', '무료 와이파이']].filter(Boolean),
      priceHtml: `1박 <b>${esc(fmt(Math.round(r.price)))} ${esc(r.currency)}</b>${r.crossedOut && r.crossedOut > r.price ? ` <s>${esc(fmt(Math.round(r.crossedOut)))}</s>` : ''} <small>(${esc($('live-in').value)} 기준, 세금·수수료 별도일 수 있어요)</small>`,
      actions: [['agoda', '아고다에서 예약하기', r.url, true]],
    });
  }

  // 검색창 제출: ① 내 목록에 있으면 그걸 보여주고, 없으면 ② 장소로 이동해서 주변 호텔을 찾아요. ③은 함께 실행.
  async function onSearch(e) {
    e.preventDefault();
    const q = $('search-input').value.trim();
    if (!q) { clearSearch(true); return; }
    closeCard();
    const hits = localSearch(q);
    liveSearch(q);
    if (hits.length) {
      searchHits = new Set(hits); searchText = q; current = ALL; $('search-clear').hidden = false;
      render(); setStatus('');
      $('nearby-btn').hidden = false; // 추천 호텔을 보여준 뒤에도 주변 호텔을 더 찾을 수 있게
      return;
    }
    current = ALL; // 다른 곳으로 이동하니 동네 탭은 '전체 보기'로 돌려요
    clearSearch(false); render(true);
    setStatus(`"${q}" 위치를 찾는 중…`);
    try {
      const g = await geocode(q);
      if (!g) {
        // 외국 지명은 한글 이름이 등록되지 않은 곳이 많아요 (예: 카오산로드 → Khao San Road)
        const hint = /[가-힣]/.test(q) ? ' 외국 장소는 영어로 검색하면 잘 찾아져요. (예: Khao San Road)' : ' 도시·역·동네 이름으로 다시 검색해 보세요.';
        setStatus(`"${q}"을(를) 찾지 못했어요.${hint}`, true); return;
      }
      const bb = g.bbox; // [남, 북, 서, 동]
      const small = bb && map.distance([bb[0], bb[2]], [bb[1], bb[3]]) < 3000;
      if (bb && small) fit(L.latLngBounds([bb[0], bb[2]], [bb[1], bb[3]]), { maxZoom: 16, padding: [0, 0], animate: false });
      else moveTo(g.lat, g.lng, 15);
      await map.whenIdle();
      if (map.getZoom() < NEARBY_MIN_ZOOM) { moveTo(g.lat, g.lng, 15); await map.whenIdle(); }
      $('search-clear').hidden = false;
      await findNearby();
    } catch (err) {
      setStatus(err.message, true);
    }
  }
  $('search').addEventListener('submit', onSearch);
  $('search-clear').addEventListener('click', () => {
    $('search-input').value = ''; nearby = []; renderNearby(); $('nearby-btn').hidden = true; setStatus('');
    clearSearch(true);
  });
  $('nearby-btn').addEventListener('click', findNearby);
  map.on('moveend', () => { if (!autoMoving && map.getZoom() >= NEARBY_MIN_ZOOM) $('nearby-btn').hidden = false; });

  if (liveOn) {
    $('live-section').hidden = false; initDates();
    $('live-form').addEventListener('submit', (e) => { e.preventDefault(); liveSearch($('search-input').value.trim() || CFG.title); });
  }

  // ───────── 5. 시트 불러오기 ─────────
  async function load() {
    const url = sourceUrl(); const isSample = url === SAMPLE_URL;
    $('sample-badge').hidden = !isSample; isSampleData = isSample;
    setStatus(isSample ? '예시 데이터를 불러오는 중…' : '구글 시트를 불러오는 중…');
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (/^\s*</.test(text)) throw new Error('CSV가 아니라 웹페이지가 왔어요. 시트를 "웹에 게시 → CSV"로 했는지 확인하세요.');
      model = toModel(parseCSV(text));
      if (!model.hotels.length) throw new Error('호텔 줄을 못 찾았어요. 첫 줄 제목(구분, 동네, 이름, 위도, 경도…)을 확인하세요.');
      if (current !== ALL && !model.areas.some((a) => a.name === current)) current = ALL;
      if (searchHits) searchHits = new Set(localSearch(searchText));
      const anyAffiliate = model.hotels.some((h) => h.agoda || h.trip) || !!CFG.bookingAid || liveOn;
      $('disclosure').textContent = anyAffiliate ? CFG.disclosure : '';
      const title = (model.settings && model.settings.title) || CFG.title;
      $('title').textContent = title; document.title = title;
      $('subtitle').textContent = (model.settings && model.settings.subtitle) || CFG.subtitle;
      render(); setStatus('');
      // 여행 홈 검색에서 넘어온 검색어(?q=)가 있으면 한 번 바로 찾아요
      const q0 = new URLSearchParams(location.search).get('q');
      if (q0 && !autoSearched) { autoSearched = true; $('search-input').value = q0.slice(0, 80); $('search').requestSubmit(); }
      if (liveOn) liveSearch($('search-input').value.trim() || CFG.title);
    } catch (e) {
      setStatus('불러오기 실패: ' + e.message, true);
    }
  }

  $('title').textContent = CFG.title; document.title = CFG.title;
  $('subtitle').textContent = CFG.subtitle;
  $('reload').addEventListener('click', load);
  load();

  // 테스트·디버깅용
  window.__travelMap = { parseCSV, parsePolygon, normalizeSheetUrl, toModel, localSearch: (q) => localSearch(q).map((h) => h.name) };
  // 순위 화면(ranking.js)이 쓰는 연결 고리
  window.__travelApp = {
    model: () => model, area: () => current, isSample: () => isSampleData, esc, fmt, priceActions,
    openHotel, liveSearch: (q) => liveSearch(q || $('search-input').value.trim() || CFG.title), liveOn,
    focusHotel: (h) => { map.invalidateSize(); moveTo(h.lat, h.lng, 16); openHotel(h); },
    invalidate: () => map.invalidateSize(),
  };
})();
