'use client'

import { useState } from 'react'
import { IconCalendar } from '@/app/benevoles/_components/Icons'

export function ICalCopySection({ icalUrl }: { icalUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(icalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback: select the text
    }
  }

  return (
    <div className="flex items-center gap-2 text-dark/40">
      <IconCalendar className="w-3.5 h-3.5 shrink-0" />
      <span className="font-sans text-xs">Abonnement calendrier :</span>
      <a href={icalUrl} className="font-mono text-xs hover:text-teal transition-colors truncate max-w-xs">{icalUrl}</a>
      <button
        onClick={handleCopy}
        className="font-sans text-xs text-teal/70 hover:text-teal transition-colors shrink-0"
        title="Copier le lien iCal"
      >
        {copied ? '✓ Copié' : 'Copier'}
      </button>
    </div>
  )
}
