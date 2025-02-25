importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js'
  );
  
workbox.precaching.precacheAndRoute([
    { url: '/index.html', revision: '1' },
    { url: '/styles.css', revision: '1' },
    { url: '/script.js', revision: '1' },
]);

workbox.routing.registerRoute(
  ({ url, request }) => 
    ['style', 'script', 'document', 'image', 'font'].includes(request.destination) || url.pathname.endsWith('.json'),
  new workbox.strategies.CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, 
      }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ url, request }) => 
    !['document', 'script', 'style', 'image'].includes(request.destination) ||
    (url.pathname.endsWith('.json') || url.pathname === '/auth/status'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, 
      }),
    ],
    networkTimeoutSeconds: 3,
  })
);