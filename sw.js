
const CACHE_NAME = 'amar-khata-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/hindsiliguri/v12/ijwbG8S_X-P8p9e5-T7Yq-p76S9t.woff2'
];

// ইনস্টল হওয়ার সময় সব ফাইল ক্যাশ করা
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching all assets for offline use');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// পুরনো ক্যাশ ডিলিট করা
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

// অফলাইন রিকোয়েস্ট হ্যান্ডেল করা (Cache-First)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // যদি ক্যাশে ফাইল থাকে, তবে ইন্টারনেট চেক না করেই ক্যাশ থেকে দিবে
      if (cachedResponse) {
        return cachedResponse;
      }

      // ক্যাশে না থাকলে নেটওয়ার্ক থেকে আনবে এবং ভবিষ্যতে অফলাইনের জন্য সেভ করে রাখবে
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // যদি একদমই ইন্টারনেট না থাকে এবং ক্যাশেও না থাকে, তবে মেইন পেজ দিবে
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
