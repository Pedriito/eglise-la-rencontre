import WaveDivider from "../WaveDivider"
import { getChurchSettings } from "@/lib/churchSettings"

export default async function Footer() {
  const s = await getChurchSettings()

  return (
    <footer className="bg-dark text-white py-12 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <WaveDivider color="rgba(255,255,255,0.2)" className="mb-6" />
        <p className="font-display text-lg font-light tracking-[0.15em] uppercase mb-2">
          {s.church_name}
        </p>
        <p className="font-sans text-xs text-white/40 mb-6">
          {s.address_street} · {s.address_zip} {s.address_city} · {s.address_dept}
        </p>
        <div className="flex justify-center gap-6">
          {s.youtube_url && (
            <a
              href={s.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs tracking-widest uppercase text-white/40 hover:text-white/80 transition-colors"
            >
              YouTube
            </a>
          )}
          <a
            href={`mailto:${s.email}`}
            className="font-sans text-xs tracking-widest uppercase text-white/40 hover:text-white/80 transition-colors"
          >
            Email
          </a>
        </div>
        <p className="font-sans text-xs text-white/20 mt-8">
          © {new Date().getFullYear()} {s.church_name}
        </p>
      </div>
    </footer>
  )
}
