'use client'

import { useState } from 'react'
import { addAssignment } from '../actions'

const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'

type Profile = { id: string; first_name: string; last_name: string }
type Position = { id: string; name: string }

export function AddAssignmentForm({
  planId,
  teamId,
  teamPositions,
  teamProfiles,
  isInviteTeam,
  hidePositions,
}: {
  planId: string
  teamId: string
  teamPositions: Position[]
  teamProfiles: Profile[]
  isInviteTeam: boolean
  hidePositions: boolean
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const isExternal = selectedUserId === INVITE_EXT_ID

  return (
    <form action={addAssignment} className="space-y-2">
      <input type="hidden" name="plan_id" value={planId} />
      <input type="hidden" name="team_id" value={teamId} />

      <div className="flex gap-2 items-center">
        <select
          name="user_id"
          value={selectedUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-teal/30 bg-white text-dark font-sans text-xs focus:outline-none focus:ring-1 focus:ring-teal/40"
        >
          <option value="">— Bénévole —</option>
          {isInviteTeam && (
            <option value={INVITE_EXT_ID}>Invité (Ext)</option>
          )}
          {teamProfiles.map(p => (
            <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
          ))}
        </select>

        {!hidePositions && teamPositions.length === 1 && (
          <input type="hidden" name="position_id" value={teamPositions[0].id} />
        )}
        {!hidePositions && teamPositions.length > 1 && (
          <select
            name="position_id"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-teal/30 bg-white text-dark font-sans text-xs focus:outline-none focus:ring-1 focus:ring-teal/40"
          >
            <option value="">— Poste —</option>
            {teamPositions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.name}</option>
            ))}
          </select>
        )}

        <button
          type="submit"
          className="px-3 py-1.5 bg-teal text-white rounded-lg font-sans text-xs font-medium hover:bg-teal-dark transition-colors shrink-0"
        >
          +
        </button>
      </div>

      {/* Champs supplémentaires pour invité externe */}
      {isExternal && (
        <div className="space-y-1.5 pt-1">
          <input
            type="text"
            name="external_name"
            required
            placeholder="Prénom Nom de l'invité"
            className="w-full px-2 py-1.5 rounded-lg border border-teal/30 bg-white text-dark placeholder:text-dark/30 font-sans text-xs focus:outline-none focus:ring-1 focus:ring-teal/40"
          />
          <input
            type="email"
            name="external_email"
            placeholder="email@exemple.com (optionnel)"
            className="w-full px-2 py-1.5 rounded-lg border border-teal/30 bg-white text-dark placeholder:text-dark/30 font-sans text-xs focus:outline-none focus:ring-1 focus:ring-teal/40"
          />
        </div>
      )}
    </form>
  )
}
