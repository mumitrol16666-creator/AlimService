// Копия для показа: сначала сеть, при её отсутствии — сохранённое на устройстве.
const C = 'alim-show-202609201842';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => clients.claim())));   // старые версии удаляются
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const fresh = r.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(new URL(r.url).pathname) || new URL(r.url).pathname.endsWith('/');
  e.respondWith(fetch(fresh ? new Request(r, { cache: 'reload' }) : r).then(res => { if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match(new URL(r.url).pathname.replace(/\/?$/, '/') + 'index.html'))));
});
