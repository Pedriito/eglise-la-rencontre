import WaveDivider from "../WaveDivider";

export default function Footer() {
  return (
    <footer className="bg-dark text-white py-12 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <WaveDivider color="rgba(255,255,255,0.2)" className="mb-6" />
        <p className="font-display text-lg font-light tracking-[0.15em] uppercase mb-2">
          Église La Rencontre
        </p>
        <p className="font-sans text-xs text-white/40 mb-6">
          441, av. Marguerite Perrey · 77127 Lieusaint · Seine-et-Marne
        </p>
        <div className="flex justify-center gap-6">
          <a
            href="https://www.youtube.com/@eglise.larencontre"
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-xs tracking-widest uppercase text-white/40 hover:text-white/80 transition-colors"
          >
            YouTube
          </a>
          <a
            href="mailto:contact@egliselarencontre.fr"
            className="font-sans text-xs tracking-widest uppercase text-white/40 hover:text-white/80 transition-colors"
          >
            Email
          </a>
        </div>
        <p className="font-sans text-xs text-white/20 mt-8">
          © {new Date().getFullYear()} Église La Rencontre
        </p>
      </div>
    </footer>
  );
}
