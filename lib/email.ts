import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) throw new Error(`RESEND_API_KEY manquante ou vide (env: ${Object.keys(process.env).filter(k => k.includes('RESEND')).join(', ') || 'aucune clé RESEND trouvée'})`)
  return new Resend(key)
}

export async function sendInviteEmail({
  to,
  firstName,
  inviteLink,
}: {
  to: string
  firstName: string
  inviteLink: string
}) {
  const resend = getResend()
  await resend.emails.send({
    from: 'Église La Rencontre <no-reply@egliselarencontre.fr>',
    to,
    subject: 'Tu es invité(e) — Église La Rencontre',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2e2e;">
        <p style="margin-bottom:8px;">Bonjour ${firstName},</p>
        <p style="margin-bottom:24px;">
          Tu as été invité(e) à rejoindre l'espace bénévoles de l'<strong>Église La Rencontre</strong>.
          Clique sur le bouton ci-dessous pour créer ton mot de passe et accéder à ton espace.
        </p>
        <a href="${inviteLink}"
           style="display:inline-block;background:#3D7D85;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Créer mon mot de passe →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999;">
          Église La Rencontre · Lieusaint<br>
          Si tu n'es pas concerné(e) par ce message, ignore-le.
        </p>
      </div>
    `,
  })
}

export async function sendPlanAssignmentEmail({
  to,
  firstName,
  planTitle,
  serviceDate,
  positionName,
  assignmentId,
}: {
  to: string
  firstName: string
  planTitle: string
  serviceDate: string
  positionName: string | null
  assignmentId: string
}) {
  const date = new Date(serviceDate).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const time = new Date(serviceDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.egliselarencontre.fr'
  const resend = getResend()

  await resend.emails.send({
    from: 'Église La Rencontre <no-reply@egliselarencontre.fr>',
    to,
    subject: `Tu es planifié(e) : ${planTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2e2e;">
        <p style="margin-bottom:8px;">Bonjour ${firstName},</p>
        <p style="margin-bottom:16px;">Tu as été planifié(e) pour le service suivant :</p>

        <div style="background:#f0faf9;border-radius:10px;padding:18px 20px;margin-bottom:20px;border-left:4px solid #0d9488;">
          <p style="margin:0;font-size:16px;font-weight:600;">${planTitle}</p>
          <p style="margin:6px 0 0;color:#555;font-size:14px;text-transform:capitalize;">${date} à ${time}</p>
          ${positionName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Rôle : ${positionName}</p>` : ''}
        </div>

        <p style="margin-bottom:20px;">
          Merci de confirmer ou décliner ta disponibilité :
        </p>

        <div style="display:flex;gap:12px;margin-bottom:24px;">
          <a href="${siteUrl}/benevoles/repondre/${assignmentId}?status=confirmed"
             style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            ✓ Je confirme
          </a>
          <a href="${siteUrl}/benevoles/repondre/${assignmentId}?status=declined"
             style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            ✕ Je décline
          </a>
        </div>

        <a href="${siteUrl}/benevoles/dashboard"
           style="display:inline-block;color:#0d9488;font-size:13px;text-decoration:underline;">
          Accéder à mon espace bénévole
        </a>

        <p style="margin-top:32px;font-size:12px;color:#999;">
          Église La Rencontre · Lieusaint<br>
          Si tu n'es pas concerné(e) par ce message, ignore-le.
        </p>
      </div>
    `,
  })
}
