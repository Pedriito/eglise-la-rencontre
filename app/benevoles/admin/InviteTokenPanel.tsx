'use client'

import { useState, useTransition } from 'react'
import { createInviteToken, revokeInviteToken, type InviteToken } from './invite-token-actions'

type Props = { initial: InviteToken[] }

const EXPIRY_OPTIONS = [
  { label: '7 jours',   value: 7 },
  { label: '30 jours',  value: 30 },
  { label: '3 mois',    value: 90 },
  { label: 'Sans limite', value: 0 },
]

function shareUrl(token: string) {
  if (typeof window !== 'undefined') return `${window.location.origin}/benevoles/rejoindre/${token}`
  return `https://www.egliselarencontre.fr/benevoles/rejoindre/${token}`
}

function isExpired(t: InviteToken) {
  return !!t.revoked_at || (!!t.expires_at && new Date(t.expires_at) < new Date())
}

function isMaxed(t: InviteToken) {
  return !!t.max_uses && t.uses_count >= t.max_uses
}

export default function InviteTokenPanel({ initial }: Props) {
  const [tokens, setTokens]     = useState<InviteToken[]>(initial)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function copyLink(token: InviteToken) {
    navigator.clipboard.writeText(shareUrl(token.token)).then(() => {
      setCopiedId(token.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createInviteToken(fd)
      if (res.ok) {
        // Recharge les tokens depuis le serveur via un refresh de page partiel
        window.location.reload()
      }
    })
  }

  function handleRevoke(tokenId: string) {
    if (!confirm('Désactiver ce lien ? Les personnes ayant déjà le lien ne pourront plus s\'inscrire.')) return
    startTransition(async () => {
      await revokeInviteToken(tokenId)
      setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, revoked_at: new Date().toISOString() } : t))
    })
  }

  const active  = tokens.filter(t => !isExpired(t) && !isMaxed(t))
  const expired = tokens.filter(t => isExpired(t) || isMaxed(t))

  return (
    <div className="space-y-4">
      {/* Tokens actifs */}
      {active.length === 0 && !creating && (
        <p className="font-sans text-xs text-dark/30 italic">Aucun lien actif.</p>
      )}

      {active.map(t => (
        <div key={t.id} className="bg-white rounded-xl border border-teal/20 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {t.label && (
                <p className="font-sans text-xs text-teal/70 uppercase tracking-wide mb-0.5">{t.label}</p>
              )}
              <p className="font-mono text-xs text-dark/50 truncate">{shareUrl(t.token)}</p>
              <div className="flex gap-3 mt-1">
                <span className="font-sans text-[10px] text-dark/30">
                  {t.uses_count} inscription{t.uses_count !== 1 ? 's' : ''}
                  {t.max_uses ? ` / ${t.max_uses} max` : ''}
                </span>
                {t.expires_at && (
                  <span className="font-sans text-[10px] text-dark/30">
                    Expire le {new Date(t.expires_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => copyLink(t)}
                className={`px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-colors ${
                  copiedId === t.id ? 'bg-green-500 text-white' : 'bg-teal text-white hover:bg-teal/90'
                }`}
              >
                {copiedId === t.id ? '✓ Copié' : 'Copier'}
              </button>
              <button
                onClick={() => handleRevoke(t.id)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg border border-red-200 font-sans text-xs text-red-400 hover:bg-red-50 transition-colors"
              >
                Désactiver
              </button>
            </div>
          </div>

          {/* QR code */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=6&data=${encodeURIComponent(shareUrl(t.token))}`}
            alt="QR Code"
            width={120}
            height={120}
            className="rounded-lg border border-teal/10"
          />
        </div>
      ))}

      {/* Formulaire de création */}
      {creating ? (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-teal/30 p-4 space-y-3">
          <p className="font-sans text-xs font-medium text-dark/60 uppercase tracking-widest">Nouveau lien</p>
          <input
            name="label"
            placeholder="Label (ex : WhatsApp louange, Réunion juin…)"
            className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50"
          />
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="font-sans text-xs text-dark/40">Expiration</label>
              <select name="expiry_days" className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark focus:outline-none">
                {EXPIRY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="font-sans text-xs text-dark/40">Nb max d'inscriptions</label>
              <input
                name="max_uses"
                type="number"
                min={0}
                placeholder="Illimité"
                className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex-1 py-2 rounded-lg border border-teal/20 font-sans text-xs text-dark/60 hover:bg-teal/5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 rounded-lg bg-teal text-white font-sans text-xs font-medium hover:bg-teal/90 disabled:opacity-40"
            >
              Générer le lien
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-teal/30 font-sans text-xs text-dark/40 hover:text-teal hover:border-teal/60 transition-colors"
        >
          + Créer un lien d'inscription
        </button>
      )}

      {/* Tokens expirés/révoqués */}
      {expired.length > 0 && (
        <details className="mt-2">
          <summary className="font-sans text-xs text-dark/30 cursor-pointer hover:text-dark/50">
            {expired.length} lien{expired.length > 1 ? 's' : ''} expiré{expired.length > 1 ? 's' : ''} / désactivé{expired.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1.5">
            {expired.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-dark/5 rounded-lg opacity-50">
                <div className="min-w-0">
                  {t.label && <span className="font-sans text-xs text-dark/60 mr-2">{t.label}</span>}
                  <span className="font-sans text-[10px] text-dark/40">
                    {t.uses_count} inscription{t.uses_count !== 1 ? 's' : ''}
                    {t.revoked_at ? ' · désactivé' : t.max_uses ? ' · limite atteinte' : ' · expiré'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
