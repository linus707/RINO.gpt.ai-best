// 지도 엔진 고르기: config.js 에 googleMapsKey 가 있으면 구글 지도, 없으면 무료 OpenStreetMap(Leaflet).
// app.js 는 이 파일이 만든 window.MapEngine 만 써서, 어떤 지도든 같은 코드로 그려요.
// 지도가 준비되면 app.js → ranking.js 순서로 불러와요.
(function () {
  'use strict';
  const CFG = window.TRAVEL_MAP_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const key = String(CFG.googleMapsKey || '').trim();
  // ?map=osm 이면 키가 있어도 무료 지도로 (구글 키 오류 때 자동으로 넘어오는 길이기도 해요)
  const wantGoogle = /^[A-Za-z0-9_-]{20,60}$/.test(key) && params.get('map') !== 'osm';

  function loadScripts(list) {
    return list.reduce((p, src) => p.then(() => new Promise((ok, fail) => {
      const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error(src)); document.body.appendChild(s);
    })), Promise.resolve());
  }
  const startApp = () => loadScripts(['app.js', 'ranking.js']);
  const dist = (a, b) => L.latLng(a).distanceTo(L.latLng(b)); // 미터

  // ───────── 무료 지도 (Leaflet + OpenStreetMap) ─────────
  function leafletEngine() {
    return {
      name: 'osm',
      createMap(el) {
        const map = L.map(el, { zoomControl: true, attributionControl: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        map.whenIdle = () => Promise.resolve();
        return map;
      },
      layerGroup: () => L.layerGroup(),
      polygon: (pts, style) => L.polygon(pts, style),
      marker: (latlng, opts) => L.marker(latlng, opts),
      divIcon: (opts) => L.divIcon(opts),
      distance: dist,
    };
  }

  // ───────── 구글 지도 ─────────
  function googleEngine(gm) {
    const { Map, Polygon, Polyline, OverlayView, LatLngBounds, event } = gm;

    // HTML 로 그리는 표시(번호 핀, 명소 이름표, 주변 호텔 점)
    class HtmlMarker extends OverlayView {
      constructor(latlng, opts) {
        super(); this.pos = { lat: latlng[0], lng: latlng[1] }; this.opts = opts || {}; this.handlers = {};
        const icon = this.opts.icon || {};
        this.div = document.createElement('div'); this.div.className = 'gm-html-marker';
        this.div.style.position = 'absolute'; this.div.innerHTML = icon.html || '';
        this.anchor = icon.iconAnchor || [0, 0];
        if (this.opts.title) this.div.title = this.opts.title;
        this.z = 1000 + (this.opts.zIndexOffset || 0);
        if (this.opts.interactive === false) this.div.style.pointerEvents = 'none';
        else {
          this.div.style.cursor = 'pointer';
          this.div.addEventListener('click', (e) => { e.stopPropagation(); (this.handlers.click || []).forEach((f) => f(e)); });
          this.div.addEventListener('mouseenter', () => { this.div.style.zIndex = 5000; });
          this.div.addEventListener('mouseleave', () => { this.div.style.zIndex = this.z; });
        }
        this.div.style.zIndex = this.z;
      }
      onAdd() { (this.opts.interactive === false ? this.getPanes().overlayLayer : this.getPanes().overlayMouseTarget).appendChild(this.div); }
      draw() {
        const p = this.getProjection().fromLatLngToDivPixel(this.pos); if (!p) return;
        this.div.style.left = (p.x - this.anchor[0]) + 'px'; this.div.style.top = (p.y - this.anchor[1]) + 'px';
      }
      onRemove() { this.div.remove(); }
      on(type, f) { (this.handlers[type] = this.handlers[type] || []).push(f); return this; }
      getElement() { return this.div; }
      addTo(group) { group._add(this); return this; }
    }

    class Group {
      constructor() { this.items = []; this.map = null; }
      addTo(map) { this.map = map; this.items.forEach((x) => x.setMap(map._g)); return this; }
      _add(x) { this.items.push(x); if (this.map) x.setMap(this.map._g); }
      clearLayers() { this.items.forEach((x) => x.setMap(null)); this.items = []; }
    }

    // 점선 테두리 영역 (구글 다각형은 점선을 못 그려서, 칠하기 + 점선 선을 겹쳐요)
    class Area {
      constructor(pts, style) { this.pts = pts; this.style = style || {}; this.handlers = {}; this.parts = []; this.label = null; }
      setMap(gmap) {
        this.gmap = gmap;
        if (!gmap) { this.parts.forEach((p) => p.setMap(null)); if (this.label) this.label.setMap(null); return; }
        const path = this.pts.map(([lat, lng]) => ({ lat, lng }));
        const color = this.style.color || '#5055B1';
        const fill = new Polygon({ paths: path, strokeOpacity: 0, fillColor: this.style.fillColor || color, fillOpacity: this.style.fillOpacity ?? 0.1, clickable: !!this.handlers.click, zIndex: 1 });
        const dash = { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: color, strokeWeight: this.style.weight || 2, scale: 3 };
        const line = new Polyline({ path: [...path, path[0]], strokeOpacity: 0, icons: [{ icon: dash, offset: '0', repeat: '12px' }], clickable: false, zIndex: 2 });
        if (this.handlers.click) fill.addListener('click', () => this.handlers.click.forEach((f) => f()));
        this.parts = [fill, line]; this.parts.forEach((p) => p.setMap(gmap));
        this._label();
      }
      // 동네 이름표: 영역 한가운데에 늘 보여요 (지도에 올린 뒤에 이름을 붙여도 돼요)
      _label() {
        if (!this.tip || !this.gmap) return;
        if (this.label) this.label.setMap(null);
        const c = this.getBounds().getCenter(); const color = this.style.color || '#5055B1';
        this.label = new HtmlMarker([c.lat, c.lng], { interactive: false, zIndexOffset: -200, icon: { html: `<div class="area-label" style="--c:${color}">${this.tip}</div>`, iconAnchor: [0, 0] } });
        this.label.div.style.transform = 'translate(-50%, -50%)'; this.label.setMap(this.gmap);
      }
      bindTooltip(text) { this.tip = String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); this._label(); return this; }
      on(type, f) { (this.handlers[type] = this.handlers[type] || []).push(f); return this; }
      getBounds() { return L.latLngBounds(this.pts); }
      addTo(group) { group._add(this); return this; }
    }

    const toG = (b) => new LatLngBounds({ lat: b.getSouth(), lng: b.getWest() }, { lat: b.getNorth(), lng: b.getEast() });

    return {
      name: 'google',
      createMap(el) {
        const node = typeof el === 'string' ? document.getElementById(el) : el; // 구글 지도는 요소 자체가 필요해요
        const g = new Map(node, {
          center: { lat: 37.5665, lng: 126.978 }, zoom: 12, gestureHandling: 'greedy', clickableIcons: false,
          mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
          // 가게 아이콘은 숨겨서 우리 호텔 표시가 잘 보이게
          styles: [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }, { featureType: 'poi.lodging', stylers: [{ visibility: 'off' }] }],
        });
        let programmatic = false; const moveHandlers = [];
        const quiet = () => { programmatic = true; };
        event.addListener(g, 'idle', () => { if (programmatic) { programmatic = false; return; } moveHandlers.forEach((f) => f()); });
        const api = {
          _g: g,
          setView([lat, lng], zoom) { quiet(); g.moveCamera({ center: { lat, lng }, zoom }); return api; },
          fitBounds(b, opts = {}) {
            quiet(); const pad = (opts.padding && opts.padding[0]) ?? 40;
            g.fitBounds(toG(b), pad);
            if (opts.maxZoom) event.addListenerOnce(g, 'idle', () => { if (g.getZoom() > opts.maxZoom) { quiet(); g.setZoom(opts.maxZoom); } });
            return api;
          },
          panTo([lat, lng]) { quiet(); g.panTo({ lat, lng }); return api; },
          getZoom: () => g.getZoom(),
          getBounds() { const b = g.getBounds(); if (!b) return L.latLngBounds([]); const sw = b.getSouthWest(), ne = b.getNorthEast(); return L.latLngBounds([sw.lat(), sw.lng()], [ne.lat(), ne.lng()]); },
          distance: dist,
          on(type, f) { if (type === 'moveend') moveHandlers.push(f); return api; },
          invalidateSize() { event.trigger(g, 'resize'); },
          // 화면 이동이 끝날 때까지 기다리기 (범위·확대 수준을 읽기 전에)
          whenIdle: () => new Promise((ok) => { let done = false; const fin = () => { if (!done) { done = true; ok(); } }; event.addListenerOnce(g, 'idle', fin); setTimeout(fin, 1500); }),
        };
        return api;
      },
      layerGroup: () => new Group(),
      polygon: (pts, style) => new Area(pts, style),
      marker: (latlng, opts) => new HtmlMarker(latlng, opts),
      divIcon: (opts) => opts,
      distance: dist,
    };
  }

  function useLeaflet() { window.MapEngine = leafletEngine(); document.documentElement.dataset.map = 'osm'; return startApp(); }

  if (!wantGoogle) { useLeaflet(); return; }

  // 키가 틀렸거나 이 사이트에서 쓰도록 허용되지 않았으면 구글이 이 함수를 불러요 → 무료 지도로 다시 열어요
  window.gm_authFailure = () => {
    const u = new URL(location.href); u.searchParams.set('map', 'osm'); location.replace(u.href);
  };
  window.__travelGmReady = async () => {
    try {
      const maps = await google.maps.importLibrary('maps');
      const core = await google.maps.importLibrary('core');
      window.MapEngine = googleEngine({ ...maps, LatLngBounds: core.LatLngBounds, event: google.maps.event });
      document.documentElement.dataset.map = 'google';
      startApp();
    } catch (e) { useLeaflet(); }
  };
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://maps.googleapis.com/maps/api/js?' + new URLSearchParams({ key, v: 'weekly', language: 'ko', region: 'KR', loading: 'async', callback: '__travelGmReady' });
  s.onerror = () => useLeaflet(); // 구글 지도를 못 불러오면 무료 지도로
  document.body.appendChild(s);
})();
