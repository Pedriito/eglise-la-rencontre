'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '../login/actions'

type Props = {
  permission: string
  firstName: string
  lastName: string
}

type NavItem = {
  label: string
  shortLabel: string
  href: string
  match: (p: string) => boolean
  icon: string
}

export function BenevoleNav({ permission, firstName, lastName }: Props) {
  const pathname = usePathname()
  const isAdmin = permission === 'admin'
  const isEditor = permission === 'editor'

  const items: NavItem[] = [
    {
      label: 'Mon espace',
      shortLabel: 'Accueil',
      href: '/benevoles/dashboard',
      match: p => p === '/benevoles/dashboard',
      icon: '⊡',
    },
  ]

  if (isAdmin || isEditor) {
    items.push({
      label: 'Planification',
      shortLabel: 'Planning',
      href: '/benevoles/admin/plans',
      match: p => p.startsWith('/benevoles/admin/plans'),
      icon: '◫',
    })
    items.push({
      label: 'Équipes',
      shortLabel: 'Équipes',
      href: '/benevoles/admin/equipes',
      match: p => p.startsWith('/benevoles/admin/equipes'),
      icon: '◻',
    })
  }

  if (isAdmin) {
    items.push({
      label: 'Bénévoles',
      shortLabel: 'Bénévoles',
      href: '/benevoles/admin',
      match: p =>
        p === '/benevoles/admin' ||
        p.startsWith('/benevoles/admin/benevoles') ||
        p.startsWith('/benevoles/admin/inviter'),
      icon: '◷',
    })
  }

  items.push({
    label: 'Chants',
    shortLabel: 'Chants',
    href: '/benevoles/chants',
    match: p => p.startsWith('/benevoles/chants'),
    icon: '♩',
  })

  items.push({
    label: 'Gestion',
    shortLabel: 'Gestion',
    href: '/benevoles/gestion',
    match: p => p.startsWith('/benevoles/gestion'),
    icon: '◈',
  })


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

      {/* ── Barre mobile en bas ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-teal/20 flex">
        {items.map(item => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 font-sans text-xs transition-colors ${
                active ? 'text-teal font-medium' : 'text-dark/40'
              }`}
            >
              <span className={`block w-1.5 h-1.5 rounded-full mb-0.5 ${active ? 'bg-teal' : 'bg-transparent'}`} />
              {item.shortLabel}
            </Link>
          )
        })}
        <Link
          href="/benevoles/profil"
          className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 font-sans text-xs transition-colors ${
            pathname === '/benevoles/profil' ? 'text-teal font-medium' : 'text-dark/40'
          }`}
        >
          <span className={`block w-1.5 h-1.5 rounded-full mb-0.5 ${pathname === '/benevoles/profil' ? 'bg-teal' : 'bg-transparent'}`} />
          Profil
        </Link>
      </nav>
    </>
  )
}
