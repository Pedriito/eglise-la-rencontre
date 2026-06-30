'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '../login/actions'
import { permissionLabels } from '@/lib/labels'
import {
  IconHome, IconCalendar, IconClock, IconClipboard,
  IconUsers, IconMusicalNote, IconHeart, IconUser,
  IconGlobe, IconBuilding, IconProjector, IconLogout, IconBan,
} from './Icons'

type Props = {
  permission: string
  firstName: string
  lastName: string
}

type IconComponent = (props: { className?: string }) => React.ReactElement

type NavItem = {
  label: string
  href: string
  icon: IconComponent
  match: (p: string) => boolean
}

type NavGroup = {
  section?: string
  items: NavItem[]
}

const BOTTOM_TABS: NavItem[] = [
  { label: 'Accueil',  href: '/benevoles/dashboard',             icon: IconHome,        match: p => p === '/benevoles/dashboard' },
  { label: 'Planning', href: '/benevoles/historique',            icon: IconCalendar,    match: p => p.startsWith('/benevoles/historique') },
  { label: 'Chants',   href: '/benevoles/chants',                icon: IconMusicalNote, match: p => p.startsWith('/benevoles/chants') || p.startsWith('/benevoles/admin/chants') },
  { label: 'Indispos', href: '/benevoles/mes-indisponibilites',  icon: IconBan,         match: p => p.startsWith('/benevoles/mes-indisponibilites') },
  { label: 'Profil',   href: '/benevoles/profil',                icon: IconUser,        match: p => p === '/benevoles/profil' },
]

export function BenevoleNav({ permission, firstName, lastName }: Props) {
  const pathname = usePathname()

  const isSuperAdmin = permission === 'super_admin'
  const isAdmin = permission === 'admin' || isSuperAdmin
  const isEditor = permission === 'editor'

  const groups: NavGroup[] = []

  groups.push({
    items: [
      { label: 'Mon espace', href: '/benevoles/dashboard', icon: IconHome, match: p => p === '/benevoles/dashboard' },
    ],
  })

  groups.push({
    section: 'Planifier',
    items: [
      { label: 'Planification',    href: '/benevoles/admin/plans',          icon: IconCalendar,  match: p => p.startsWith('/benevoles/admin/plans') },
      { label: 'Mes indispos',     href: '/benevoles/mes-indisponibilites', icon: IconClock,     match: p => p.startsWith('/benevoles/mes-indisponibilites') },
      { label: 'Tâches & décisions', href: '/benevoles/gestion',            icon: IconClipboard, match: p => p.startsWith('/benevoles/gestion') },
    ],
  })

  const adminItems: NavItem[] = []
  if (isAdmin || isEditor) {
    adminItems.push({ label: 'Équipes',  href: '/benevoles/admin/equipes', icon: IconUsers,       match: p => p.startsWith('/benevoles/admin/equipes') })
    adminItems.push({ label: 'Chants',   href: '/benevoles/admin/chants',  icon: IconMusicalNote, match: p => p.startsWith('/benevoles/admin/chants') })
  }
  if (isAdmin) {
    adminItems.push({ label: 'Pastorale', href: '/benevoles/admin/pastorale', icon: IconHeart, match: p => p.startsWith('/benevoles/admin/pastorale') })
    adminItems.push({ label: 'Bénévoles', href: '/benevoles/admin', icon: IconUser, match: p => p === '/benevoles/admin' || p.startsWith('/benevoles/admin/benevoles') || p.startsWith('/benevoles/admin/inviter') })
    adminItems.push({ label: 'Site web',  href: '/benevoles/admin/site', icon: IconGlobe, match: p => p.startsWith('/benevoles/admin/site') })
  }
  if (isSuperAdmin) {
    adminItems.push({ label: 'Églises', href: '/benevoles/admin/eglises', icon: IconBuilding, match: p => p.startsWith('/benevoles/admin/eglises') })
  }
  if (adminItems.length > 0) groups.push({ section: 'Administration', items: adminItems })

  if (isAdmin || isEditor) {
    groups.push({
      section: 'Réglages',
      items: [{ label: 'Vidéoprojection', href: '/benevoles/admin/parametres', icon: IconProjector, match: p => p.startsWith('/benevoles/admin/parametres') || p.startsWith('/benevoles/admin/mediatheque') }],
    })
  }

  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'B'

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-ink min-h-screen flex-col fixed top-0 left-0 bottom-0 z-20">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-dark flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="" width={20} height={20} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] text-white font-medium leading-tight truncate">La Rencontre</p>
            <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-white/35 mt-0.5">Espace bénévoles</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : 'mt-1'}>
              {group.section && (
                <p className="px-3 pb-1.5 pt-1 font-sans text-[10px] uppercase tracking-[0.16em] text-white/30 font-semibold">
                  {group.section}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = item.match(pathname)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-sans text-sm transition-colors ${
                        active ? 'bg-teal-dark text-white font-medium' : 'text-white/55 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/benevoles/profil"
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${pathname === '/benevoles/profil' ? 'bg-white/5' : 'hover:bg-white/5'}`}
          >
            <div className="w-8 h-8 rounded-full bg-teal-dark flex items-center justify-center shrink-0">
              <span className="font-sans text-xs font-semibold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm text-white truncate">{firstName} {lastName}</p>
              <p className="font-sans text-[11px] text-white/40 truncate">{permissionLabels[permission] ?? permission}</p>
            </div>
          </Link>
          <form action={logout}>
            <button type="submit" className="w-full mt-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 font-sans text-xs transition-colors">
              <IconLogout className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ── Bottom navigation mobile — Liquid Glass ── */}
      <nav
        className="lg:hidden fixed z-30"
        style={{
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
          left: '12px',
          right: '12px',
          background: 'rgba(255,255,255,0.38)',
          backdropFilter: 'blur(60px) saturate(220%)',
          WebkitBackdropFilter: 'blur(60px) saturate(220%)',
          borderRadius: '28px',
          border: '0.5px solid rgba(255,255,255,0.6)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 0.5px 0 rgba(255,255,255,0.8)',
        }}
      >
        {(() => {
          const activeIndex = BOTTOM_TABS.findIndex(tab => tab.match(pathname))
          return (
            <div className="relative flex items-center px-2 py-2">
              {/* Sliding pill indicator */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '8px',
                  bottom: '8px',
                  left: '8px',
                  width: 'calc((100% - 16px) / 5)',
                  borderRadius: '18px',
                  background: 'rgba(90,158,166,0.13)',
                  transform: `translateX(calc(${Math.max(0, activeIndex)} * 100%))`,
                  transition: 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
              {BOTTOM_TABS.map(tab => {
                const active = tab.match(pathname)
                const Icon = tab.icon
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className="relative flex-1 flex flex-col items-center gap-0.5 py-1.5"
                  >
                    <span style={{ transform: active ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)', display: 'flex' }}>
                      <Icon className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-teal' : 'text-dark/35'}`} />
                    </span>
                    <span
                      className={`font-sans text-[10px] font-medium transition-colors duration-200 ${active ? 'text-teal' : 'text-dark/35'}`}
                    >
                      {tab.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )
        })()}
      </nav>
    </>
  )
}
