importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js'
  );

workbox.routing.registerRoute(
    ({ request }) => request.destination === 'style',
        new workbox.strategies.StaleWhileRevalidate({
            cacheName: 'css-cache',
    })
);


workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'js-cache',
    })
);

workbox.routing.registerRoute(
    ({ request }) => request.destination === 'document',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'html-cache',
    })
);

  // Optionally, you can use precaching to cache your app shell files during service worker installation.
workbox.precaching.precacheAndRoute([
    { url: '/index.html', revision: '1' },
    { url: '/styles.css', revision: '1' },
    { url: '/script.js', revision: '1' },
]);
