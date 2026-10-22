'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { movePlan } from './actions'
import { parisDay } from '@/lib/availability'

type Props = {
  planId: string
  serviceDate: string
  /** Classes CSS du bouton (état affiché) */
  className?: string
  /** Classes CSS du <input type="time"> (état édition) */
  inputClassName?: string
  /** Empêche la propagation du clic vers un éventuel <Link> parent */
  stopPropagation?: boolean
}

export function PlanTimeEditor({ planId, serviceDate, className, inputClassName, stopPropagation }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const d = new Date(serviceDate)
  // Heure et jour lus EN HEURE DE PARIS, jamais dans le fuseau de la machine : le serveur (UTC) et le
  // navigateur doivent produire le même texte, sinon l'hydratation échoue (erreur React #418) et les
  // rafraîchissements de la page deviennent peu fiables.
  const currentTime = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  const currentTimeInput = currentTime

  // Jour calendaire de Paris en YYYY-MM-DD (évite un décalage UTC si le service est tôt le matin)
  const localDate = parisDay(serviceDate)

  function save() {
    const val = inputRef.current?.value
    setIsEditing(false)
    if (!val || val === currentTimeInput) return
    const newServiceDate = `${localDate}T${val}`
    startTransition(async () => {
      await movePlan(planId, newServiceDate)
      router.refresh()
    })
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="time"
        defaultValue={currentTimeInput}
        autoFocus
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); inputRef.current?.blur() }
          if (e.key === 'Escape') { setIsEditing(false) }
        }}
        onClick={e => stopPropagation && e.stopPropagation()}
        className={inputClassName ?? 'font-sans text-xs border border-teal/40 rounded px-1.5 py-0.5 bg-transparent text-current focus:outline-none focus:border-teal'}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={e => {
        if (stopPropagation) e.stopPropagation()
        setIsEditing(true)
      }}
      title="Modifier l'heure"
      disabled={isPending}
      className={className ?? 'font-sans text-xs tabular-nums transition-colors cursor-pointer hover:underline decoration-dotted text-dark/50 hover:text-teal'}
    >
      {isPending ? '…' : currentTime}
    </button>
  )
}
