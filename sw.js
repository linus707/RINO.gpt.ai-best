// Linus Company service worker.
// 업무 앱(index.html)·메신저·장부 같은 업무 데이터는 기기에 캐시하지 않아요.
// 캐시하는 것은 ① 오프라인 안내 페이지, ② 인터넷 없이 쓰는 매장 POS의 정적 파일(화면 pos.html, 공개 가격표 json, 아이콘)과 글꼴뿐이에요.
// API 호출·GitHub/Gist 요청은 가로채지 않고 항상 네트워크로 보내요.
const OFFLINE_CACHE = 'linus-offline-v2';
const OFFLINE_URL = '/offline.html';
const POS_CACHE = 'linus-pos-v1';
const FONT_CACHE = 'linus-pos-fonts-v1';
const POS_FILES = ['pos.html', 'prices.json', 'store-prices.json', 'pos.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const posUrl = (f) => new URL(f, self.registration.scope).href;
const POS_PATHS = new Set(POS_FILES.map((f) => new URL(f, self.registration.scope).pathname));
async function precachePos() { // 하나가 실패해도 나머지는 담아요
  const cache = await caches.open(POS_CACHE);
  const out = {};
  await Promise.all(POS_FILES.map(async (f) => {
    try { await cache.add(new Request(posUrl(f), { cache: 'reload' })); out[f] = true; } catch { out[f] = false; }
  }));
  return out;
}
async function networkFirst(request, cacheName, ms) { // 인터넷이 되면 최신, 안 되거나 느리면 저장해 둔 것
  const cache = await caches.open(cacheName);
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(request, { signal: ctrl.signal, cache: 'no-cache' });
    clearTimeout(t);
    if (res && res.ok) cache.put(request.url.split('#')[0].replace(/\?.*$/, ''), res.clone()).catch(() => {});
    return res;
  } catch {
    clearTimeout(t);
    const hit = await cache.match(request.url.replace(/\?.*$/, ''));
    if (hit) return hit;
    throw new Error('offline');
  }
}

function previewText(value, limit) {
  return typeof value === 'string' ? Array.from(value.replace(/\s+/gu, ' ').trim()).slice(0, limit).join('') : '';
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    const payload = event.data?.json();
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) data = payload;
  } catch {}
  const room = typeof data.room === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(data.room) ? data.room : null;
  const title = previewText(data.preview?.title, 80), body = previewText(data.preview?.body, 180);
  const preview = Boolean(title && body), test = data.test === true;
  const due = data.kind === 'due';
  event.waitUntil(self.registration.showNotification(test ? '푸시 알림 테스트' : preview ? title : due ? '미수금 알림' : '새 메시지', {
    body: test ? '푸시 알림이 정상적으로 연결되었습니다.' : preview ? body : '새 메시지가 도착했습니다.',
    icon: '/icon-192.png',
    tag: test ? 'linus-push-test' : due ? 'linus-due' : `linus-chat-${room ?? 'new'}`,
    silent: data.silent === true,
    data: { url: due ? '/?ledger=pay' : room ? `/?messenger=1&room=${encodeURIComponent(room)}` : '/?messenger=1' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/?messenger=1', self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      const navigated = await existing.navigate(target.href);
      if (navigated) return navigated.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => precachePos())
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![OFFLINE_CACHE, POS_CACHE, FONT_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => { // 화면에서 「오프라인용 다시 받기」를 누르면 POS 파일을 새로 담아요
  if (event.data && event.data.type === 'pos-precache') event.waitUntil(precachePos().then((r) => event.source && event.source.postMessage({ type: 'pos-precache-done', result: r })));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // 글꼴(jsDelivr): 저장해 둔 것을 먼저 쓰고 뒤에서 새로 받아요
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE);
      const hit = await cache.match(request);
      const net = fetch(request).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone()).catch(() => {}); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;

  // 매장 POS 정적 파일: 인터넷이 되면 최신, 안 되면 저장본(인터넷 없이도 열려요)
  if (POS_PATHS.has(url.pathname)) {
    event.respondWith(networkFirst(request, POS_CACHE, request.mode === 'navigate' ? 3500 : 6000).catch(async () => {
      const offline = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
      return request.mode === 'navigate' && offline ? offline : new Response('', { status: 503 });
    }));
    return;
  }

  if (request.mode !== 'navigate') return;
  // 그 밖의 페이지는 항상 네트워크로 불러오고, 인터넷이 끊겼을 때만 오프라인 안내를 보여줘요.
  event.respondWith(
    fetch(request).catch(async () => {
      const offline = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
      return offline || new Response('인터넷 연결이 없습니다.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }),
  );
});
