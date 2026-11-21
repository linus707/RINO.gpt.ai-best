// 여행 홈: 치는 대로 도시가 뜨는 검색창, 도시 카드, 이달의 여행지 날씨, 카드 등장 애니메이션, (선택) 애드센스
(function () {
  'use strict';
  const CFG = Object.assign({ title: '여행 숙소 지도', subtitle: '', adsenseClient: '', adsenseSlot: '', cities: [] }, window.TRAVEL_HOME_CONFIG || {});
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => { if (!u) return ''; try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const MAP_PAGE = '../travel-map/';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let climate = {};

  const cities = CFG.cities.map((c) => Object.assign({ aliases: [], colors: ['#5055B1', '#7C82D6'] }, c, { map: safeUrl(c.map), photo: safeUrl(c.photo) }));
  const rankUrl = (c) => (c.map ? c.map.replace(/#.*$/, '') + '#ranking' : '');

  // 서울 기준 이번 달(1~12)
  const nowMonth = () => Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', month: 'numeric' }).format(new Date()));
  let monthOffset = 0;
  const shownMonth = () => ((nowMonth() - 1 + monthOffset) % 12) + 1;

  // 최고 기온으로 옷차림 한 줄
  function outfit(hi, rain) {
    let t = hi >= 28 ? '반팔·자외선 차단' : hi >= 23 ? '반팔·얇은 겉옷' : hi >= 17 ? '긴팔·가디건' : hi >= 12 ? '자켓·니트' : hi >= 6 ? '코트' : '패딩·목도리';
    if (rain != null && rain >= 200) t += ' · 우산 필수';
    return t;
  }
  const monthData = (id, m) => climate[id] && climate[id].months ? climate[id].months[m - 1] : null;

  // ───────── 1. 치는 대로 도시가 뜨는 검색창 ─────────
  const norm = (t) => String(t || '').replace(/\s/g, '').toLowerCase();
  const input = $('q'); const box = $('results');
  let found = []; let active = -1;
  function matches(q) {
    const n = norm(q); if (!n) return [];
    return cities.filter((c) => [c.name, c.en, c.country, ...c.aliases].some((t) => norm(t).includes(n)));
  }
  function closeList() { box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
  function renderList() {
    const q = input.value.trim(); box.textContent = ''; found = []; active = -1;
    if (!q) { closeList(); return; }
    const hits = matches(q);
    const add = (href, html, cls) => {
      const i = found.length; found.push(href);
      const a = document.createElement('a'); a.href = href; a.id = 'opt-' + i; a.className = 'opt ' + (cls || '');
      a.setAttribute('role', 'option'); a.setAttribute('aria-selected', 'false'); a.innerHTML = html;
      a.addEventListener('mousedown', (e) => e.preventDefault()); box.appendChild(a);
    };
    if (hits.length) {
      const head = document.createElement('div'); head.className = 'opt-group'; head.textContent = '도시'; box.appendChild(head);
      hits.forEach((c) => {
        const w = monthData(c.id, shownMonth());
        const target = c.map || '#city-' + c.id;
        add(target, `<b>${esc(c.flag)} ${esc(c.name)}</b> <small>${esc(c.en)} · ${esc(c.country)}</small>
          <span class="opt-meta">${c.map ? '숙소 지도' : '지도 준비 중'}${w ? ` · ${shownMonth()}월 ${w.hi}°/${w.lo}°` : ''}</span>`);
      });
    }
    // 목록에 없으면 지도 페이지의 검색(동네·호텔·장소)으로 넘겨요
    add(MAP_PAGE + '?q=' + encodeURIComponent(q), `🔍 <b>"${esc(q)}"</b> 지도에서 찾기 <small>호텔·동네·장소</small>`, 'opt-more');
    box.hidden = false; input.setAttribute('aria-expanded', 'true');
  }
  function setActive(i) {
    active = i;
    box.querySelectorAll('[role=option]').forEach((el, k) => el.setAttribute('aria-selected', String(k === i)));
    const el = $('opt-' + i); if (el) { input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
  }
  input.addEventListener('input', renderList);
  input.addEventListener('focus', renderList);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeList(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (box.hidden) renderList(); if (!found.length) return;
      setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + found.length) % found.length);
    }
  });
  $('find').addEventListener('submit', (e) => {
    e.preventDefault(); if (box.hidden) renderList();
    const href = found[active < 0 ? 0 : active]; if (href) go(href);
  });
  function go(href) { closeList(); if (href.startsWith('#')) { const el = document.querySelector(href); if (el) { el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' }); pulse(el); } } else location.href = href; }
  box.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a && a.getAttribute('href').startsWith('#')) { e.preventDefault(); go(a.getAttribute('href')); } });
  document.addEventListener('click', (e) => { if (!$('find').contains(e.target)) closeList(); });

  // 빠른 단추 (지도가 있는 도시 먼저)
  function renderQuick() {
    const q = $('quick'); q.textContent = '';
    [...cities].sort((a, b) => (b.map ? 1 : 0) - (a.map ? 1 : 0)).slice(0, 6).forEach((c) => {
      const a = document.createElement('a'); a.className = 'pill'; a.href = c.map || '#city-' + c.id; a.textContent = c.name;
      if (!c.map) a.addEventListener('click', (e) => { e.preventDefault(); go('#city-' + c.id); });
      q.appendChild(a);
    });
  }

  // ───────── 2. 도시 사진 카드 ─────────
  function renderCities() {
    const grid = $('cities'); grid.textContent = '';
    const m = shownMonth();
    cities.forEach((c) => {
      const w = monthData(c.id, m);
      const art = document.createElement('article'); art.className = 'city' + (c.map ? '' : ' soon'); art.id = 'city-' + c.id;
      const bg = c.photo ? '' : ` style="background:linear-gradient(135deg, ${esc(c.colors[0])}, ${esc(c.colors[1])})"`;
      art.innerHTML = `
        <a class="city-photo" href="${esc(c.map || '#weather')}"${bg} aria-label="${esc(c.name)} ${c.map ? '숙소 지도 열기' : '날씨 보기'}">
          ${c.photo ? `<img src="${esc(c.photo)}" alt="" loading="lazy">` : `<span class="city-flag" aria-hidden="true">${esc(c.flag)}</span>`}
          <b class="city-name">${esc(c.name)}<small>${esc(c.en)}</small></b>
          ${w ? `<span class="city-temp">${m}월 ${w.hi}° / ${w.lo}°</span>` : ''}
        </a>
        <div class="city-links">
          ${c.map ? `<a href="${esc(c.map)}">숙소 지도</a><a href="${esc(rankUrl(c))}">숙소 순위</a>` : '<span class="muted">숙소 지도 준비 중</span>'}
          ${climate[c.id] ? `<button type="button" class="linkish" data-wx="${esc(c.id)}">월별 날씨</button>` : ''}
        </div>`;
      art.querySelectorAll('img').forEach((im) => im.addEventListener('error', () => { im.remove(); art.querySelector('.city-photo').style.background = `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})`; }));
      if (!c.map) art.querySelector('.city-photo').addEventListener('click', (e) => { e.preventDefault(); if (climate[c.id]) openWx(c.id); else go('#weather'); });
      grid.appendChild(art);
    });
  }

  // ───────── 3. 이달의 여행지 날씨 ─────────
  function renderWeather() {
    const m = shownMonth(); const row = $('weather-row'); row.textContent = '';
    const list = cities.filter((c) => monthData(c.id, m));
    $('weather-note').textContent = `${m}월 평균 · ${list.length}개 도시` + (cities.length > list.length ? ` (날씨 자료 준비 중: ${cities.filter((c) => !climate[c.id]).map((c) => c.name).join(', ')})` : '');
    list.forEach((c) => {
      const w = monthData(c.id, m);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wcard'; b.dataset.wx = c.id;
      b.innerHTML = `<span class="wcard-city">${esc(c.flag)} ${esc(c.name)}</span>
        <span class="wcard-temp"><b>${w.hi}°</b><i>${w.lo}°</i></span>
        <span class="wcard-rain">💧 ${w.rain != null ? w.rain + 'mm' : '-'}</span>
        <span class="wcard-wear">${esc(outfit(w.hi, w.rain))}</span>`;
      row.appendChild(b);
    });
    document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', Number(x.dataset.m) === monthOffset));
  }
  document.querySelectorAll('.seg button').forEach((x) => x.addEventListener('click', () => { monthOffset = Number(x.dataset.m); renderAll(); animateIn($('weather-row')); }));
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-wx]'); if (t) openWx(t.dataset.wx); });

  function openWx(id) {
    const c = cities.find((x) => x.id === id); const d = climate[id]; if (!c || !d) return;
    $('wx-title').textContent = `${c.flag} ${c.name} 월별 날씨`;
    $('wx-sub').textContent = `평균 최고·최저 기온과 월 강수량 (${d.period})`;
    const cur = shownMonth();
    $('wx-body').innerHTML = d.months.map((w, i) => `<tr class="${i + 1 === cur ? 'cur' : ''}"><th scope="row">${i + 1}월</th><td>${w.hi}°</td><td>${w.lo}°</td><td>${w.rain != null ? w.rain + 'mm' : '-'}</td><td>${esc(outfit(w.hi, w.rain))}</td></tr>`).join('');
    $('wx-src').textContent = '출처: ' + d.source + (d.station ? ` (관측소 ${d.station})` : '');
    const acts = $('wx-actions'); acts.textContent = '';
    if (c.map) { const a = document.createElement('a'); a.className = 'btn primary'; a.href = c.map; a.textContent = `${c.name} 숙소 지도 보기`; acts.appendChild(a); }
    $('wx').hidden = false; $('backdrop').hidden = false; $('wx-close').focus();
  }
  const closeWx = () => { $('wx').hidden = true; $('backdrop').hidden = true; };
  $('wx-close').addEventListener('click', closeWx); $('backdrop').addEventListener('click', closeWx);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeWx(); });

  // ───────── 4. 카드 등장 애니메이션 (브라우저 기본 기능, 움직임 줄이기 설정을 지켜요) ─────────
  function animateIn(container) {
    if (reduceMotion.matches || !Element.prototype.animate) return;
    [...container.children].forEach((el, i) => el.animate(
      [{ opacity: 0.2, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 320, delay: Math.min(i * 45, 270), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  }
  function pulse(el) { if (!reduceMotion.matches && el.animate) el.animate([{ boxShadow: '0 0 0 0 rgba(80,85,177,.5)' }, { boxShadow: '0 0 0 10px rgba(80,85,177,0)' }], { duration: 900 }); }
  const seen = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { seen.unobserve(en.target); animateIn(en.target); } }), { threshold: 0.08 });

  // ───────── 5. 구글 애드센스 (게시자 ID가 있을 때만) ─────────
  function initAds() {
    const id = String(CFG.adsenseClient || '').trim();
    if (!/^ca-pub-\d{10,20}$/.test(id)) return;
    const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(id);
    document.head.appendChild(s);
    const slot = String(CFG.adsenseSlot || '').trim();
    if (/^\d{5,20}$/.test(slot)) {
      const box = $('ad-top'); box.hidden = false;
      const ins = document.createElement('ins'); ins.className = 'adsbygoogle'; ins.style.display = 'block';
      ins.dataset.adClient = id; ins.dataset.adSlot = slot; ins.dataset.adFormat = 'auto'; ins.dataset.fullWidthResponsive = 'true';
      box.appendChild(ins);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
    $('disclosure').textContent = '이 페이지에는 광고와 제휴 링크가 있어요. 예약하시면 일정 수수료를 받을 수 있고, 가격은 같아요.';
  }

  // ───────── 사진 출처 (자유 라이선스 사진은 저작자·라이선스·원본을 꼭 밝혀야 해요) ─────────
  function renderCredits() {
    const list = $('credit-list'); list.textContent = '';
    cities.filter((c) => c.photo && c.photoCredit).forEach((c) => {
      const cr = c.photoCredit; const li = document.createElement('li');
      const src = safeUrl(cr.source); const lic = safeUrl(cr.licenseUrl);
      li.innerHTML = `<b>${esc(c.name)}</b> — ${src ? `<a href="${esc(src)}" target="_blank" rel="noopener">원본 사진</a>` : '사진'}`
        + `${cr.artist ? ` © ${esc(cr.artist)}` : ''}, `
        + (lic ? `<a href="${esc(lic)}" target="_blank" rel="noopener license">${esc(cr.license)}</a>` : esc(cr.license || ''))
        + ' · 위키미디어 커먼즈';
      list.appendChild(li);
    });
    $('credits').hidden = !list.children.length;
  }

  function renderAll() { renderCities(); renderWeather(); }

  async function start() {
    $('title').textContent = CFG.title; document.title = CFG.title; $('subtitle').textContent = CFG.subtitle;
    try { const r = await fetch('data/climate.json', { cache: 'no-cache' }); if (r.ok) climate = await r.json(); } catch { climate = {}; }
    renderQuick(); renderAll(); renderCredits();
    seen.observe($('cities')); seen.observe($('weather-row'));
    initAds();
  }
  start();
  window.__travelHome = { outfit, matches: (q) => matches(q).map((c) => c.id) };
})();
