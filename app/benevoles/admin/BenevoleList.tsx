'use client'

import { useState } from 'react'
import Link from 'next/link'
import { deleteBenevole } from './actions'
import { permissionLabels, statusLabels } from '@/lib/labels'

type Benevole = {
  id: string
  first_name: string
  last_name: string
  permission: string
  status: string
}

export function BenevoleList({ benevoles }: { benevoles: Benevole[] }) {
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = benevoles.filter(b => {
    const full = `${b.first_name} ${b.last_name}`.toLowerCase()
    return full.includes(query.toLowerCase())
  })

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher un bénévole…"
        className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-white text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
      />

      <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-teal/10">
              <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Nom</th>
              <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Accès</th>
              <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Statut</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((b, i) => {
              const st = statusLabels[b.status] ?? statusLabels.inactive
              return (
                <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-teal-50/40'}>
                  <td className="px-6 py-4 font-sans text-sm text-dark font-medium">
                    <Link
                      href={`/benevoles/admin/benevoles/${b.id}`}
                      className="hover:text-teal transition-colors"
                    >
                      {b.first_name} {b.last_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-sans text-xs text-dark/60">
                    {permissionLabels[b.permission] ?? b.permission}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-sans font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {confirmId === b.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-dark/50 font-sans">Confirmer ?</span>
                        <form action={deleteBenevole}>
                          <input type="hidden" name="user_id" value={b.id} />
                          <button type="submit" className="text-xs text-red-500 hover:text-red-600 font-sans font-medium">
                            Oui, supprimer
                          </button>
                        </form>
                        <button onClick={() => setConfirmId(null)} className="text-xs text-dark/40 hover:text-dark font-sans">
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(b.id)}
                        className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center font-sans text-sm text-dark/40">
                  Aucun résultat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
