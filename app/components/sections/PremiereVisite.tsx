import WaveDivider from "../WaveDivider"
import { getChurchSettings } from "@/lib/churchSettings"

const items = [
  {
    icon: (
      <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    question: "Combien de temps dure le culte ?",
    answer: "Environ 2 heures. Un temps de louange, une prédication et un moment de convivialité après le culte.",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    question: "Comment s'habiller ?",
    answer: "Venez comme vous êtes — vraiment. Certains viennent en costume, d'autres en jean. Personne ne vous jugera.",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 1-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    question: "Comment venir & se garer ?",
    answer: "Des places de parking sont disponibles devant et autour de la salle. Venez sans vous inquiéter.",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    question: "Et pour les enfants ?",
    answer: "Un temps dédié aux enfants est organisé pendant le culte. Ils sont les bienvenus et pris en charge avec amour.",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    question: "Faut-il s'inscrire ou prévenir ?",
    answer: "Non, pas du tout. Poussez simplement la porte — vous serez accueillis chaleureusement.",
  },
]

export default async function PremiereVisite() {
  const s = await getChurchSettings()

  return (
    <section id="premiere-visite" className="py-24 px-6 bg-teal-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="font-sans text-xs tracking-[0.3em] uppercase text-teal mb-3">Votre première visite</p>
          <h2 className="font-display text-4xl md:text-5xl font-light text-dark">À quoi s'attendre ?</h2>
          <WaveDivider color="#5A9EA6" className="mt-4" />
          <p className="font-sans text-sm text-dark/50 mt-6 max-w-lg mx-auto leading-relaxed">
            Vous n'êtes jamais venu dans une église évangélique ? Voici les réponses aux questions que tout le monde se pose.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {items.map((item) => (
            <div key={item.question} className="bg-white rounded-sm border border-teal/20 p-6">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-dark mb-1.5">{item.question}</p>
                  <p className="font-sans text-sm text-dark/60 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="font-display text-xl text-dark/70 font-light italic mb-6">
            « Venez voir. »
          </p>
          <a
            href={`mailto:${s.email}`}
            className="inline-flex items-center gap-2 font-sans text-sm tracking-widest uppercase text-teal hover:text-teal-dark transition-colors border border-teal/40 px-6 py-3 hover:border-teal/70"
          >
            Une question ? Contactez-nous
          </a>
        </div>
      </div>
    </section>
  )
}
