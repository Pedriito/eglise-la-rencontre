import WaveDivider from "../WaveDivider";

const horaires = [
  {
    jour: "Dimanche",
    titre: "Culte",
    heures: "10h00 – 12h00",
    detail: "Accueil dès 9h45",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
  },
  {
    jour: "Mardi",
    titre: "Réunion de prière",
    heures: "20h30 – 21h30",
    detail: "Venez prier ensemble",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

export default function Horaires() {
  return (
    <section id="horaires" className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <p className="font-sans text-xs tracking-[0.3em] uppercase text-teal mb-3">
          Rejoignez-nous
        </p>
        <h2 className="font-display text-4xl md:text-5xl font-light text-dark mb-1">
          Horaires
        </h2>
        <WaveDivider color="#5A9EA6" className="mb-2" />

        <div className="grid md:grid-cols-2 gap-8">
          {horaires.map((h) => (
            <div
              key={h.jour}
              className="border border-teal-light rounded-sm p-8 text-left hover:border-teal transition-colors"
            >
              <div className="text-teal mb-4">{h.icon}</div>
              <p className="font-sans text-xs tracking-[0.25em] uppercase text-teal mb-2">
                {h.jour}
              </p>
              <h3 className="font-display text-2xl font-semibold text-dark mb-1">
                {h.titre}
              </h3>
              <p className="font-display text-xl text-teal-dark font-light mb-2">
                {h.heures}
              </p>
              <p className="font-sans text-sm text-dark/50">{h.detail}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 font-sans text-sm text-dark/50">
          441, avenue Marguerite Perrey · 77127 Lieusaint
        </p>
      </div>
    </section>
  );
}
