import WaveDivider from "../WaveDivider"
import { getChurchSettings } from "@/lib/churchSettings"

type Video = { id: string; titre: string }

const FALLBACK: Video[] = [
  { id: "aR9ZkmRe0w8", titre: "Culte du 3 mai 2026" },
  { id: "zQikIyM9Dlc", titre: "Culte du 26 avril 2026" },
  { id: "eB31HHhTTwk", titre: "Culte du 5 avril 2026" },
]

// Résout l'ID de chaîne : priorité DB, puis découverte via oEmbed sur une vidéo connue
async function getChannelId(dbChannelId: string | null, seedVideoId: string): Promise<string | null> {
  if (dbChannelId) return dbChannelId

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${seedVideoId}&format=json`,
      { next: { revalidate: 60 * 60 * 24 * 30 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return (data.author_url as string)?.split('/channel/')?.[1]?.split(/[?/]/)[0] ?? null
  } catch {
    return null
  }
}

async function getLatestVideos(dbChannelId: string | null): Promise<Video[]> {
  const channelId = await getChannelId(dbChannelId, FALLBACK[0].id)
  if (!channelId) return FALLBACK

  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { next: { revalidate: 600 } }
    )
    if (!res.ok) return FALLBACK

    const xml = await res.text()
    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? []

    const videos = entries.slice(0, 3).map((entry): Video => {
      const id    = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? ''
      const raw   = entry.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() ?? ''
      const titre = raw
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      return { id, titre }
    }).filter(v => v.id)

    return videos.length > 0 ? videos : FALLBACK
  } catch {
    return FALLBACK
  }
}

export default async function Cultes() {
  const s = await getChurchSettings()
  const videos = await getLatestVideos(s.youtube_channel_id)

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
          {videos.map((v) => (
            <div key={v.id} className="aspect-video bg-teal-light rounded-sm overflow-hidden shadow-sm">
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

        {s.youtube_url && (
          <a
            href={s.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-sans text-sm tracking-widest uppercase text-teal hover:text-teal-dark transition-colors"
          >
            Voir toutes les vidéos
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        )}
      </div>
    </section>
  )
}
