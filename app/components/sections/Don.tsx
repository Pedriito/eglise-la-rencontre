import WaveDivider from "../WaveDivider";
import Link from "next/link";

export default function Don() {
  return (
    <section id="don" className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <p className="font-sans text-xs tracking-[0.3em] uppercase text-teal mb-3">
          Soutenir l'église
        </p>
        <h2 className="font-display text-4xl md:text-5xl font-light text-dark mb-1">
          Faire un don
        </h2>
        <WaveDivider color="#5A9EA6" className="mb-8" />

        <p className="font-sans text-base text-dark/60 leading-relaxed max-w-2xl mx-auto mb-4">
          Vos dons permettent de soutenir le ministère de l'Église La Rencontre,
          d'organiser les cultes et les événements, et d'aider ceux qui en ont besoin.
        </p>
        <p className="font-sans text-sm text-dark/40 mb-10">
          Les dons sont déductibles des impôts à hauteur de 66 % pour les particuliers
          (dans la limite de 20 % du revenu imposable).
        </p>

        <Link
          href="/don"
          className="inline-block bg-teal text-white font-sans text-sm font-medium px-8 py-4 rounded-lg hover:bg-teal-dark transition-colors"
        >
          Faire un don →
        </Link>
      </div>
    </section>
  );
}
