// 앱 셸 캐시 (오프라인에서도 화면은 열리도록). 파일을 바꾸면 VERSION 을 올리세요.
const VERSION = 'v3';
const CACHE = 'eodiseobwa-' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/config.js', 'js/nickname.js', 'js/pixel.js', 'js/sound.js',
  'js/backend/index.js', 'js/backend/errors.js', 'js/backend/mock.js', 'js/backend/supabase.js',
  'fonts/Galmuri11.woff2', 'fonts/Galmuri11-Bold.woff2',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 같은 출처 정적 파일만: 네트워크 우선, 실패 시 캐시 (배포 즉시 반영 + 오프라인 대비)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
