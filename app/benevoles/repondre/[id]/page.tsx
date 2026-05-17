import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RepondrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { id } = await params
  const { status } = await searchParams

  if (status !== 'confirmed' && status !== 'declined') {
    redirect('/benevoles/login')
  }

  const admin = createAdminClient()

  const { data: assignment } = await admin
    .from('plan_assignments')
    .select('id, user_id, status, plans(title, service_date), positions(name)')
    .eq('id', id)
    .single()

  if (!assignment) redirect('/benevoles/dashboard')

  // Vérifie que l'utilisateur connecté correspond (optionnel, fallback sans auth)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user && user.id !== assignment.user_id) redirect('/benevoles/dashboard')

  await admin
    .from('plan_assignments')
    .update({ status })
    .eq('id', id)

  const plan = assignment.plans as any
  const position = assignment.positions as any
  const date = plan ? new Date(plan.service_date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) : '—'

  const isConfirmed = status === 'confirmed'

  return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-teal/20 p-8 max-w-md w-full text-center space-y-4">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-2xl ${isConfirmed ? 'bg-green-100' : 'bg-red-50'}`}>
          {isConfirmed ? '✓' : '✕'}
        </div>
        <h1 className="font-display text-2xl text-dark font-light">
          {isConfirmed ? 'Disponibilité confirmée' : 'Disponibilité déclinée'}
        </h1>
        <div className="bg-teal/5 rounded-xl px-5 py-4 text-left space-y-1">
          <p className="font-sans text-sm font-medium text-dark">{plan?.title}</p>
          <p className="font-sans text-xs text-dark/50 capitalize">{date}</p>
          {position && <p className="font-sans text-xs text-teal">{position.name}</p>}
        </div>
        <p className="font-sans text-sm text-dark/50">
          {isConfirmed
            ? 'Merci ! Ton responsable a été notifié.'
            : 'Ta réponse a été enregistrée. Tu peux modifier ça depuis ton espace.'}
        </p>
        <Link
          href="/benevoles/dashboard"
          className="inline-block px-6 py-2.5 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
        >
          Mon espace bénévole
        </Link>
      </div>
    </div>
  )
}
