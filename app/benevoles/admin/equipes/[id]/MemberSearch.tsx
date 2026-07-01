'use client'

import { useActionState, useState } from 'react'
import { addTeamMember } from './actions'
import { frequencyLabels } from '@/lib/labels'

type Profile = { id: string; first_name: string; last_name: string }

function AddMemberRow({ teamId, profile }: { teamId: string; profile: Profile }) {
  const [state, formAction, pending] = useActionState(addTeamMember, null)

  return (
    <form action={formAction} className="px-4 py-2.5 hover:bg-teal-50/40">
      <div className="flex items-center gap-3">
        <input type="hidden" name="team_id" value={teamId} />
        <input type="hidden" name="user_id" value={profile.id} />

        <span className="flex-1 font-sans text-sm text-dark">
          {profile.first_name} {profile.last_name}
        </span>

        <select name="role" className="px-2 py-1.5 rounded-lg border border-teal/30 bg-white text-dark font-sans text-xs focus:outline-none focus:ring-2 focus:ring-teal/40">
          <option value="member">Membre</option>
          <option value="leader">Responsable</option>
        </select>

        <select name="frequency" className="px-2 py-1.5 rounded-lg border border-teal/30 bg-white text-dark font-sans text-xs focus:outline-none focus:ring-2 focus:ring-teal/40">
          <option value="">—</option>
          {Object.entries(frequencyLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <button type="submit" disabled={pending} className="px-3 py-1.5 bg-teal text-white rounded-lg font-sans text-xs font-medium hover:bg-teal-dark transition-colors whitespace-nowrap disabled:opacity-50">
          {pending ? '…' : 'Ajouter'}
        </button>
      </div>
      {state?.error && (
        <p className="mt-1.5 font-sans text-xs text-red-500">{state.error}</p>
      )}
    </form>
  )
}

export function MemberSearch({ teamId, profiles }: { teamId: string; profiles: Profile[] }) {
  const [query, setQuery] = useState('')

  const filtered = profiles.filter(p => {
    const full = `${p.first_name} ${p.last_name}`.toLowerCase()
    return full.includes(query.toLowerCase())
  })

  return (
    <div className="bg-white rounded-2xl border border-teal/20 p-6 space-y-4">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher un bénévole…"
        className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
      />

      {query && filtered.length === 0 && (
        <p className="font-sans text-sm text-dark/40 text-center py-2">Aucun résultat.</p>
      )}

      {filtered.length > 0 && (
        <div className="divide-y divide-teal/10 rounded-xl border border-teal/20 overflow-hidden max-h-72 overflow-y-auto">
          {filtered.map(p => (
            <AddMemberRow key={p.id} teamId={teamId} profile={p} />
          ))}
        </div>
      )}
    </div>
  )
}
