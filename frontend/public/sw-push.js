// Push notification service worker handler
// Add this content to your public/sw-push.js file

self.addEventListener('push', function(event) {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch(e) { data = { title: 'Afrizone', body: event.data.text() }; }

  const options = {
    body:    data.body  || 'You have a new notification',
    icon:    data.icon  || '/icons/icon-192x192.png',
    badge:   data.badge || '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data:    { url: data.url || '/seller/orders' },
    actions: [
      { action: 'view',    title: '👀 View Order' },
      { action: 'dismiss', title: '✕ Dismiss'    },
    ],
    requireInteraction: true,
    tag: 'new-order',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Afrizone', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/seller/orders';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
