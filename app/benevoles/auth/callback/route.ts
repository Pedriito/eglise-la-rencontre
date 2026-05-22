import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'recovery' || type === 'invite') {
        return NextResponse.redirect(`${origin}/benevoles/set-password`)
      }
      // Fallback : vérifie le statut du profil (cas où type n'est pas dans l'URL)
      const userId = sessionData.session?.user?.id
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', userId)
          .single()
        if (profile?.status === 'invited') {
          return NextResponse.redirect(`${origin}/benevoles/set-password`)
        }
      }
      return NextResponse.redirect(`${origin}/benevoles/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/benevoles/login?error=auth`)
}
