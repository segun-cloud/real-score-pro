const isDev = self.location.hostname === 'localhost';

function log(...args) {
  if (isDev) console.log('[SW]', ...args);
}

// ─── Push Notification ───────────────────────────────────────────────────────

self.addEventListener('push', function (event) {
  log('Push event received:', event);

  let data = { title: 'Goal!', body: 'A goal was scored!', icon: '/favicon.ico' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    // vibrate is silently ignored on unsupported devices — this is expected
    vibrate: [200, 100, 200],
    tag: data.tag || 'goal-notification',
    renotify: true,
    data: {
      matchId: data.matchId,
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      // Show a badge dot on the app icon (supported browsers only)
      if (navigator.setAppBadge) {
        navigator.setAppBadge().catch(() => {});
      }
    })
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', function (event) {
  log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  // Clear the badge dot when user interacts
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge().catch(() => {});
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // If a matching window is already open, navigate it to the target URL and focus it
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // No existing window — open a new one at the target URL
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', function (event) {
  log('Service Worker installed');
  // Take control immediately without waiting for old SW to be released
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  log('Service Worker activated');
  // Claim all open clients so this SW controls them right away
  event.waitUntil(clients.claim());
});
