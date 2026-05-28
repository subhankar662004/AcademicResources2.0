/* ═══════════════════════════════════════════════
   AcadHub Service Worker — Web Push Handler
   ═══════════════════════════════════════════════ */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

/* ── Push received ── */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      const text = event.data.text();
      data = JSON.parse(text);
    }
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'New notification' };
  }

  const title = data.title || 'Academic Resources Hub';
  const options = {
    body: data.body || data.message || 'You have a new notification',
    icon: '/academic-hub.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'acadhub-push',
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open',  title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      return clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then((tabs) => {
      tabs.forEach((tab) =>
        tab.postMessage({
          type: 'PUSH_NOTIFICATION',
          payload: {
            title,
            body: options.body,
            url: options.data.url,
            timestamp: Date.now(),
          },
        })
      );
    })
  );
});

/* ── Notification clicked ── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const rawUrl = event.notification.data?.url || '/';
  // App uses HashRouter — internal paths must be /#/path
  // Convert plain paths like /teacher/tests → /#/teacher/tests
  // Leave already-hash or absolute URLs untouched
  const hashUrl =
    rawUrl.startsWith('http') || rawUrl.startsWith('/#')
      ? rawUrl
      : rawUrl === '/'
        ? self.location.origin + '/#/'
        : self.location.origin + '/#' + rawUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const existing = tabs.find((t) => t.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate ? existing.navigate(hashUrl) : null;
      }
      return clients.openWindow(hashUrl);
    })
  );
});
