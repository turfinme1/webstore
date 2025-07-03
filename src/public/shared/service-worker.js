importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js'
  );

let currentActiveMessage = {};
self.addEventListener('push', async (event) => {
  const payload = event.data.json() || {};

  event.waitUntil((async () => {
     self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      image: payload.image,
      actions: payload.actions,
      data: {
        id: payload.id || null,
      },
      tag: payload.id,
    });

    await changeNotificationStatus(payload.id, 'delivered');
  })());
});

// self.addEventListener('notificationshow', (event) => {
//   const notification = event.notification;
//   const notificationId = notification.data?.id;
  
//   if (notificationId) {
//     event.waitUntil(
//       markNotificationAsShown(notificationId)
//     );
//   }
// });

self.addEventListener("notificationclick", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const notification = event.notification;
        const notificationId = notification.data?.id;
        currentActiveMessage.id = notificationId;
        const actionData = event.action.split('$__$');
        if (actionData[0] === 'redirect') {
          await changeNotificationStatus(notificationId, 'clicked');
          const url = actionData[1] || '/';
          if (url) {
            const client = await self.clients.openWindow(url);
          }
        } else {
          await changeNotificationStatus(notificationId, 'opened');
        }
      } catch (error) {
        console.error("Error processing notification click:", error);
      }
    })());
});

self.addEventListener('notificationclose', (event) => {
  event.waitUntil((async () => {
    const notification = event.notification;
    const notificationId = notification.data?.id;

    if (notificationId && notificationId !== currentActiveMessage.id) {
      try {
        await changeNotificationStatus(notificationId, 'dismissed');
      } catch (error) {
        console.error('Error changing notification status on close:', error);
      }
    }
  })());
});

async function changeNotificationStatus(notificationId, status) {
  try {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
  } catch (error) {
    console.error('Error changing notification status:', error);
  }
}

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