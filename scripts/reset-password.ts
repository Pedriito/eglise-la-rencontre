import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getResetLink() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: 'nicolas.salafranque@gmail.com',
    options: {
      redirectTo: 'http://localhost:3000/benevoles/auth/confirm',
    },
  })

  if (error) {
    console.error('Erreur:', error.message)
    process.exit(1)
  }

  console.log('\nOuvre ce lien dans ton navigateur :\n')
  console.log(data.properties.action_link)
  console.log()
}

getResetLink()
