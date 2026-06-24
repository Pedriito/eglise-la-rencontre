'use client'

import 'temporal-polyfill/global'
import '@schedule-x/theme-default/dist/index.css'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNextCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import { createViewMonthGrid, type CalendarEventExternal } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls'
import type { PlanItem } from './page'
import { TYPE_LABELS, SX_CALENDAR_COLORS } from './planTypeStyles'
import { SubscribeCalendarButton } from './SubscribeCalendarButton'
import { movePlan } from './actions'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

type Props = { plans: PlanItem[]; monthParam?: string; icalUrl: string; canManage: boolean; countByPlan?: Record<string, number> }

/** Construit un ZonedDateTime à partir d'un service_date — on réutilise les mêmes
 *  composantes Y/M/D/H/M que le reste de l'app (via Date), pour rester cohérent avec
 *  l'heure déjà affichée partout ailleurs (liste, détail du plan…). */
function planStart(serviceDate: string): Temporal.ZonedDateTime {
  const d = new Date(serviceDate)
  return Temporal.ZonedDateTime.from({
    timeZone: 'Europe/Paris',
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  })
}

/** Nombre de lignes (semaines, lundi en premier) qu'occupe le mois dans la grille. */
function weeksInMonth(date: Temporal.PlainDate): number {
  const firstWeekday = date.with({ day: 1 }).dayOfWeek // 1 = lundi … 7 = dimanche
  return Math.ceil((firstWeekday - 1 + date.daysInMonth) / 7)
}

function planToEvent(plan: PlanItem): CalendarEventExternal {
  const start = planStart(plan.service_date)
  return {
    id: plan.id,
    title: plan.title,
    start,
    end: start.add({ hours: 1 }),
    calendarId: plan.plan_type ?? 'sunday_service',
  }
}

/** Câble un glisser-déposer "maison" sur la grille mensuelle, via les attributs DOM
 *  stables et documentés de schedule-x (data-event-id / data-date) — la librairie
 *  n'expose le vrai drag-and-drop que dans son plugin premium payant. */
function wireDragAndDrop(
  wrapper: HTMLElement,
  opts: {
    onDrop: (eventId: string, newDateStr: string) => void
    onDragStateChange: (dragging: boolean) => void
  }
) {
  if (wrapper.dataset.rencontreDndWired) return
  wrapper.dataset.rencontreDndWired = '1'

  let draggingEl: HTMLElement | null = null
  let draggingEventId: string | null = null
  let startX = 0
  let startY = 0
  let isDragging = false
  let dragoverEl: HTMLElement | null = null

  const clearDragover = () => {
    dragoverEl?.classList.remove('sx__month-grid-day--dragover')
    dragoverEl = null
  }

  const reset = () => {
    draggingEl?.classList.remove('is-rencontre-dragging')
    clearDragover()
    document.body.style.userSelect = ''
    draggingEl = null
    draggingEventId = null
    isDragging = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    const eventEl = (e.target as HTMLElement).closest('[data-event-id]') as HTMLElement | null
    if (!eventEl || !wrapper.contains(eventEl)) return
    draggingEl = eventEl
    draggingEventId = eventEl.getAttribute('data-event-id')
    startX = e.clientX
    startY = e.clientY
    isDragging = false
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    if (!draggingEl) return
    if (!isDragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < 6) return
      isDragging = true
      draggingEl.classList.add('is-rencontre-dragging')
      document.body.style.userSelect = 'none'
      opts.onDragStateChange(true)
    }
    clearDragover()
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const dayEl = target?.closest('[data-date]') as HTMLElement | null
    if (dayEl && wrapper.contains(dayEl)) {
      dayEl.classList.add('sx__month-grid-day--dragover')
      dragoverEl = dayEl
    }
  }

  function onMouseUp(e: MouseEvent) {
    const wasDragging = isDragging
    const eventId = draggingEventId
    reset()
    opts.onDragStateChange(false)
    if (!wasDragging || !eventId) return

    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const dayEl = target?.closest('[data-date]') as HTMLElement | null
    const newDate = dayEl?.getAttribute('data-date')
    if (!newDate) return

    opts.onDrop(eventId, newDate)
  }

  wrapper.addEventListener('mousedown', onMouseDown)
}

export function PlanCalendar({ plans, monthParam, icalUrl, canManage, countByPlan = {} }: Props) {
  const router = useRouter()
  const justDraggedRef = useRef(false)
  const [selectedDate, setSelectedDate] = useState(() =>
    monthParam ? Temporal.PlainDate.from(`${monthParam}-01`) : Temporal.Now.plainDateISO()
  )
  const [error, setError] = useState<string | null>(null)

  const [eventsService] = useState(() => createEventsServicePlugin())
  const [calendarControls] = useState(() => createCalendarControlsPlugin())

  const calendars = Object.fromEntries(
    Object.entries(SX_CALENDAR_COLORS).map(([id, colors]) => [
      id,
      { colorName: id, lightColors: colors, darkColors: colors },
    ])
  )

  function handleDrop(eventId: string, newDateStr: string) {
    const original = eventsService.get(eventId)
    if (!original || !(original.start instanceof Temporal.ZonedDateTime)) return

    const [y, m, d] = newDateStr.split('-').map(Number)
    if (original.start.year === y && original.start.month === m && original.start.day === d) return

    const newStart = original.start.with({ year: y, month: m, day: d })
    const newEnd = original.end instanceof Temporal.ZonedDateTime
      ? original.end.with({ year: y, month: m, day: d })
      : newStart.add({ hours: 1 })

    // Optimiste : on déplace tout de suite dans le calendrier…
    eventsService.update({ ...original, start: newStart, end: newEnd })
    justDraggedRef.current = true
    setError(null)

    const pad = (n: number) => String(n).padStart(2, '0')
    const newServiceDate = `${y}-${pad(m)}-${pad(d)}T${pad(newStart.hour)}:${pad(newStart.minute)}`

    // … puis on persiste, et on revient en arrière en cas d'échec.
    movePlan(eventId, newServiceDate).then(res => {
      if (!res.ok) {
        eventsService.update(original)
        setError(res.error ?? "Le déplacement n'a pas pu être enregistré.")
        return
      }
      router.refresh()
    })
  }

  const calendar = useNextCalendarApp(
    {
      views: [createViewMonthGrid()],
      defaultView: 'month-grid',
      events: plans.map(planToEvent),
      calendars,
      selectedDate,
      locale: 'fr-FR',
      firstDayOfWeek: 1,
      isDark: false,
      callbacks: {
        onEventClick: (event) => {
          if (justDraggedRef.current) {
            justDraggedRef.current = false
            return
          }
          router.push(`/benevoles/admin/plans/${event.id}`)
        },
        onRender: ($app) => {
          if (!canManage || !$app.elements.calendarWrapper) return
          wireDragAndDrop($app.elements.calendarWrapper, {
            onDrop: handleDrop,
            onDragStateChange: () => {},
          })
        },
      },
    },
    [eventsService, calendarControls]
  )

  // Resynchronise les événements affichés quand la liste de plans change
  // (après un router.refresh() suite à un déplacement, par exemple).
  useEffect(() => {
    eventsService.set(plans.map(planToEvent))
  }, [plans, eventsService])

  function goTo(date: Temporal.PlainDate) {
    calendarControls.setDate(date)
    setSelectedDate(date)
  }
  function prevMonth() { goTo(selectedDate.subtract({ months: 1 })) }
  function nextMonth() { goTo(selectedDate.add({ months: 1 })) }
  function goToday()   { goTo(Temporal.Now.plainDateISO()) }

  // Hauteur de la grille ajustée au nombre réel de semaines du mois affiché
  // (4 à 6 lignes selon le mois), au lieu d'une hauteur fixe qui étire ou laisse du vide.
  const calendarHeight = weeksInMonth(selectedDate) * 88

  // ── Agenda latéral : compteur du mois affiché + listes "Cette semaine" / "Plus tard" ──
  const monthKey = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}`
  const todayISO = new Date().toISOString()
  const today = Temporal.Now.plainDateISO()
  const weekStart = today.subtract({ days: today.dayOfWeek - 1 })
  const weekEnd = weekStart.add({ days: 6 })

  const monthPlansAll = plans.filter(p => p.service_date.startsWith(monthKey))
  const monthRangeLabel = `Du 1ᵉʳ au ${selectedDate.daysInMonth} ${MONTHS[selectedDate.month - 1].toLowerCase()}`

  const byDateAsc = (a: PlanItem, b: PlanItem) => a.service_date.localeCompare(b.service_date)
  const planPlainDate = (p: PlanItem) => Temporal.PlainDate.from(p.service_date.slice(0, 10))
  const inRange = (p: PlanItem, from: Temporal.PlainDate, to: Temporal.PlainDate) => {
    const d = planPlainDate(p)
    return Temporal.PlainDate.compare(d, from) >= 0 && Temporal.PlainDate.compare(d, to) <= 0
  }

  const thisWeekPlans = plans.filter(p => inRange(p, weekStart, weekEnd)).sort(byDateAsc)
  const laterPlans = plans
    .filter(p => Temporal.PlainDate.compare(planPlainDate(p), weekEnd) > 0)
    .sort(byDateAsc)
    .slice(0, 6)
  const featuredId = thisWeekPlans.find(p => p.service_date >= todayISO)?.id

  function typeColors(p: PlanItem) {
    return SX_CALENDAR_COLORS[p.plan_type ?? 'sunday_service'] ?? SX_CALENDAR_COLORS.sunday_service
  }

  function formatDateLabel(p: PlanItem, withMonth: boolean) {
    const d = new Date(p.service_date)
    return d.toLocaleDateString('fr-FR', withMonth ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' })
  }
  function formatTimeLabel(p: PlanItem) {
    return new Date(p.service_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Header calendrier */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-teal/20 transition-colors font-sans text-sm text-dark/50">‹</button>
          <h2 className="font-display text-xl text-dark font-light w-48 text-center">
            {MONTHS[selectedDate.month - 1]} {selectedDate.year}
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
                <span className="w-2 h-2 rounded-full" style={{ background: SX_CALENDAR_COLORS[type]?.main }} />
                {label}
              </span>
            ))}
          </div>
          <SubscribeCalendarButton icalUrl={icalUrl} />
        </div>
      </div>

      {canManage && (
        <p className="font-sans text-xs text-dark/35 px-1">
          Glissez un service vers un autre jour pour le replanifier.
        </p>
      )}
      {error && (
        <p className="font-sans text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-4">
        {/* Grille calendrier */}
        <div className="flex-1 bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden sx-rencontre-theme">
          <div className="grid grid-cols-7 border-b border-dark/8">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center font-sans text-[11px] uppercase tracking-widest text-dark/35 font-medium">
                {d}
              </div>
            ))}
          </div>
          <div style={{ height: calendarHeight }}>
            <ScheduleXCalendar calendarApp={calendar} />
          </div>
        </div>

        {/* Agenda latéral */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-dark/8 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs uppercase tracking-widest text-dark font-semibold">Ce mois</p>
              <span className="flex items-center justify-center min-w-5.5 h-5.5 px-1.5 rounded-full bg-teal-dark text-white font-sans text-[11px] font-semibold">
                {monthPlansAll.length}
              </span>
            </div>
            <p className="font-sans text-sm text-dark/40 mt-1">{monthRangeLabel}</p>
          </div>

          {thisWeekPlans.length === 0 && laterPlans.length === 0 ? (
            <p className="font-sans text-xs text-dark/30 italic px-1">Aucun service à venir.</p>
          ) : (
            <>
              {thisWeekPlans.length > 0 && (
                <div className="space-y-2">
                  <p className="font-sans text-[10px] uppercase tracking-widest text-dark/35 font-semibold px-1">Cette semaine</p>
                  {thisWeekPlans.map(p => {
                    const colors = typeColors(p)
                    const n = countByPlan[p.id] ?? 0
                    const featured = p.id === featuredId
                    if (featured) {
                      return (
                        <Link
                          key={p.id}
                          href={`/benevoles/admin/plans/${p.id}`}
                          className="block rounded-xl border p-3 transition-opacity hover:opacity-90"
                          style={{ borderColor: colors.main, backgroundColor: colors.container }}
                        >
                          <p className="font-sans text-sm font-semibold text-dark truncate">{p.title}</p>
                          <p className="font-sans text-xs text-dark/45 mt-0.5 capitalize">
                            {formatDateLabel(p, false)} · {formatTimeLabel(p)}{n > 0 && ` · ${n} affecté${n > 1 ? 's' : ''}`}
                          </p>
                        </Link>
                      )
                    }
                    return (
                      <Link key={p.id} href={`/benevoles/admin/plans/${p.id}`} className="flex items-start gap-2.5 py-1">
                        <span className="w-[3px] rounded-full self-stretch shrink-0" style={{ background: colors.main }} />
                        <div className="min-w-0">
                          <p className="font-sans text-sm font-semibold text-dark truncate">{p.title}</p>
                          <p className="font-sans text-xs text-dark/45 mt-0.5 capitalize">
                            {formatDateLabel(p, false)} · {formatTimeLabel(p)}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {laterPlans.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-sans text-[10px] uppercase tracking-widest text-dark/35 font-semibold px-1">Plus tard</p>
                  {laterPlans.map(p => {
                    const colors = typeColors(p)
                    return (
                      <Link key={p.id} href={`/benevoles/admin/plans/${p.id}`} className="flex items-start gap-2 py-1">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: colors.main }} />
                        <div className="min-w-0">
                          <p className="font-sans text-sm font-medium text-dark truncate">{p.title}</p>
                          <p className="font-sans text-xs text-dark/40 mt-0.5 capitalize">
                            {formatDateLabel(p, true)} · {formatTimeLabel(p)}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
