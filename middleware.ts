import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const isLoginPage = request.nextUrl.pathname === '/benevoles/login'
  const isCallback = request.nextUrl.pathname.startsWith('/benevoles/auth')

  const isSetPassword = request.nextUrl.pathname === '/benevoles/set-password'

  // Pas connecté → redirige vers login (sauf si déjà sur login ou callback)
  if (!user && !isLoginPage && !isCallback && !isSetPassword) {
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
