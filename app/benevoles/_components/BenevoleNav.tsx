'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '../login/actions'
import { permissionLabels } from '@/lib/labels'

type Props = {
  permission: string
  firstName: string
  lastName: string
}

type NavItem = {
  label: string
  href: string
  match: (p: string) => boolean
}

export function BenevoleNav({ permission, firstName, lastName }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isSuperAdmin = permission === 'super_admin'
  const isAdmin = permission === 'admin' || isSuperAdmin
  const isEditor = permission === 'editor'

  const items: NavItem[] = [
    {
      label: 'Mon espace',
      href: '/benevoles/dashboard',
      match: p => p === '/benevoles/dashboard',
    },
  ]

  // Planification visible par tous les bénévoles connectés
  items.push({
    label: 'Planification',
    href: '/benevoles/admin/plans',
    match: p => p.startsWith('/benevoles/admin/plans'),
  })

  // Indisponibilités visible par tous
  items.push({
    label: 'Mes indispos',
    href: '/benevoles/mes-indisponibilites',
    match: p => p.startsWith('/benevoles/mes-indisponibilites'),
  })

  if (isAdmin || isEditor) {
    items.push({
      label: 'Équipes',
      href: '/benevoles/admin/equipes',
      match: p => p.startsWith('/benevoles/admin/equipes'),
    })
    items.push({
      label: 'Gérer les chants',
      href: '/benevoles/admin/chants',
      match: p => p.startsWith('/benevoles/admin/chants'),
    })
  }

  if (isAdmin) {
    items.push({
      label: 'Pastorale',
      href: '/benevoles/admin/pastorale',
      match: p => p.startsWith('/benevoles/admin/pastorale'),
    })
    items.push({
      label: 'Bénévoles',
      href: '/benevoles/admin',
      match: p =>
        p === '/benevoles/admin' ||
        p.startsWith('/benevoles/admin/benevoles') ||
        p.startsWith('/benevoles/admin/inviter'),
    })
  }

  if (isAdmin) {
    items.push({
      label: 'Site web',
      href: '/benevoles/admin/site',
      match: p => p.startsWith('/benevoles/admin/site'),
    })
  }

  if (isSuperAdmin) {
    items.push({
      label: 'Églises',
      href: '/benevoles/admin/eglises',
      match: p => p.startsWith('/benevoles/admin/eglises'),
    })
  }

  if (isAdmin || isEditor) {
    items.push({
      label: 'Paramètres vidéoprojection',
      href: '/benevoles/admin/parametres',
      match: p =>
        p.startsWith('/benevoles/admin/parametres') ||
        p.startsWith('/benevoles/admin/mediatheque'),
    })
  }

  items.push({
    label: 'Gestion',
    href: '/benevoles/gestion',
    match: p => p.startsWith('/benevoles/gestion'),
  })

  const currentItem = items.find(i => i.match(pathname))

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:flex w-52 shrink-0 bg-white border-r border-teal/20 min-h-screen flex-col fixed top-0 left-0 bottom-0 z-20">
        <div className="px-5 py-5 border-b border-teal/10">
          <p className="font-display text-base text-dark font-light leading-tight">Église La Rencontre</p>
          <p className="text-xs text-dark/40 font-sans mt-0.5">Espace bénévoles</p>
        </div>

        <nav className="flex-1 py-2">
          {items.map(item => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-5 py-2.5 font-sans text-sm transition-colors border-l-2 ${
                  active
                    ? 'text-teal font-medium bg-teal/5 border-teal'
                    : 'text-dark/55 hover:text-dark hover:bg-teal/5 border-transparent'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-teal/10">
          <Link
            href="/benevoles/profil"
            className={`flex items-center px-5 py-2.5 font-sans text-sm transition-colors border-l-2 ${
              pathname === '/benevoles/profil'
                ? 'text-teal font-medium bg-teal/5 border-teal'
                : 'text-dark/55 hover:text-dark hover:bg-teal/5 border-transparent'
            }`}
          >
            Mon profil
          </Link>
          <div className="px-5 pb-1 pt-0">
            <span className="font-sans text-[10px] uppercase tracking-widest text-teal/50 font-medium">
              {permissionLabels[permission] ?? permission}
            </span>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            {(firstName || lastName) && (
              <span className="font-sans text-xs text-dark/40 truncate">{firstName} {lastName}</span>
            )}
            <form action={logout}>
              <button type="submit" className="text-xs text-dark/35 hover:text-dark/70 font-sans transition-colors">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Header mobile ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-teal/20 flex items-center justify-between px-4 h-14">
        <div>
          <p className="font-display text-sm text-dark font-light leading-tight">Église La Rencontre</p>
          {currentItem && (
            <p className="font-sans text-xs text-dark/40 leading-none">{currentItem.label}</p>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex flex-col justify-center gap-[5px] w-10 h-10 items-center"
        >
          <span className="block w-5 h-[2px] bg-dark/60 rounded-full" />
          <span className="block w-5 h-[2px] bg-dark/60 rounded-full" />
          <span className="block w-5 h-[2px] bg-dark/60 rounded-full" />
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
      <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* En-tête drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-teal/10">
          <div>
            <p className="font-display text-base text-dark font-light">Église La Rencontre</p>
            <p className="font-sans text-xs text-dark/40">Espace bénévoles</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="w-9 h-9 flex items-center justify-center text-dark/40 hover:text-dark transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Liens */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {items.map(item => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center px-5 py-3.5 font-sans text-base transition-colors border-l-2 ${
                  active
                    ? 'text-teal font-medium bg-teal/5 border-teal'
                    : 'text-dark/60 hover:text-dark hover:bg-teal/5 border-transparent'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Profil + déconnexion */}
        <div className="border-t border-teal/10">
          <Link
            href="/benevoles/profil"
            onClick={() => setOpen(false)}
            className={`flex items-center px-5 py-3.5 font-sans text-base transition-colors border-l-2 ${
              pathname === '/benevoles/profil'
                ? 'text-teal font-medium bg-teal/5 border-teal'
                : 'text-dark/60 hover:text-dark hover:bg-teal/5 border-transparent'
            }`}
          >
            Mon profil
          </Link>
          <div className="px-5 pb-1 pt-0">
            <span className="font-sans text-[10px] uppercase tracking-widest text-teal/50 font-medium">
              {permissionLabels[permission] ?? permission}
            </span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between border-t border-teal/10">
            {(firstName || lastName) && (
              <span className="font-sans text-sm text-dark/50 truncate">{firstName} {lastName}</span>
            )}
            <form action={logout}>
              <button type="submit" className="text-sm text-dark/35 hover:text-dark/70 font-sans transition-colors">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
