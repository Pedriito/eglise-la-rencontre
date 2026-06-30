'use client'

import { useEffect, useState } from 'react'
import { savePushSubscription } from '../push-actions'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

type Status = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export function PushPromptCard() {
  const [status, setStatus]       = useState<Status>('loading')
  const [dismissed, setDismissed] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied'); return
    }
    if (localStorage.getItem('push_subscribed') === '1') {
      setStatus('subscribed'); return
    }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub) localStorage.setItem('push_subscribed', '1')
        setStatus(sub ? 'subscribed' : 'unsubscribed')
      })
      .catch(() => setStatus('unsupported'))
  }, [])

  if (dismissed || status === 'loading' || status === 'subscribed' || status === 'denied') return null

  if (status === 'unsupported') {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-semibold text-dark">Reçois tes rappels</p>
          <p className="font-sans text-xs text-dark/40 mt-0.5 leading-snug">
            Ajoute l&rsquo;app à ton écran d&rsquo;accueil pour activer les notifications.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-6 h-6 flex items-center justify-center text-dark/25 hover:text-dark/50 transition-colors -mr-1"
          aria-label="Fermer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  async function subscribe() {
    setIsPending(true)
    try {
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setStatus('denied')
          return
        }
      }
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as ArrayBuffer,
      })
      const json = sub.toJSON()
      await savePushSubscription({
        endpoint: json.endpoint!,
        p256dh:   (json.keys as Record<string, string>).p256dh,
        auth:     (json.keys as Record<string, string>).auth,
      })
      localStorage.setItem('push_subscribed', '1')
      setStatus('subscribed')
    } catch {
      if (Notification.permission === 'denied') setStatus('denied')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-semibold text-dark">Activer les rappels</p>
        <p className="font-sans text-xs text-dark/40 mt-0.5 leading-snug">Reçois tes convocations directement ici.</p>
      </div>
      <button
        onClick={subscribe}
        disabled={isPending}
        className="shrink-0 px-3.5 py-2 rounded-xl text-white font-sans text-xs font-semibold transition-opacity disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #5A9EA6, #3D7D85)' }}
      >
        {isPending ? '…' : 'Activer'}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 w-6 h-6 flex items-center justify-center text-dark/25 hover:text-dark/50 transition-colors -mr-1"
        aria-label="Fermer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
