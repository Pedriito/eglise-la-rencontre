'use client'

import { useEffect, useState, useTransition } from 'react'
import { savePushSubscription, deletePushSubscription, sendTestPush } from '../push-actions'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

type Status = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export function PushManager() {
  const [status, setStatus]   = useState<Status>('loading')
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [testSent, setTestSent] = useState(false)
  const [isPending, start]    = useTransition()

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied'); return
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) { setEndpoint(sub.endpoint); setStatus('subscribed') }
        else setStatus('unsubscribed')
      })
    }).catch(() => setStatus('unsupported'))
  }, [])

  async function subscribe() {
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
        })
        const json = sub.toJSON()
        await savePushSubscription({
          endpoint: json.endpoint!,
          p256dh:   (json.keys as Record<string, string>).p256dh,
          auth:     (json.keys as Record<string, string>).auth,
        })
        setEndpoint(json.endpoint!)
        setStatus('subscribed')
      } catch (e) {
        if (Notification.permission === 'denied') setStatus('denied')
        console.error('[push] subscribe error:', e)
      }
    })
  }

  async function unsubscribe() {
    start(async () => {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        if (endpoint) await deletePushSubscription(endpoint)
      }
      setEndpoint(null)
      setStatus('unsubscribed')
    })
  }

  async function test() {
    start(async () => {
      await sendTestPush()
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    })
  }

  if (status === 'loading')     return null
  if (status === 'unsupported') return null // Silencieux si non supporté

  return (
    <div className="flex items-center gap-3">
      {status === 'denied' && (
        <p className="font-sans text-xs text-dark/40">
          🔕 Notifications bloquées dans les réglages du navigateur
        </p>
      )}

      {status === 'unsubscribed' && (
        <button
          onClick={subscribe}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-teal/30 font-sans text-xs text-dark/60 hover:text-teal hover:border-teal/60 transition-colors disabled:opacity-40"
        >
          🔔 Activer les rappels
        </button>
      )}

      {status === 'subscribed' && (
        <>
          <span className="font-sans text-xs text-teal/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
            Rappels activés
          </span>
          <button
            onClick={test}
            disabled={isPending}
            className="font-sans text-[10px] text-dark/30 hover:text-dark/60 transition-colors disabled:opacity-40"
          >
            {testSent ? '✓ Envoyé !' : 'Tester'}
          </button>
          <button
            onClick={unsubscribe}
            disabled={isPending}
            className="font-sans text-[10px] text-dark/30 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            Désactiver
          </button>
        </>
      )}
    </div>
  )
}
