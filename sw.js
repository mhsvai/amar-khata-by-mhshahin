
const CACHE_NAME = 'amar-khata-ultimate-v1';

// অ্যাপের মূল ফাইলগুলো যা অফলাইনে চলার জন্য অত্যাবশ্যক
const CORE_ASSETS = [
  './',
  'index.html',
  'index.tsx',
  'manifest.json',
  'logo.png',
  'https://cdn.tailwindcss.com'
];

// সার্ভিস ওয়ার্কার ইনস্টল হওয়ার সময় কোর ফাইলগুলো ক্যাশ করা
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching core assets...');
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// পুরনো ক্যাশ পরিষ্কার করা
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

// সব রিকোয়েস্ট ইন্টারসেপ্ট করা
self.addEventListener('fetch', (event) => {
  // শুধুমাত্র GET রিকোয়েস্ট হ্যান্ডেল করা হবে
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // যদি ক্যাশে ফাইল থাকে, তবে সাথে সাথে সেটি রিটার্ন করবে
      if (cachedResponse) {
        return cachedResponse;
      }

      // ক্যাশে না থাকলে নেটওয়ার্ক থেকে আনবে এবং ভবিষ্যতে অফলাইনের জন্য সেভ করবে (Dynamic Caching)
      return fetch(event.request).then((networkResponse) => {
        // যদি রেসপন্স ঠিক থাকে তবে ক্যাশ করবে
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // যদি নেটওয়ার্ক না থাকে এবং রিকোয়েস্টটি একটি পেজ ন্যাভিগেশন হয় (যেমন রিফ্রেশ)
        if (event.request.mode === 'navigate') {
          return caches.match('index.html') || caches.match('./');
        }
        return null;
      });
    })
  );
});
