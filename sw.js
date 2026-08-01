const CACHE = 'vet-surveillance-v2';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

// Stratégie : pour la page HTML (le coeur de l'app), on essaie TOUJOURS le réseau
// en premier, pour ne jamais servir une version périmée en cache. On ne retombe
// sur le cache que si le réseau est indisponible (mode hors-ligne réel).
self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;

  const isHTML = e.request.mode === 'navigate' ||
                 (e.request.headers.get('accept') || '').includes('text/html');

  if(isHTML){
    e.respondWith(
      fetch(e.request).then(res=>{
        const resClone = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, resClone));
        return res;
      }).catch(()=> caches.match(e.request))
    );
    return;
  }

  // Pour le reste (manifest, icônes) : cache d'abord, réseau en secours.
  e.respondWith(
    caches.match(e.request).then(cached=>{
      return cached || fetch(e.request).then(res=>{
        const resClone = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, resClone));
        return res;
      }).catch(()=>cached);
    })
  );
});
