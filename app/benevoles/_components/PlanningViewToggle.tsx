import Link from 'next/link'
import { IconCalendar, IconGrid } from './Icons'

export type PlanningView = 'list' | 'calendar' | 'team'

/**
 * Sélecteur de vue de la page Planification : liste, calendrier, et — pour les
 * responsables et admins — la grille « Par équipe » (bénévoles × services du mois).
 * Partagé avec /benevoles/equipe pour qu'on puisse revenir aux autres vues.
 */
export function PlanningViewToggle({ current, showTeam, className = '' }: {
  current: PlanningView
  showTeam: boolean
  className?: string
}) {
  const tab = (view: PlanningView) =>
    `px-3 py-1.5 rounded-full font-sans text-xs font-medium transition-colors flex items-center gap-1 ${
      current === view ? 'bg-white text-dark shadow-sm' : 'text-dark/45 hover:text-dark'
    }`

  return (
    <div className={`rounded-full bg-dark/5 p-1 gap-1 ${className}`}>
      <Link href="/benevoles/admin/plans?view=list" className={tab('list')}>
        ☰ Liste
      </Link>
      <Link href="/benevoles/admin/plans?view=calendar" className={tab('calendar')}>
        <IconCalendar className="w-3 h-3" />
        Calendrier
      </Link>
      {showTeam && (
        <Link href="/benevoles/equipe" aria-current={current === 'team' ? 'page' : undefined} className={tab('team')}>
          <IconGrid className="w-3 h-3" />
          Par équipe
        </Link>
      )}
    </div>
  )
}
