// Houessè Service Worker — PWA Cache v8
// Network-First pour index.html → mise à jour immédiate à chaque déploiement
// Cache-First pour ressources statiques (fonts, icons)

const CACHE_NAME = 'houesse-v8';
const STATIC_ASSETS = [
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap'
];

// ══ INSTALLATION ══
self.addEventListener('install', event => {
  console.log('[SW Houesse v8] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Cache partiel:', err);
      });
    })
  );
  self.skipWaiting();
});

// ══ ACTIVATION — suppression des anciens caches ══
self.addEventListener('activate', event => {
  console.log('[SW Houesse v8] Activation...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Suppression ancien cache:', key);
          return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
    .then(() => {
      // Notifier tous les onglets ouverts
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// ══ FETCH ══
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne jamais intercepter les appels API
  const isAPI = [
    'anthropic.com','groq.com','openrouter.ai','openai.com',
    'mistral.ai','supabase.co','puter.com','elevenlabs.io'
  ].some(h => url.hostname.includes(h));
  if (isAPI) return;

  // Network-First pour index.html
  const isHTML = (
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/Houesse') ||
    url.pathname.endsWith('index.html')
  );

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] Hors ligne - cache pour:', url.pathname);
          return caches.match(event.request) || caches.match('index.html');
        })
    );
    return;
  }

  // Cache-First pour les ressources statiques
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('index.html');
        }
      });
    })
  );
});

// ══ MESSAGES ══
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'getVersion') {
    event.source.postMessage({ type: 'SW_VERSION', version: CACHE_NAME });
  }
});
