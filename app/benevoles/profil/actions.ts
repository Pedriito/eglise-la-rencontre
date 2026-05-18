'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName  = (formData.get('last_name') as string)?.trim()
  const newEmail  = (formData.get('email') as string)?.trim()
  const phone     = (formData.get('phone') as string)?.trim() || null
  const birthdate = (formData.get('birthdate') as string) || null
  const city      = (formData.get('city') as string)?.trim() || null

  const emailChanged = newEmail && newEmail !== user.email
  let emailSent = false

  if (emailChanged) {
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      const key = error.message.toLowerCase().includes('already') ? 'email_taken' : 'failed'
      redirect(`/benevoles/profil?error=${key}`)
    }
    emailSent = true
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      birthdate,
      city,
      email: emailChanged ? newEmail : user.email,
      profile_complete: true,
    })
    .eq('id', user.id)

  if (error) redirect('/benevoles/profil?error=failed')

  redirect(emailSent ? '/benevoles/profil?email_sent=1' : '/benevoles/dashboard')
}
