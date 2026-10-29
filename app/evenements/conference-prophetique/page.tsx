import type { Metadata } from 'next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/sections/Footer'

export const metadata: Metadata = {
  title: 'Conférence Prophétique — 16 & 17 octobre 2026 — Église La Rencontre',
  description: 'Rejoignez-nous les 16 et 17 octobre pour une conférence prophétique à l\'Église La Rencontre. Inscription gratuite via HelloAsso.',
  openGraph: {
    title: 'Conférence Prophétique — 16 & 17 octobre',
    description: 'Rejoignez-nous les 16 et 17 octobre pour une conférence prophétique à l\'Église La Rencontre.',
    url: 'https://egliselarencontre.fr/evenements/conference-prophetique',
    type: 'website',
  },
}

const HELLOASSO_URL = 'https://www.helloasso.com/associations/eglise-la-rencontre/evenements/conference-prophetique-16-17-oct-27'

export default function ConferenceProphetiqueePage() {
  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen bg-teal-50">
        {/* Hero de l'événement */}
        <section className="bg-white border-b border-teal/10">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <p className="font-sans text-xs tracking-[0.3em] uppercase text-teal mb-3">
              Événement
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-light text-dark mb-4 leading-tight">
              Conférence Prophétique
            </h1>

            {/* Dates */}
            <div className="inline-flex items-center gap-3 bg-teal/8 rounded-full px-5 py-2.5 mb-6">
              <span className="text-teal text-lg">📅</span>
              <span className="font-sans text-sm font-semibold text-teal">
                16 & 17 octobre 2026
              </span>
            </div>

            <p className="font-sans text-sm text-dark/50 max-w-xl mx-auto leading-relaxed">
              Deux jours pour explorer le don prophétique, écouter la voix de Dieu et
              être équipé pour le mettre en pratique dans votre vie et votre communauté.
            </p>
          </div>
        </section>

        {/* Widget d'inscription */}
        <section className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="font-display text-2xl font-light text-dark text-center mb-8">
            Inscription
          </h2>

          <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden shadow-sm">
            <iframe
              src={`${HELLOASSO_URL}/widget`}
              allowTransparency={true}
              scrolling="auto"
              style={{ width: '100%', height: '800px', border: 'none' }}
              title="Inscription — Conférence Prophétique"
            />
          </div>

          <p className="text-center mt-4 text-xs text-dark/30 font-sans">
            Inscription gérée via{' '}
            <a
              href={HELLOASSO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal transition-colors underline underline-offset-2"
            >
              HelloAsso
            </a>
            {' '}· Accès sécurisé
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
