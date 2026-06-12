import type { Metadata } from 'next'
import Navbar from '../components/Navbar'
import Footer from '../components/sections/Footer'
import { getChurchSettings } from '@/lib/churchSettings'

export const metadata: Metadata = {
  title: 'Faire un don — Église La Rencontre',
  description: 'Soutenez le ministère de l\'Église La Rencontre à Lieusaint en faisant un don. Dons déductibles des impôts.',
}

export default async function DonPage() {
  const s = await getChurchSettings()

  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen bg-teal-50">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <p className="font-sans text-xs tracking-[0.3em] uppercase text-teal mb-3">
              Soutenir l'église
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-light text-dark mb-4">
              Faire un don
            </h1>
            <p className="font-sans text-sm text-dark/50 max-w-xl mx-auto leading-relaxed">
              Vos dons soutiennent le développement de {s.church_name} et permettent
              d'organiser les cultes et les événements.
              Ils sont déductibles des impôts à hauteur de <strong>{s.tax_deduction_pct} %</strong>.
            </p>
          </div>

          {/* Widget HelloAsso */}
          <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden shadow-sm">
            <iframe
              id="haWidget"
              allowTransparency={true}
              scrolling="auto"
              src={s.helloasso_widget_url}
              style={{ width: '100%', height: '750px', border: 'none' }}
              title={`Formulaire de don — ${s.church_name}`}
            />
          </div>

          <p className="text-center mt-6 text-xs text-dark/30 font-sans">
            Paiement sécurisé via{' '}
            <a
              href="https://www.helloasso.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal transition-colors"
            >
              HelloAsso
            </a>
            {' '}· Reçu fiscal envoyé automatiquement
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
