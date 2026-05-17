'use client'

import { useState } from 'react'
import { removeTeamMember, toggleMemberPosition } from './actions'
import { frequencyLabels } from '@/lib/labels'

type Position = { id: string; name: string }
type Member = {
  user_id: string
  role: string
  frequency: string | null
  profiles: { id: string; first_name: string; last_name: string } | null
}

export function MemberList({
  teamId,
  members,
  positions,
  memberPositions,
}: {
  teamId: string
  members: Member[]
  positions: Position[]
  memberPositions: Record<string, Set<string>>
}) {
  const [query, setQuery] = useState('')

  const filtered = members.filter(m => {
    const full = `${m.profiles?.first_name ?? ''} ${m.profiles?.last_name ?? ''}`.toLowerCase()
    return full.includes(query.toLowerCase())
  })

  return (
    <div className="space-y-3">
      {members.length > 5 && (
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un membre…"
          className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-white text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
        />
      )}

      <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden divide-y divide-teal/10">
        {filtered.length > 0 ? filtered.map(m => {
          const posIds = memberPositions[m.user_id] ?? new Set()
          return (
            <div key={m.user_id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-sans text-sm text-dark font-medium">
                      {m.profiles?.first_name} {m.profiles?.last_name}
                    </span>
                    {m.role === 'leader' && (
                      <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full font-sans">Responsable</span>
                    )}
                    {m.frequency && (
                      <span className="text-xs text-dark/40 font-sans">{frequencyLabels[m.frequency] ?? m.frequency}</span>
                    )}
                  </div>

                  {positions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {positions.map(pos => {
                        const hasPos = posIds.has(pos.id)
                        return (
                          <form key={pos.id} action={toggleMemberPosition}>
                            <input type="hidden" name="team_id" value={teamId} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <input type="hidden" name="position_id" value={pos.id} />
                            <input type="hidden" name="action" value={hasPos ? 'remove' : 'add'} />
                            <button type="submit"
                              className={`px-2.5 py-1 rounded-full text-xs font-sans transition-colors ${
                                hasPos ? 'bg-teal text-white hover:bg-teal-dark' : 'bg-teal/10 text-dark/50 hover:bg-teal/20'
                              }`}>
                              {pos.name}
                            </button>
                          </form>
                        )
                      })}
                    </div>
                  )}
                </div>

                <form action={removeTeamMember}>
                  <input type="hidden" name="team_id" value={teamId} />
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button type="submit" className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans">
                    Retirer
                  </button>
                </form>
              </div>
            </div>
          )
        }) : (
          <div className="px-6 py-8 text-center">
            <p className="font-sans text-sm text-dark/40">
              {query ? 'Aucun résultat.' : 'Aucun membre dans cette équipe.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
