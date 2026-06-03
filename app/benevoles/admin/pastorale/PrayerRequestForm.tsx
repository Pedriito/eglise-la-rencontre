'use client'

import { useState, useTransition } from 'react'
import { addPrayerRequest } from './actions'

type Profile = { id: string; first_name: string; last_name: string }

export function PrayerRequestForm({ profiles }: { profiles: Profile[] }) {
  const [open, setOpen]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [isPending, start]    = useTransition()
  const [useProfile, setUseProfile] = useState(true)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const res = await addPrayerRequest(fd)
      if (res.ok) { setOpen(false); (e.target as HTMLFormElement).reset() }
      else setError(res.error ?? 'Erreur')
    })
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="w-full py-2.5 rounded-xl border border-dashed border-teal/30 font-sans text-xs text-dark/40 hover:text-teal hover:border-teal/60 transition-colors"
    >
      + Ajouter un sujet de prière
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-teal/30 p-4 space-y-3">
      {/* Personne */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setUseProfile(true)}
          className={`text-xs font-sans px-3 py-1.5 rounded-lg transition-colors ${useProfile ? 'bg-teal text-white' : 'border border-teal/20 text-dark/50 hover:border-teal/40'}`}
        >Bénévole</button>
        <button type="button" onClick={() => setUseProfile(false)}
          className={`text-xs font-sans px-3 py-1.5 rounded-lg transition-colors ${!useProfile ? 'bg-teal text-white' : 'border border-teal/20 text-dark/50 hover:border-teal/40'}`}
        >Autre personne</button>
      </div>

      {useProfile ? (
        <select name="profile_id" className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark focus:outline-none focus:border-teal/40">
          <option value="">— Sélectionner —</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
      ) : (
        <input name="person_name" placeholder="Prénom Nom" required
          className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/40" />
      )}

      <input name="subject" placeholder="Sujet de prière *" required
        className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/40" />

      <textarea name="notes" placeholder="Détails (optionnel)" rows={2}
        className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/40 resize-none" />

      {error && <p className="font-sans text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={() => { setOpen(false); setError(null) }}
          className="flex-1 py-1.5 rounded-lg border border-teal/20 font-sans text-xs text-dark/60 hover:bg-teal/5">Annuler</button>
        <button type="submit" disabled={isPending}
          className="flex-1 py-1.5 rounded-lg bg-teal text-white font-sans text-xs font-medium hover:bg-teal/90 disabled:opacity-40">
          {isPending ? 'Ajout…' : '+ Ajouter'}
        </button>
      </div>
    </form>
  )
}
