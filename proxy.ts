import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage    = pathname === '/benevoles/login'
  const isCallback     = pathname.startsWith('/benevoles/auth')
  const isSetPassword  = pathname === '/benevoles/set-password'
  const isResetPage    = pathname === '/benevoles/mot-de-passe-oublie'
  const isActivation   = pathname.startsWith('/benevoles/activer')
  const isRepondre     = pathname.startsWith('/benevoles/repondre')
  const isRejoindre    = pathname.startsWith('/benevoles/rejoindre')

  // Pas connecté → redirige vers login (sauf pages publiques)
  if (!user && !isLoginPage && !isCallback && !isSetPassword && !isResetPage && !isActivation && !isRepondre && !isRejoindre) {
    return NextResponse.redirect(new URL('/benevoles/login', request.url))
  }

  // Connecté → redirige depuis login vers dashboard
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/benevoles/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/benevoles/:path*'],
}
