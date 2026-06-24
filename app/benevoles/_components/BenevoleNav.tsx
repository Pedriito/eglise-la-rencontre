'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '../login/actions'
import { permissionLabels } from '@/lib/labels'
import {
  IconHome, IconCalendar, IconClock, IconClipboard,
  IconUsers, IconMusicalNote, IconHeart, IconUser,
  IconGlobe, IconBuilding, IconProjector, IconLogout,
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

export function BenevoleNav({ permission, firstName, lastName }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
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
      { label: 'Planification', href: '/benevoles/admin/plans', icon: IconCalendar, match: p => p.startsWith('/benevoles/admin/plans') },
      { label: 'Mes indispos', href: '/benevoles/mes-indisponibilites', icon: IconClock, match: p => p.startsWith('/benevoles/mes-indisponibilites') },
      { label: 'Tâches & décisions', href: '/benevoles/gestion', icon: IconClipboard, match: p => p.startsWith('/benevoles/gestion') },
    ],
  })

  const adminItems: NavItem[] = []
  if (isAdmin || isEditor) {
    adminItems.push({ label: 'Équipes', href: '/benevoles/admin/equipes', icon: IconUsers, match: p => p.startsWith('/benevoles/admin/equipes') })
    adminItems.push({ label: 'Chants', href: '/benevoles/admin/chants', icon: IconMusicalNote, match: p => p.startsWith('/benevoles/admin/chants') })
  }
  if (isAdmin) {
    adminItems.push({ label: 'Pastorale', href: '/benevoles/admin/pastorale', icon: IconHeart, match: p => p.startsWith('/benevoles/admin/pastorale') })
    adminItems.push({
      label: 'Bénévoles',
      href: '/benevoles/admin',
      icon: IconUser,
      match: p => p === '/benevoles/admin' || p.startsWith('/benevoles/admin/benevoles') || p.startsWith('/benevoles/admin/inviter'),
    })
    adminItems.push({ label: 'Site web', href: '/benevoles/admin/site', icon: IconGlobe, match: p => p.startsWith('/benevoles/admin/site') })
  }
  if (isSuperAdmin) {
    adminItems.push({ label: 'Églises', href: '/benevoles/admin/eglises', icon: IconBuilding, match: p => p.startsWith('/benevoles/admin/eglises') })
  }
  if (adminItems.length > 0) {
    groups.push({ section: 'Administration', items: adminItems })
  }

  if (isAdmin || isEditor) {
    groups.push({
      section: 'Réglages',
      items: [
        {
          label: 'Vidéoprojection',
          href: '/benevoles/admin/parametres',
          icon: IconProjector,
          match: p => p.startsWith('/benevoles/admin/parametres') || p.startsWith('/benevoles/admin/mediatheque'),
        },
      ],
    })
  }

  const allItems = groups.flatMap(g => g.items)
  const currentItem = allItems.find(i => i.match(pathname))
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
                        active
                          ? 'bg-teal-dark text-white font-medium'
                          : 'text-white/55 hover:text-white hover:bg-white/5'
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
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${
              pathname === '/benevoles/profil' ? 'bg-white/5' : 'hover:bg-white/5'
            }`}
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
            <button
              type="submit"
              className="w-full mt-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 font-sans text-xs transition-colors"
            >
              <IconLogout className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ── Header mobile ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-ink flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-teal-dark flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="" width={17} height={17} />
          </div>
          <div>
            <p className="font-display text-sm text-white font-medium leading-tight">La Rencontre</p>
            {currentItem && (
              <p className="font-sans text-[11px] text-white/40 leading-none">{currentItem.label}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex flex-col justify-center gap-[5px] w-10 h-10 items-center"
        >
          <span className="block w-5 h-[2px] bg-white/60 rounded-full" />
          <span className="block w-5 h-[2px] bg-white/60 rounded-full" />
          <span className="block w-5 h-[2px] bg-white/60 rounded-full" />
        </button>
      </header>

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-dark/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Drawer menu mobile ── */}
      <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-ink shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* En-tête drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-dark flex items-center justify-center shrink-0">
              <Image src="/logo.png" alt="" width={20} height={20} />
            </div>
            <div>
              <p className="font-display text-base text-white font-medium leading-tight">La Rencontre</p>
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-white/35">Espace bénévoles</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Liens */}
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
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg font-sans text-base transition-colors ${
                        active
                          ? 'bg-teal-dark text-white font-medium'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Profil + déconnexion */}
        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/benevoles/profil"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors ${
              pathname === '/benevoles/profil' ? 'bg-white/5' : 'hover:bg-white/5'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-teal-dark flex items-center justify-center shrink-0">
              <span className="font-sans text-xs font-semibold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm text-white truncate">{firstName} {lastName}</p>
              <p className="font-sans text-[11px] text-white/40 truncate">{permissionLabels[permission] ?? permission}</p>
            </div>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full mt-1 flex items-center gap-2 px-2 py-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 font-sans text-sm transition-colors"
            >
              <IconLogout className="w-4 h-4" />
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
