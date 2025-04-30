importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js'
  );

self.addEventListener('push', async (event) => {
  const payload = event.data.json() || {};
  const title   = payload.title  || 'New Notification';
  const options = {
    body : payload.body || 'You have a new notification',
    data: {
      id: payload.id || null,
    },
    tag: payload.id,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationshow', (event) => {
  const notification = event.notification;
  const notificationId = notification.data?.id;
  
  if (notificationId) {
    event.waitUntil(
      markNotificationAsShown(notificationId)
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const notification = event.notification;
        const notificationId = notification.data?.id;
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Error processing notification click:", error);
      }
    })()
  );
});

async function markNotificationAsShown(notificationId) {
  if (!notificationId) return;
  
  try {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      // credentials: 'same-origin' 
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error marking notification as shown:', error);
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