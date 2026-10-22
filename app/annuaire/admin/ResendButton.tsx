'use client'

import { useState } from 'react'
import { resendApprovalEmail } from '../actions'

export function ResendButton({ id }: { id: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleClick() {
    setStatus('sending')
    try {
      const fd = new FormData()
      fd.set('id', id)
      await resendApprovalEmail(fd)
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'sending'}
      className={`px-3 py-2 rounded-xl font-sans text-xs font-medium transition-colors ${
        status === 'sent'
          ? 'bg-teal/10 text-teal'
          : status === 'error'
          ? 'bg-red-50 text-red-400'
          : 'border border-dark/15 text-dark/50 hover:text-dark hover:border-dark/30 disabled:opacity-50'
      }`}
    >
      {status === 'sending' ? 'Envoi…'
        : status === 'sent'  ? '✓ Email envoyé'
        : status === 'error' ? 'Erreur'
        : '✉ Renvoyer l\'email'}
    </button>
  )
}
