'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Supabase met le token dans le hash fragment : #access_token=...&type=recovery
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken || !refreshToken) {
      router.replace('/benevoles/login?error=auth')
      return
    }

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ data, error }) => {
        if (error) {
          router.replace('/benevoles/login?error=auth')
          return
        }

        // Vérification par type ET par statut profil (fallback si Supabase renvoie un type inattendu)
        if (type === 'recovery' || type === 'invite') {
          router.replace('/benevoles/set-password')
          return
        }

        const userId = data.session?.user?.id
        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', userId)
            .single()
          if (profile?.status === 'invited') {
            router.replace('/benevoles/set-password')
            return
          }
        }

        router.replace('/benevoles/dashboard')
      })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50">
      <p className="font-sans text-dark/50 text-sm">Connexion en cours…</p>
    </div>
  )
}
