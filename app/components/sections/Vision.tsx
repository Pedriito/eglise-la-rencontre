import WaveDivider from "../WaveDivider"

export default function Vision() {
  return (
    <section id="vision" className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="font-sans text-xs tracking-[0.3em] uppercase text-teal mb-3">Qui sommes-nous</p>
          <h2 className="font-display text-4xl md:text-5xl font-light text-dark">Notre histoire & notre vision</h2>
          <WaveDivider color="#5A9EA6" className="mt-4" />
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="font-sans text-base text-dark/70 leading-relaxed">
              Église La Rencontre est née d'une conviction simple&nbsp;: chacun mérite un lieu où il est accueilli
              tel qu'il est, où il peut poser ses questions, grandir dans la foi et trouver une famille.
            </p>
            <p className="font-sans text-base text-dark/70 leading-relaxed">
              Enracinés à Lieusaint, nous croyons que l'Évangile change les vies — et nous voulons en être
              les témoins dans notre quartier, notre ville, et au-delà.
            </p>
            <div className="pt-2 space-y-3">
              {[
                'Authenticité — venir comme on est',
                'Communauté — ensemble, pas seul',
                'Foi vivante — une rencontre réelle avec Dieu',
              ].map(v => (
                <div key={v} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                  <span className="font-sans text-sm text-dark/70">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Placeholder photo — à remplacer par une vraie photo de l'assemblée */}
          <div className="bg-teal-50 rounded-sm aspect-[4/3] flex items-center justify-center border border-teal/20">
            <p className="font-sans text-xs text-dark/30 tracking-widest uppercase">Photo à venir</p>
          </div>
        </div>
      </div>
    </section>
  )
}
