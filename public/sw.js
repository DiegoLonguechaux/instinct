// Service worker de la caisse (/admin/merch/caisse) : permet d'ouvrir la page sans réseau.
// Il ne touche à rien d'autre : les appels API passent toujours par le réseau
// (la page gère elle-même sa copie locale et sa file de ventes).

const CACHE = 'caisse-v1';
const PAGE = '/admin/merch/caisse';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Fichiers JS/CSS/polices : leur nom contient un hash, donc ils ne changent jamais.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // La page de la caisse : réseau d'abord (version à jour), copie en secours hors-ligne.
  if (request.mode === 'navigate' && url.pathname === PAGE) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Une redirection (session expirée -> /login) ne doit jamais remplacer la copie.
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(PAGE, copy));
          }
          return response;
        })
        .catch(() => caches.match(PAGE).then((cached) => cached || Response.error()))
    );
  }
});
