'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { PlanItem } from './page'

const TYPE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  sunday_service: { bg: 'bg-teal/15',    border: 'border-teal/40',    dot: 'bg-teal' },
  prayer_meeting: { bg: 'bg-purple-50',  border: 'border-purple-300', dot: 'bg-purple-400' },
  rehearsal:      { bg: 'bg-orange-50',  border: 'border-orange-300', dot: 'bg-orange-400' },
}

const TYPE_LABELS: Record<string, string> = {
  sunday_service: 'Culte',
  prayer_meeting: 'Prière',
  rehearsal:      '🎵 Répétition',
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

type Props = { plans: PlanItem[]; monthParam?: string; icalUrl: string }

export function PlanCalendar({ plans, monthParam, icalUrl }: Props) {
  const today = new Date()

  // Mois affiché (via URL param ou mois courant)
  const initYear  = monthParam ? parseInt(monthParam.split('-')[0]) : today.getFullYear()
  const initMonth = monthParam ? parseInt(monthParam.split('-')[1]) - 1 : today.getMonth()
  const [year,  setYear]  = useState(initYear)
  const [month, setMonth] = useState(initMonth)
  const [copied, setCopied] = useState(false)
  const [showPast, setShowPast] = useState(false)

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0);  setYear(y => y + 1) } else setMonth(m => m + 1) }
  function goToday()   { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  function copyIcal() {
    navigator.clipboard.writeText(icalUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // Construire la grille du mois
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Ajuster pour semaine commençant lundi (0=lun, 6=dim)
  const startDow = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startDow + 1
    if (d < 1 || d > lastDay.getDate()) return null
    return new Date(year, month, d)
  })

  // Index des plans par date 'YYYY-MM-DD'
  const plansByDate: Record<string, PlanItem[]> = {}
  for (const p of plans) {
    const key = p.service_date.split('T')[0]
    if (!plansByDate[key]) plansByDate[key] = []
    plansByDate[key].push(p)
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  // Plans du mois pour la liste latérale
  const monthKey  = `${year}-${String(month+1).padStart(2,'0')}`
  const monthPlans = plans
    .filter(p => p.service_date.startsWith(monthKey))
    .sort((a, b) => a.service_date.localeCompare(b.service_date))

  return (
    <div className="space-y-4">
      {/* Header calendrier */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-teal/20 transition-colors font-sans text-sm text-dark/50">‹</button>
          <h2 className="font-display text-xl text-dark font-light w-48 text-center">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-teal/20 transition-colors font-sans text-sm text-dark/50">›</button>
          <button onClick={goToday} className="ml-2 px-3 py-1 rounded-lg border border-teal/20 font-sans text-xs text-teal hover:bg-teal/5 transition-colors">
            Aujourd'hui
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Légende */}
          <div className="hidden md:flex items-center gap-3">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <span key={type} className="flex items-center gap-1.5 font-sans text-xs text-dark/50">
                <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[type]?.dot ?? 'bg-dark/30'}`} />
                {label}
              </span>
            ))}
          </div>
          {/* iCal */}
          <button
            onClick={copyIcal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/20 font-sans text-xs text-dark/50 hover:text-teal hover:border-teal/40 transition-colors"
            title="Copier le lien d'abonnement iCal (Google Calendar, Apple Calendar…)"
          >
            {copied ? '✓ Copié !' : '📅 Abonner'}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Grille calendrier */}
        <div className="flex-1 bg-white rounded-2xl border border-teal/20 overflow-hidden">
          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 border-b border-teal/10">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center font-sans text-xs text-dark/30 uppercase tracking-widest font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Cellules */}
          <div className="grid grid-cols-7">
            {cells.map((date, idx) => {
              if (!date) return (
                <div key={`empty-${idx}`} className="border-b border-r border-teal/5 min-h-[80px] bg-dark/2" />
              )
              const key       = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
              const dayPlans  = plansByDate[key] ?? []
              const isToday   = key === todayKey
              const isPast    = key < todayKey
              const isLastCol = (idx + 1) % 7 === 0

              return (
                <div
                  key={key}
                  className={`border-b border-r border-teal/8 min-h-[80px] p-1.5 ${isLastCol ? 'border-r-0' : ''} ${isPast ? 'bg-dark/[0.015]' : ''}`}
                >
                  {/* Numéro du jour */}
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full mb-1 font-sans text-xs font-medium ${
                    isToday
                      ? 'bg-teal text-white'
                      : isPast
                        ? 'text-dark/25'
                        : 'text-dark/60'
                  }`}>
                    {date.getDate()}
                  </div>

                  {/* Événements */}
                  {dayPlans.map(p => {
                    const type   = p.plan_type ?? 'sunday_service'
                    const colors = TYPE_COLORS[type] ?? TYPE_COLORS.sunday_service
                    const time   = new Date(p.service_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <Link
                        key={p.id}
                        href={`/benevoles/admin/plans/${p.id}`}
                        className={`block rounded px-1.5 py-0.5 mb-0.5 border text-left transition-opacity hover:opacity-80 ${colors.bg} ${colors.border} ${isPast ? 'opacity-50' : ''}`}
                      >
                        <p className="font-sans text-[10px] font-medium text-dark truncate leading-tight">{p.title}</p>
                        <p className="font-sans text-[9px] text-dark/40 leading-tight">{time}</p>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Liste latérale du mois */}
        <div className="hidden lg:flex flex-col w-56 shrink-0 space-y-2">
          <p className="font-sans text-xs text-dark/40 uppercase tracking-widest font-medium px-1">Ce mois</p>
          {monthPlans.length === 0 ? (
            <p className="font-sans text-xs text-dark/30 italic px-1">Aucun service.</p>
          ) : monthPlans.map(p => {
            const type   = p.plan_type ?? 'sunday_service'
            const colors = TYPE_COLORS[type] ?? TYPE_COLORS.sunday_service
            const isPast = p.service_date < today.toISOString()
            const d = new Date(p.service_date)
            return (
              <Link
                key={p.id}
                href={`/benevoles/admin/plans/${p.id}`}
                className={`flex items-start gap-2 p-2 rounded-xl bg-white border ${colors.border} hover:border-teal/40 transition-colors ${isPast ? 'opacity-50' : ''}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${colors.dot}`} />
                <div className="min-w-0">
                  <p className="font-sans text-xs font-medium text-dark truncate">{p.title}</p>
                  <p className="font-sans text-[10px] text-dark/40 capitalize">
                    {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} · {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
