const CACHE_NAME = 'dairy-garden-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/products.html',
  '/product.html',
  '/cart.html',
  '/checkout.html',
  '/profile.html',
  '/index.css',
  '/utils.js',
  '/home.js',
  '/products-client.js',
  '/product.js',
  '/cart.js',
  '/checkout.js',
  '/auth.js',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Some assets failed to cache', err));
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Try network first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
