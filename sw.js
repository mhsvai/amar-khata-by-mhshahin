
const CACHE_NAME = 'amar-khata-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          // যদি নেটওয়ার্ক থেকে ফাইল পাওয়া যায়, সেটি ক্যাশে আপডেট করি (ভবিষ্যতের জন্য)
          if (response.ok || (response.type === 'opaque' && event.request.url.includes('esm.sh'))) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => {
          // নেট না থাকলে ক্যাশ থেকে দিবে, ক্যাশেও না থাকলে index.html দিবে
          return cached || caches.match('./index.html');
        });

      return cached || networked;
    })
  );
});
