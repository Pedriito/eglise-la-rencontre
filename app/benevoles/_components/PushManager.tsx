'use client'

import { useEffect, useState } from 'react'
import { savePushSubscription, deletePushSubscription, sendTestPush } from '../push-actions'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

type Status = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

type Props = {
  variant?: 'toggle'
}

export function PushManager({ variant }: Props = {}) {
  const [status, setStatus]     = useState<Status>('loading')
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [testSent, setTestSent] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied'); return
    }
    // Affichage immédiat depuis le cache local
    if (localStorage.getItem('push_subscribed') === '1') {
      setStatus('subscribed')
    }
    // Vérification réelle en arrière-plan
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          localStorage.setItem('push_subscribed', '1')
          setEndpoint(sub.endpoint)
          setStatus('subscribed')
        } else {
          localStorage.removeItem('push_subscribed')
          setStatus(Notification.permission === 'granted' ? 'unsubscribed' : 'unsubscribed')
        }
      })
    }).catch(() => setStatus('unsupported'))
  }, [])

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
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
      })
      const json = sub.toJSON()
      await savePushSubscription({
        endpoint: json.endpoint!,
        p256dh:   (json.keys as Record<string, string>).p256dh,
        auth:     (json.keys as Record<string, string>).auth,
      })
      localStorage.setItem('push_subscribed', '1')
      setEndpoint(json.endpoint!)
      setStatus('subscribed')
    } catch (e) {
      if (Notification.permission === 'denied') setStatus('denied')
      console.error('[push] subscribe error:', e)
    } finally {
      setIsPending(false)
    }
  }

  async function unsubscribe() {
    setIsPending(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        if (endpoint) await deletePushSubscription(endpoint)
      }
      localStorage.removeItem('push_subscribed')
      setEndpoint(null)
      setStatus('unsubscribed')
    } finally {
      setIsPending(false)
    }
  }

  async function test() {
    setIsPending(true)
    try {
      await sendTestPush()
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    } finally {
      setIsPending(false)
    }
  }

  if (variant === 'toggle') {
    if (status === 'loading') {
      return <div className="w-11 h-6 rounded-full bg-dark/10 animate-pulse shrink-0" />
    }
    if (status === 'unsupported') {
      return <span className="font-sans text-[11px] text-dark/35 shrink-0 text-right leading-snug">Installer<br />l'app</span>
    }
    if (status === 'denied') {
      return <span className="font-sans text-[11px] text-dark/35 shrink-0">Bloquées</span>
    }
    const isOn = status === 'subscribed'
    return (
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <button
          onClick={isOn ? unsubscribe : subscribe}
          disabled={isPending}
          aria-label={isOn ? 'Désactiver les notifications' : 'Activer les notifications'}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${isOn ? 'bg-teal' : 'bg-dark/15'} ${isPending ? 'opacity-50' : ''}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
        {isOn && (
          <button
            onClick={test}
            disabled={isPending}
            className="font-sans text-[10px] text-teal border border-teal/30 px-2 py-0.5 rounded-full hover:bg-teal/5 transition-colors disabled:opacity-40"
          >
            {testSent ? '✓ Reçu !' : 'Tester'}
          </button>
        )}
      </div>
    )
  }

  if (status === 'loading')     return null
  if (status === 'unsupported') return null

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
