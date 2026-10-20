// Linus Company service worker.
// 업무 데이터는 기기에 캐시하지 않아요: 캐시하는 파일은 오프라인 안내 페이지 하나뿐이에요.
// API 호출·GitHub/Gist 요청·Next 식 데이터 요청은 가로채지 않고 항상 네트워크로 보내요.
const OFFLINE_CACHE = 'linus-offline-v1';
const OFFLINE_URL = '/offline.html';

function previewText(value, limit) {
  return typeof value === 'string' ? Array.from(value.replace(/\s+/gu, ' ').trim()).slice(0, limit).join('') : '';
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    const payload = event.data?.json();
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) data = payload;
  } catch {}
  const room = typeof data.room === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data.room) ? data.room : null;
  const title = previewText(data.preview?.title, 80), body = previewText(data.preview?.body, 180);
  const preview = Boolean(title && body), test = data.test === true;
  event.waitUntil(self.registration.showNotification(test ? '푸시 알림 테스트' : preview ? title : '새 메시지', {
    body: test ? '푸시 알림이 정상적으로 연결되었습니다.' : preview ? body : '새 메시지가 도착했습니다.',
    icon: '/icon-192.png',
    tag: test ? 'linus-push-test' : `linus-chat-${room ?? 'new'}`,
    silent: data.silent === true,
    data: { url: room ? `/?chat=${encodeURIComponent(room)}` : '/?messenger=1' },
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
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // 페이지는 항상 네트워크로 불러오고, 인터넷이 끊겼을 때만 오프라인 안내를 보여줘요.
  event.respondWith(
    fetch(request).catch(async () => {
      const offline = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
      return offline || new Response('인터넷 연결이 없습니다.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }),
  );
});
