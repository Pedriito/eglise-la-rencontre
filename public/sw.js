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

const STATIC_CACHE = 'static-v1'
const OFFLINE_URL  = '/offline.html'

// Pré-cache la page offline + l'icône à l'installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([OFFLINE_URL, '/icons/icon-192.png'])
    )
  )
  self.skipWaiting()
})

// Activation immédiate (pas d'attente de fermeture des anciens onglets)
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Cache-first pour les assets Next.js immutables et les icônes PWA
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // Network-first pour les pages (navigation) → offline.html si pas de réseau
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(r => r ?? Response.error())
      )
    )
  }
})
