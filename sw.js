// Houessè Service Worker — PWA Cache v9
const CACHE_NAME = 'houesse-v9';
const STATIC_ASSETS = [
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('[SW] Cache partiel:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
    .then(() => self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
    }))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isAPI = ['anthropic.com','groq.com','openrouter.ai','openai.com',
    'mistral.ai','supabase.co','puter.com','elevenlabs.io'
  ].some(h => url.hostname.includes(h));
  if (isAPI) return;

  const isHTML = (
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/Houesse') ||
    url.pathname.endsWith('index.html')
  );

  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match(event.request) || caches.match('index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') return caches.match('index.html');
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'getVersion') event.source.postMessage({ type: 'SW_VERSION', version: CACHE_NAME });
});
