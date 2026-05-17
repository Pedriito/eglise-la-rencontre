import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createAdmin() {
  // 1. Invite l'utilisateur (envoie un email pour créer son mot de passe)
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    'nicolas.salafranque@gmail.com',
    {
      data: {
        first_name: 'Nicolas',
        last_name: 'Salafranque',
      },
    }
  )

  if (error) {
    console.error('Erreur invitation:', error.message)
    process.exit(1)
  }

  const userId = data.user.id
  console.log('Utilisateur créé:', userId)

  // 2. Met à jour le profil en admin
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ permission: 'admin', status: 'active' })
    .eq('id', userId)

  if (profileError) {
    console.error('Erreur profil:', profileError.message)
    process.exit(1)
  }

  console.log('Compte admin créé pour nicolas.salafranque@gmail.com')
}

createAdmin()
