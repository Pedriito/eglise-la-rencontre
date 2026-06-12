export const permissionLabels: Record<string, string> = {
  super_admin: 'Super-admin',
  admin:  'Administrateur',
  editor: 'Éditeur',
  viewer: 'Lecture seule',
}

export const roleLabels: Record<string, string> = {
  leader: 'Responsable',
  member: 'Membre',
}

export const frequencyLabels: Record<string, string> = {
  as_needed:    'Selon les besoins',
  twice_month:  '2× par mois',
  every_6_weeks:'Toutes les 6 semaines',
  monthly:      '1× par mois',
  weekly:       'Chaque semaine',
}

export const statusLabels: Record<string, { label: string; color: string }> = {
  active:   { label: 'Actif',               color: 'bg-green-100 text-green-700' },
  invited:  { label: 'Invitation envoyée',   color: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Inactif',             color: 'bg-gray-100 text-gray-500' },
}

export const assignmentLabels: Record<string, { label: string; style: string }> = {
  confirmed: { label: 'Confirmé',    style: 'bg-green-100 text-green-700' },
  declined:  { label: 'Décliné',     style: 'bg-red-100 text-red-600' },
  pending:   { label: 'En attente',  style: 'bg-amber-100 text-amber-700' },
}
