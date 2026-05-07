import WaveDivider from "../WaveDivider";

const videos = [
  {
    id: "aR9ZkmRe0w8",
    titre: "Culte du 3 mai 2026",
  },
  {
    id: "zQikIyM9Dlc",
    titre: "Culte du 26 avril 2026",
  },
  {
    id: "eB31HHhTTwk",
    titre: "Culte du 5 avril 2026",
  },
];

export default function Cultes() {
  return (
    <section id="cultes" className="py-24 px-6 bg-teal-50">
      <div className="max-w-5xl mx-auto text-center">
        <p className="font-sans text-xs tracking-[0.3em] uppercase text-teal mb-3">
          En ligne
        </p>
        <h2 className="font-display text-4xl md:text-5xl font-light text-dark mb-1">
          Nos cultes
        </h2>
        <WaveDivider color="#5A9EA6" className="mb-1" />
        <p className="font-sans text-sm text-dark/50 mb-12">
          Retrouvez tous nos cultes sur notre chaîne YouTube
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {videos.map((v, i) => (
            <div key={i} className="aspect-video bg-teal-light rounded-sm overflow-hidden shadow-sm">
              <iframe
                src={`https://www.youtube.com/embed/${v.id}`}
                title={v.titre}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ))}
        </div>

        <a
          href="https://www.youtube.com/@eglise.larencontre"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-sans text-sm tracking-widest uppercase text-teal hover:text-teal-dark transition-colors"
        >
          Voir toutes les vidéos
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </section>
  );
}
