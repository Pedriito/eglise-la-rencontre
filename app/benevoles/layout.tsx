import { createClient } from '@/lib/supabase/server'
import { BenevoleNav } from './_components/BenevoleNav'
import { PwaInstallBanner } from './_components/PwaInstallBanner'

export default async function BenevoleLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <>{children}</>

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, permission')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen">
      <BenevoleNav
        permission={profile?.permission ?? 'viewer'}
        firstName={profile?.first_name ?? ''}
        lastName={profile?.last_name ?? ''}
      />
      <div className="flex-1 lg:ml-52 min-w-0 pt-14 lg:pt-0">
        {children}
      </div>
      <PwaInstallBanner />
    </div>
  )
}
