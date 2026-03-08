// Houessè Service Worker — PWA Cache v1.0
const CACHE_NAME = 'houesse-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://js.puter.com/v2/'
];

// Installation — mise en cache des ressources statiques
self.addEventListener('install', event => {
  console.log('[SW Houessè] Installation…');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        'index.html',
        'manifest.json'
      ]).catch(err => console.warn('[SW] Cache partiel:', err));
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('[SW Houessè] Activation…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Stratégie : Network-first pour les API, Cache-first pour les ressources statiques
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les appels API (IA, Supabase, Puter)
  if (
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('groq.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('bigmodel.cn') ||
    url.hostname.includes('z.ai') ||
    url.hostname.includes('openrouter.ai') ||
    url.hostname.includes('openai.com') ||
    url.hostname.includes('mistral.ai') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('puter.com')
  ) {
    return; // laisser passer sans cache
  }

  // Stratégie Cache-First pour ressources statiques
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources statiques
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback hors ligne : retourner index.html
        if (event.request.destination === 'document') {
          return caches.match('index.html');
        }
      });
    })
  );
});

// Message de l'app
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
