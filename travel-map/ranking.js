// 순위 화면: 시트의 호텔을 구글·아고다 평점과 후기 수로 순위를 매겨요.
// 정렬(종합/구글/아고다/후기 많은 순), 평점·후기 수 조건, 태그·5성급 필터, 날짜·인원 선택, 가격 비교 버튼, 후기 요약.
(function () {
  'use strict';
  const app = window.__travelApp;
  if (!app) return;
  const { esc, fmt } = app;
  const $ = (id) => document.getElementById(id);

  // ───────── 점수 계산 (화면 아래에 공개해요) ─────────
  // 1) 구글 5점 만점은 ×2 해서 10점 만점으로 맞춰요.
  // 2) 후기가 적으면 믿기 어려우니 평균(8.0점) 쪽으로 당겨요: (후기수×평점 + 300×8.0) ÷ (후기수 + 300)
  // 3) 종합 = 구글·아고다 보정 점수의 평균 (한쪽만 있으면 그 점수)
  const PRIOR = 8.0; const PRIOR_N = 300;
  const shrink = (score10, n) => (score10 == null ? null : ((n || 0) * score10 + PRIOR_N * PRIOR) / ((n || 0) + PRIOR_N));
  function scores(h) {
    const a = h.rating != null && h.rating !== '' ? Number(h.rating) : null;
    const g = h.gRating != null ? h.gRating * 2 : null;
    const sa = Number.isFinite(a) ? shrink(a, h.reviews) : null;
    const sg = Number.isFinite(g) ? shrink(g, h.gReviews) : null;
    const parts = [sa, sg].filter((x) => x != null);
    return { agoda: Number.isFinite(a) ? a : null, google: h.gRating, total: parts.length ? parts.reduce((x, y) => x + y, 0) / parts.length : null,
      reviewsAll: (h.reviews || 0) + (h.gReviews || 0) };
  }

  const SORTS = [
    ['total', '종합', (x) => x.s.total, (x) => x.s.reviewsAll],
    ['google', '구글 평점', (x) => x.s.google, (x) => x.h.gReviews],
    ['agoda', '아고다 평점', (x) => x.s.agoda, (x) => x.h.reviews],
    ['reviews', '후기 많은 순', (x) => (x.s.reviewsAll || null), (x) => x.s.total],
  ];
  // 조건: [키, 이름, 값 꺼내기, 최소, 최대, 단계]
  const CONDS = [
    ['aScore', '아고다 평점', (h) => num(h.rating), 0, 10, 0.1],
    ['aCount', '아고다 후기 수', (h) => h.reviews, 0, 100000, 100],
    ['gScore', '구글 평점', (h) => h.gRating, 0, 5, 0.1],
    ['gCount', '구글 후기 수', (h) => h.gReviews, 0, 100000, 100],
  ];
  const num = (v) => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : n; };

  const state = { sort: 'total', tags: new Set(), five: false, cond: {} };
  CONDS.forEach(([k, , , lo, hi]) => { state.cond[k] = [lo, hi]; });

  // ───────── 날짜·인원 ─────────
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  function preset(kind) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    let a;
    if (kind === 'weekend') { a = addDays(t, (6 - t.getDay() + 7) % 7); } // 이번 토요일 (오늘이 토요일이면 오늘)
    else a = addDays(t, 14);                                                // 2주 뒤
    $('rk-in').value = iso(a); $('rk-out').value = iso(addDays(a, 1));
    applyStay(false);
  }
  function applyStay(runLive) {
    const st = { checkIn: $('rk-in').value, checkOut: $('rk-out').value, adults: Number($('rk-adults').value) || 2 };
    if (!st.checkIn || !st.checkOut || st.checkOut <= st.checkIn) { $('rk-stay-note').textContent = '체크아웃은 체크인 다음 날 이후로 골라주세요.'; return; }
    window.__travelStay = st;
    const nights = Math.round((Date.parse(st.checkOut) - Date.parse(st.checkIn)) / 86400000);
    $('rk-stay-note').textContent = `${st.checkIn} 체크인 · ${nights}박 · ${st.adults}명 — 아고다 버튼에 이 날짜가 들어가요.`;
    // 지도 화면의 실시간 가격 칸도 같은 날짜로 맞춰요
    if ($('live-in')) { $('live-in').value = st.checkIn; $('live-out').value = st.checkOut; }
    if ($('live-adults') && [...$('live-adults').options].some((o) => o.value === String(st.adults))) $('live-adults').value = String(st.adults);
    render();
    if (runLive && app.liveOn) app.liveSearch();
  }

  // ───────── 화면 그리기 ─────────
  function filtered() {
    const area = app.area();
    return app.model().hotels.filter((h) => {
      if (area !== '전체 보기' && h.area !== area) return false;
      if (state.five && !(h.stars >= 5)) return false;
      for (const t of state.tags) if (!h.tags.includes(t)) return false;
      for (const [k, , get, lo, hi] of CONDS) {
        const [a, b] = state.cond[k];
        if (a === lo && b === hi) continue;      // 건드리지 않은 조건은 통과
        const v = get(h);
        if (v == null || v < a || v > b) return false;
      }
      return true;
    });
  }
  function ranked() {
    const [, , primary, secondary] = SORTS.find((s) => s[0] === state.sort);
    return filtered().map((h) => ({ h, s: scores(h) })).sort((x, y) => {
      const a = primary(x); const b = primary(y);
      if (a == null && b == null) return (secondary(y) || 0) - (secondary(x) || 0);
      if (a == null) return 1; if (b == null) return -1;
      return b - a || (secondary(y) || 0) - (secondary(x) || 0);
    });
  }

  function renderControls() {
    const sorts = $('rk-sorts'); sorts.textContent = '';
    SORTS.forEach(([k, label]) => sorts.appendChild(chip(label, state.sort === k, () => { state.sort = k; render(); })));
    const tags = $('rk-tags'); tags.textContent = '';
    tags.appendChild(chip('5성급', state.five, () => { state.five = !state.five; render(); }));
    const all = [...new Set(app.model().hotels.flatMap((h) => h.tags))];
    all.forEach((t) => tags.appendChild(chip('#' + t, state.tags.has(t), () => { state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t); render(); })));
    const changed = CONDS.filter(([k, , , lo, hi]) => state.cond[k][0] !== lo || state.cond[k][1] !== hi).length;
    $('rk-cond-btn').textContent = changed ? `평점 조건 ${changed}개 ▾` : '평점 조건 ▾';
    $('rk-cond-btn').classList.toggle('active', changed > 0);
  }
  function chip(label, on, onClick) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on ? ' active' : ''); b.textContent = label;
    b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.addEventListener('click', onClick); return b;
  }

  function buildCondPanel() {
    const p = $('rk-cond-panel'); p.textContent = '';
    CONDS.forEach(([k, label, , lo, hi, step]) => {
      const row = document.createElement('div'); row.className = 'cond-row';
      row.innerHTML = `<span class="cond-label">${esc(label)}</span>
        <input type="number" inputmode="decimal" aria-label="${esc(label)} 최소" min="${lo}" max="${hi}" step="${step}" value="${state.cond[k][0]}">
        <span>~</span>
        <input type="number" inputmode="decimal" aria-label="${esc(label)} 최대" min="${lo}" max="${hi}" step="${step}" value="${state.cond[k][1]}">`;
      const [a, b] = row.querySelectorAll('input');
      const upd = () => {
        let x = Number(a.value); let y = Number(b.value);
        if (!Number.isFinite(x) || a.value === '') x = lo; if (!Number.isFinite(y) || b.value === '') y = hi;
        state.cond[k] = [Math.max(lo, Math.min(x, y)), Math.min(hi, Math.max(x, y))]; render();
      };
      a.addEventListener('change', upd); b.addEventListener('change', upd);
      p.appendChild(row);
    });
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'cond-reset'; reset.textContent = '조건 초기화';
    reset.addEventListener('click', () => { CONDS.forEach(([k, , , lo, hi]) => { state.cond[k] = [lo, hi]; }); buildCondPanel(); render(); });
    p.appendChild(reset);
  }

  const one = (n) => (n == null ? '' : (Math.round(n * 10) / 10).toFixed(1));
  function render() {
    if (!document.body.classList.contains('rank-mode')) return;
    renderControls();
    const anyLink = app.model().hotels.some((h) => h.agoda || h.trip || h.rakuten);
    $('rk-disclosure').textContent = anyLink ? ((window.TRAVEL_MAP_CONFIG || {}).disclosure || '') : '';
    const rows = ranked();
    const area = app.area();
    $('rk-count').textContent = `${area === '전체 보기' ? '전체' : area} · ${rows.length}곳` + (rows.length < app.model().hotels.length ? ` (전체 ${app.model().hotels.length}곳 중)` : '');
    const list = $('rk-list'); list.textContent = '';
    if (!rows.length) { list.innerHTML = '<li class="rk-empty">조건에 맞는 숙소가 없어요. 조건을 넓혀 보세요.</li>'; return; }
    rows.forEach(({ h, s }, i) => {
      const li = document.createElement('li'); li.className = 'rk-item';
      const summary = [['위치·교통', h.sumLoc], ['객실', h.sumRoom], ['서비스', h.sumService], ['아쉬운 점', h.bad], ['이런 분께 추천', h.sumFor]].filter((x) => x[1]);
      li.innerHTML = `
        <div class="rk-rank${i < 3 ? ' top' : ''}">${i + 1}</div>
        <div class="rk-thumb">${h.photo ? `<img src="${esc(h.photo)}" alt="" loading="lazy">` : ''}</div>
        <div class="rk-body">
          <p class="rk-kind">${esc([h.kind, h.stars ? `${h.stars}성급` : '', h.area].filter(Boolean).join(' · '))}</p>
          <h3 class="rk-name">${esc(h.name)}</h3>
          ${h.nameEn ? `<p class="rk-en">${esc(h.nameEn)}</p>` : ''}
          ${h.tags.length ? `<p class="rk-tags">${h.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(' ')}</p>` : ''}
          ${h.walk ? `<p class="rk-walk">🚉 ${esc(h.walk)}</p>` : ''}
          <div class="rk-scores">
            <span class="rk-total" title="종합 점수 (아래 계산법 참고)">${s.total != null ? `종합 <b>${one(s.total)}</b>` : '종합 -'}</span>
            ${h.gRating != null ? `<span><span class="src google">구글</span> ★ ${esc(h.gRating)}${h.gReviews ? ` <small>(${esc(fmt(h.gReviews))})</small>` : ''}</span>` : '<span class="src none">구글 정보 없음</span>'}
            ${s.agoda != null ? `<span><span class="src agoda">아고다</span> ${esc(h.rating)}${h.reviews ? ` <small>(${esc(fmt(h.reviews))})</small>` : ''}</span>` : '<span class="src none">아고다 정보 없음</span>'}
          </div>
          ${summary.length ? `<details class="rk-summary"><summary>후기 요약 보기${h.sumBase ? ` <small>(후기 ${esc(fmt(h.sumBase))}개 기준)</small>` : ''}</summary>
            <dl>${summary.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>` : (h.desc ? `<p class="rk-desc">${esc(h.desc)}</p>` : '')}
          <div class="rk-actions"></div>
        </div>`;
      li.querySelectorAll('img').forEach((im) => im.addEventListener('error', () => { im.remove(); }));
      const acts = li.querySelector('.rk-actions');
      app.priceActions(h).forEach(([cls, label, href, sponsored]) => {
        const a = document.createElement('a'); a.className = 'btn sm ' + cls; a.textContent = label.replace(' 가격 보기', '').replace(' 가격 비교', '').replace('에서', '');
        a.href = href; a.target = '_blank'; a.rel = sponsored ? 'sponsored noopener' : 'noopener'; acts.appendChild(a);
      });
      const mapBtn = document.createElement('button'); mapBtn.type = 'button'; mapBtn.className = 'btn sm map'; mapBtn.textContent = '지도에서 보기';
      mapBtn.addEventListener('click', () => { setMode('map'); app.focusHotel(h); });
      acts.appendChild(mapBtn);
      const more = document.createElement('button'); more.type = 'button'; more.className = 'btn sm map'; more.textContent = '자세히';
      more.addEventListener('click', () => app.openHotel(h));
      acts.appendChild(more);
      list.appendChild(li);
    });
  }

  // ───────── 지도 ↔ 순위 전환 ─────────
  function setMode(mode) {
    const rank = mode === 'rank';
    document.body.classList.toggle('rank-mode', rank);
    $('rank-view').hidden = !rank;
    document.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === mode));
    if (location.hash !== (rank ? '#ranking' : '')) history.replaceState(null, '', rank ? '#ranking' : location.pathname + location.search);
    if (rank) render(); else setTimeout(app.invalidate, 0);
  }
  document.querySelectorAll('.view-btn').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.view)));
  $('rk-cond-btn').addEventListener('click', () => { const p = $('rk-cond-panel'); p.hidden = !p.hidden; $('rk-cond-btn').setAttribute('aria-expanded', String(!p.hidden)); });
  $('rk-preset-2w').addEventListener('click', () => preset('2w'));
  $('rk-preset-weekend').addEventListener('click', () => preset('weekend'));
  $('rk-stay').addEventListener('submit', (e) => { e.preventDefault(); applyStay(true); });
  $('rk-in').min = iso(new Date());
  document.addEventListener('travelmap:render', render);

  buildCondPanel();
  preset('2w');
  if (location.hash === '#ranking') setMode('rank');

  window.__travelRanking = { scores, setMode, state };
})();
