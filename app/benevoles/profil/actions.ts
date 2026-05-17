'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const phone    = (formData.get('phone') as string)?.trim() || null
  const birthdate = (formData.get('birthdate') as string) || null
  const city     = (formData.get('city') as string)?.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({
      phone,
      birthdate,
      city,
      email: user.email,
      profile_complete: true,
    })
    .eq('id', user.id)

  if (error) redirect('/benevoles/profil?error=failed')

  redirect('/benevoles/dashboard')
}
