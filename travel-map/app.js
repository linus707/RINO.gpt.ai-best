// 여행 숙소 지도: 구글 시트(CSV) 한 장을 읽어서 동네 영역, 명소, 호텔 마커, 상세 카드를 그려요.
// 데이터를 바꾸려면 시트만 고치면 돼요. 이 파일은 건드릴 필요가 없어요.
(function () {
  'use strict';
  const CFG = Object.assign({ title: '여행 숙소 지도', subtitle: '', sheetCsvUrl: '', bookingAid: '', disclosure: '' }, window.TRAVEL_MAP_CONFIG || {});
  const SAMPLE_URL = 'data/sample.csv';
  const ALL = '전체 보기';
  const $ = (id) => document.getElementById(id);

  // ───────── 1. CSV 읽기 ─────────
  // 따옴표로 감싼 칸(쉼표·줄바꿈 포함)도 제대로 읽어요.
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
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toModel(rows) {
    const areas = new Map(); const hotels = []; const landmarks = [];
    const ensure = (name) => { if (name && !areas.has(name)) areas.set(name, { name, desc: '', good: '', bad: '', polygon: null }); return areas.get(name); };
    rows.forEach((r) => {
      const type = r['구분']; const area = r['동네'];
      if (type === '동네') {
        const a = ensure(area || r['이름']);
        Object.assign(a, { desc: r['한줄소개'], good: r['장점'], bad: r['아쉬운점'], polygon: parsePolygon(r['영역좌표']) });
        return;
      }
      const lat = num(r['위도']); const lng = num(r['경도']);
      if (lat === null || lng === null || !okLatLng([lat, lng])) return; // 좌표 없는 줄은 건너뛰어요
      ensure(area);
      if (type === '명소') landmarks.push({ name: r['이름'], area, lat, lng });
      else if (type === '호텔' || !type) hotels.push({
        area, lat, lng, name: r['이름'], rank: r['번호'] || String(hotels.length + 1),
        rating: r['평점'], reviews: num(r['후기수']), walk: r['역까지'], price: r['가격'], photo: safeUrl(r['사진']),
        agoda: safeUrl(r['아고다']), trip: safeUrl(r['트립닷컴']), desc: r['한줄소개'], good: r['장점'], bad: r['아쉬운점'],
        checkin: r['체크인'], checkout: r['체크아웃'],
      });
    });
    return { areas: [...areas.values()], hotels, landmarks };
  }

  // ───────── 2. 시트 주소 정리 ─────────
  // 초보자가 시트 '편집' 주소를 그대로 붙여넣어도 CSV 주소로 바꿔줘요. (시트가 '링크가 있는 모든 사용자' 보기 공유여야 해요)
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

  // ───────── 3. 지도 ─────────
  const map = L.map('map', { zoomControl: true, attributionControl: true });
  // 무료 OpenStreetMap 지도 (회색 톤은 style.css 에서 입혀요). 방문자가 아주 많아지면 유료 지도(Mapbox 등)로 바꾸세요.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  map.setView([37.5665, 126.978], 12);
  const layer = L.layerGroup().addTo(map);

  let model = { areas: [], hotels: [], landmarks: [] };
  let isSampleData = false;
  let current = ALL; let markers = new Map(); let selected = null;

  function setStatus(msg, isError) { const s = $('status'); s.textContent = msg || ''; s.classList.toggle('error', !!isError); }

  function renderTabs() {
    const tabs = $('tabs'); tabs.textContent = '';
    [ALL, ...model.areas.map((a) => a.name)].forEach((name) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tab' + (name === current ? ' active' : ''); b.textContent = name;
      b.addEventListener('click', () => { current = name; render(); });
      tabs.appendChild(b);
    });
  }

  function render() {
    renderTabs(); layer.clearLayers(); markers = new Map();
    const inArea = (x) => current === ALL || x.area === current;
    const bounds = L.latLngBounds([]);

    model.areas.filter((a) => a.polygon && (current === ALL || a.name === current)).forEach((a) => {
      const poly = L.polygon(a.polygon, { color: '#dc2626', weight: 2, dashArray: '6 6', fillColor: '#dc2626', fillOpacity: current === ALL ? 0.07 : 0.12 }).addTo(layer);
      if (current === ALL) poly.bindTooltip(a.name, { sticky: true });
      poly.on('click', () => { if (current === ALL) { current = a.name; render(); } });
      bounds.extend(poly.getBounds());
    });

    model.landmarks.filter(inArea).forEach((l) => {
      L.marker([l.lat, l.lng], { interactive: false, keyboard: false, zIndexOffset: -100,
        icon: L.divIcon({ className: '', iconSize: null, iconAnchor: [10, 12], html: `<div class="landmark">${esc(l.name)}</div>` }) }).addTo(layer);
      bounds.extend([l.lat, l.lng]);
    });

    const list = $('list'); list.textContent = '';
    model.hotels.filter(inArea).forEach((h) => {
      const m = L.marker([h.lat, h.lng], { title: h.name, riseOnHover: true,
        icon: L.divIcon({ className: '', iconSize: null, iconAnchor: [14, 14],
          html: `<div class="pin${current === ALL ? ' compact' : ''}"><div class="num">${esc(h.rank)}</div><div class="label">${esc(h.name)}</div></div>` }) })
        .on('click', () => openCard(h)).addTo(layer);
      markers.set(h, m); bounds.extend([h.lat, h.lng]);

      const li = document.createElement('li');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'item';
      b.innerHTML = `<span class="num">${esc(h.rank)}</span><span><b>${esc(h.name)}</b><small>${esc([h.area, ratingText(h), h.walk].filter(Boolean).join(' · '))}</small></span>`;
      b.addEventListener('click', () => { map.panTo([h.lat, h.lng]); openCard(h); });
      li.appendChild(b); list.appendChild(li);
    });

    const a = model.areas.find((x) => x.name === current);
    $('area-info').innerHTML = a && (a.desc || a.good || a.bad)
      ? `<h3>${esc(a.name)}</h3>${a.desc ? `<p>${esc(a.desc)}</p>` : ''}${a.good ? `<p class="good">${esc(a.good)}</p>` : ''}${a.bad ? `<p class="bad">${esc(a.bad)}</p>` : ''}`
      : '';

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }

  const ratingText = (h) => h.rating ? `★ ${h.rating}${h.reviews ? ` (${h.reviews.toLocaleString('ko-KR')})` : ''}` : '';

  // ───────── 4. 호텔 상세 카드 ─────────
  function openCard(h) {
    if (selected && markers.get(selected)) markers.get(selected).getElement()?.querySelector('.pin')?.classList.remove('on');
    selected = h;
    markers.get(h)?.getElement()?.querySelector('.pin')?.classList.add('on');
    document.querySelectorAll('.item').forEach((el, i) => el.classList.toggle('on', model.hotels.filter((x) => current === ALL || x.area === current)[i] === h));

    const img = $('card-img');
    img.hidden = !h.photo; img.src = h.photo || ''; img.alt = h.name;
    img.onerror = () => { img.hidden = true; };
    $('card-rank').textContent = h.rank;
    $('card-photo-note').hidden = !(isSampleData && h.photo);
    $('card-area').textContent = h.area || '';
    $('card-name').textContent = h.name;
    $('card-meta').innerHTML = [h.rating ? `<span class="stars">★ ${esc(h.rating)}</span>${h.reviews ? ` 후기 ${esc(h.reviews.toLocaleString('ko-KR'))}개` : ''}` : '', h.walk ? `🚶 ${esc(h.walk)}` : '']
      .filter(Boolean).join(' &nbsp;·&nbsp; ');
    $('card-desc').textContent = h.desc || '';
    $('card-points').innerHTML = [
      h.good && `<li class="good">${esc(h.good)}</li>`,
      h.bad && `<li class="bad">${esc(h.bad)}</li>`,
      (h.checkin || h.checkout) && `<li class="time">체크인 ${esc(h.checkin || '-')} · 체크아웃 ${esc(h.checkout || '-')}</li>`,
    ].filter(Boolean).join('');
    $('card-price').innerHTML = h.price ? `1박 <b>${esc(h.price)}</b>부터 <small>(시트 기준, 날짜마다 달라요)</small>` : '가격은 날짜마다 달라요. 아래 버튼에서 확인하세요.';

    const acts = $('card-actions'); acts.textContent = '';
    const add = (cls, label, href, sponsored) => {
      const a = document.createElement('a'); a.className = 'btn ' + cls; a.textContent = label; a.href = href;
      a.target = '_blank'; a.rel = sponsored ? 'sponsored noopener' : 'noopener'; acts.appendChild(a);
    };
    if (h.agoda) add('agoda', '아고다에서 가격 보기', h.agoda, true);
    if (h.trip) add('trip', '트립닷컴 가격 비교', h.trip, true);
    if (!h.agoda && !h.trip) {
      const q = encodeURIComponent(h.name);
      add('booking', '부킹닷컴에서 가격 보기', `https://www.booking.com/searchresults.ko.html?ss=${q}${CFG.bookingAid ? `&aid=${encodeURIComponent(CFG.bookingAid)}` : ''}`, !!CFG.bookingAid);
    }
    add('map', '구글맵에서 위치 보기', `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`, false);

    $('card').hidden = false; $('sheet-backdrop').hidden = false; $('card-close').focus();
  }
  function closeCard() {
    $('card').hidden = true; $('sheet-backdrop').hidden = true;
    if (selected) markers.get(selected)?.getElement()?.querySelector('.pin')?.classList.remove('on');
    document.querySelectorAll('.item.on').forEach((el) => el.classList.remove('on'));
    selected = null;
  }
  $('card-close').addEventListener('click', closeCard);
  $('sheet-backdrop').addEventListener('click', closeCard);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });

  // ───────── 5. 불러오기 ─────────
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
      const anyAffiliate = model.hotels.some((h) => h.agoda || h.trip) || !!CFG.bookingAid;
      $('disclosure').textContent = anyAffiliate ? CFG.disclosure : '';
      render(); setStatus('');
    } catch (e) {
      setStatus('불러오기 실패: ' + e.message, true);
    }
  }

  $('title').textContent = CFG.title; document.title = CFG.title;
  $('subtitle').textContent = CFG.subtitle;
  $('reload').addEventListener('click', load);
  load();

  // 테스트·디버깅용으로만 내보내요.
  window.__travelMap = { parseCSV, parsePolygon, normalizeSheetUrl, toModel };
})();
