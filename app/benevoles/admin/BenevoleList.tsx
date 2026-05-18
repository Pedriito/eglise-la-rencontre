'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { deleteBenevole, resendInviteFromList } from './actions'
import { permissionLabels, statusLabels } from '@/lib/labels'

type Benevole = {
  id: string
  first_name: string
  last_name: string
  permission: string
  status: string
}

function ResendButton({ benevoleId, onSuccess }: { benevoleId: string; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    const fd = new FormData()
    fd.set('user_id', benevoleId)
    startTransition(async () => {
      const result = await resendInviteFromList(null, fd)
      if (result.ok) {
        onSuccess()
      } else {
        setError(result.error ?? 'Erreur')
        setTimeout(() => setError(null), 4000)
      }
    })
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={pending}
        title="Renvoyer l'invitation"
        className="text-2xl text-teal/50 hover:text-teal transition-colors leading-none cursor-pointer disabled:opacity-40"
      >
        {pending ? '…' : '✉'}
      </button>
      {error && (
        <div className="absolute right-0 top-8 z-10 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-sans whitespace-nowrap shadow">
          {error}
        </div>
      )}
    </div>
  )
}

export function BenevoleList({ benevoles }: { benevoles: Benevole[] }) {
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = benevoles.filter(b => {
    const full = `${b.first_name} ${b.last_name}`.toLowerCase()
    return full.includes(query.toLowerCase())
  })

  return (
    <div className="space-y-3">
      {toast && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 font-sans text-sm text-green-700 flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-green-400 hover:text-green-600 ml-4 text-lg leading-none cursor-pointer">×</button>
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher un bénévole…"
        className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-white text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
      />

      {/* ── Table desktop ── */}
      <div className="hidden md:block bg-white rounded-2xl border border-teal/20 overflow-hidden">
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
                    <Link href={`/benevoles/admin/benevoles/${b.id}`} className="hover:text-teal transition-colors">
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
                          <button type="submit" className="text-xs text-red-500 hover:text-red-600 font-sans font-medium cursor-pointer">
                            Oui, supprimer
                          </button>
                        </form>
                        <button onClick={() => setConfirmId(null)} className="text-xs text-dark/40 hover:text-dark font-sans cursor-pointer">
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-4">
                        {b.status === 'invited' && (
                          <ResendButton
                            benevoleId={b.id}
                            onSuccess={() => setToast(`Invitation renvoyée à ${b.first_name} ${b.last_name}.`)}
                          />
                        )}
                        <button
                          onClick={() => setConfirmId(b.id)}
                          className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
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

      {/* ── Cards mobile ── */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-teal/20 px-5 py-8 text-center font-sans text-sm text-dark/40">
            Aucun résultat.
          </div>
        ) : filtered.map(b => {
          const st = statusLabels[b.status] ?? statusLabels.inactive
          return (
            <div key={b.id} className="bg-white rounded-2xl border border-teal/20 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/benevoles/admin/benevoles/${b.id}`} className="font-sans text-sm text-dark font-medium hover:text-teal transition-colors">
                    {b.first_name} {b.last_name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="font-sans text-xs text-dark/50">
                      {permissionLabels[b.permission] ?? b.permission}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-sans font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {b.status === 'invited' && (
                    <ResendButton
                      benevoleId={b.id}
                      onSuccess={() => setToast(`Invitation renvoyée à ${b.first_name} ${b.last_name}.`)}
                    />
                  )}
                  {confirmId === b.id ? (
                    <div className="flex flex-col items-end gap-1">
                      <form action={deleteBenevole}>
                        <input type="hidden" name="user_id" value={b.id} />
                        <button type="submit" className="text-xs text-red-500 hover:text-red-600 font-sans font-medium cursor-pointer">
                          Supprimer
                        </button>
                      </form>
                      <button onClick={() => setConfirmId(null)} className="text-xs text-dark/40 hover:text-dark font-sans cursor-pointer">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(b.id)}
                      className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
