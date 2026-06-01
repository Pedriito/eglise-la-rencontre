// Service Worker — Notifications push Église La Rencontre

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data
  try { data = event.data.json() } catch { data = { title: 'Église La Rencontre', body: event.data.text() } }

  const options = {
    body:    data.body   ?? '',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    data:    { url: data.url ?? '/benevoles/dashboard' },
    vibrate: [200, 100, 200],
    tag:     data.tag ?? 'default',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Église La Rencontre', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/benevoles/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) { client.focus(); return }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// Activation immédiate (pas d'attente de fermeture des anciens onglets)
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
