/* Lovel House · avisos de tus personajes (WP-12). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Lovel House', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Lovel House', {
      body: data.body || '',
      tag: data.tag,
      icon: '/favicon.ico',
      data: { url: data.url || '/', offUrl: data.offUrl },
      actions: data.offUrl ? [{ action: 'off', title: data.offLabel || 'Que no me escriba' }] : [],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  const { url, offUrl } = event.notification.data || {};
  event.notification.close();
  if (event.action === 'off' && offUrl) {
    event.waitUntil(fetch(offUrl, { method: 'POST' }).catch(() => undefined));
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
