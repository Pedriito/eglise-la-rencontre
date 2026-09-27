'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // En dev, les chunks Turbopack recompilés peuvent garder la même URL — le cache-first
    // du SW sur /_next/static/ (voir public/sw.js) servirait alors indéfiniment une version
    // figée du code, masquant les modifications. On ne l'enregistre qu'en production.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err =>
        console.error('[SW] Erreur enregistrement:', err)
      )
    }
  }, [])
  return null
}
