'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function setPassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) {
    redirect('/benevoles/set-password?error=mismatch')
  }

  if (password.length < 8) {
    redirect('/benevoles/set-password?error=short')
  }

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

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect('/benevoles/set-password?error=failed')
  }

  // Met le statut à actif
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', user.id)
  }

  redirect('/benevoles/dashboard')
}
