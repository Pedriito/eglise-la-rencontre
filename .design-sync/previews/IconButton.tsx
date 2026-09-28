import { IconButton, SectionHeader, Badge, Card } from '@eglise/ui'

/* Icônes locales à l’aperçu : le paquet n’embarque pas de jeu d’icônes, chaque
 * application fournit les siennes. Le trait suit `currentColor`, donc le `tone`
 * du bouton pilote la couleur. */
type IconProps = { s?: number }

const IconCorbeille = ({ s = 16 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: s, height: s }} aria-hidden="true">
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.9 12.5h9.2L17.5 7M10 11v5.5M14 11v5.5" />
  </svg>
)

const IconEnveloppe = ({ s = 16 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: s, height: s }} aria-hidden="true">
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m4 8 8 5.5L20 8" />
  </svg>
)

const IconCrayon = ({ s = 16 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: s, height: s }} aria-hidden="true">
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14.5 6.5l3 3" />
  </svg>
)

const IconPlus = ({ s = 16 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: s, height: s }} aria-hidden="true">
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
)

const IconPoints = ({ s = 16 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: s, height: s }} aria-hidden="true">
    <circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" />
  </svg>
)

/** L’usage dominant : au bout d’une ligne de bénévole, deux actions discrètes —
 *  relancer l’invitation, puis retirer l’affectation en ton `danger`. Le bouton
 *  ne prend sa mesure qu’à l’intérieur de cette ligne. */
export function LigneDeBenevole() {
  const lignes = [
    { nom: 'Marie Lefèvre', poste: 'Piano', pastille: 'bg-green-500' },
    { nom: 'Jean Dubois', poste: 'Basse', pastille: 'bg-amber-400' },
    { nom: 'Sarah Nguyen', poste: 'Ingé son', pastille: 'bg-red-400' },
  ]
  return (
    <div className="max-w-md">
      <Card>
        <div className="flex items-center justify-between border-b border-teal/10 px-4 py-3">
          <SectionHeader>Louange</SectionHeader>
          <Badge tone="orange">À pourvoir</Badge>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {lignes.map(l => (
            <div key={l.nom} className="flex items-center gap-3 rounded-xl bg-teal/5 px-3.5 py-2.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.pastille}`} />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm text-dark">{l.nom}</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">{l.poste}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <IconButton size="sm" aria-label={`Renvoyer l’invitation à ${l.nom}`}><IconEnveloppe s={14} /></IconButton>
                <IconButton size="sm" tone="danger" aria-label={`Retirer ${l.nom} de l’équipe`}><IconCorbeille s={14} /></IconButton>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/** Dans un en-tête de carte, le bouton icône porte les actions de la section
 *  sans concurrencer l’intitulé : ajouter un bénévole, ouvrir le menu. */
export function EnTeteDeCarte() {
  return (
    <div className="max-w-md">
      <Card>
        <div className="flex items-center justify-between border-b border-teal/10 px-4 py-3">
          <div className="min-w-0">
            <SectionHeader>Accueil</SectionHeader>
            <p className="font-sans text-sm text-dark mt-0.5">Culte du dimanche · 12 octobre</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <IconButton aria-label="Ajouter un bénévole à l’accueil"><IconPlus /></IconButton>
            <IconButton aria-label="Options de l’équipe Accueil"><IconPoints /></IconButton>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {['Sarah Nguyen · Hôte', 'Jean Dubois · Hôte'].map(l => (
            <div key={l} className="rounded-xl bg-teal/5 px-3.5 py-2.5 font-sans text-sm text-dark">{l}</div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/** Les trois tailles, chacune dans le contexte qui l’appelle : la ligne de
 *  liste, la barre d’actions d’une carte, l’en-tête de page. La cible tactile
 *  grandit, le trait de l’icône reste constant. */
export function Tailles() {
  return (
    <div className="max-w-md flex flex-col gap-3">
      <div>
        <SectionHeader className="mb-1.5">sm — au bout d’une ligne de liste</SectionHeader>
        <div className="flex items-center gap-3 rounded-xl bg-teal/5 px-3.5 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-500" />
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm text-dark">Marie Lefèvre</p>
            <p className="font-sans text-xs text-dark/40 mt-0.5">Piano</p>
          </div>
          <IconButton size="sm" aria-label="Retirer Marie Lefèvre de l’équipe"><IconCorbeille s={14} /></IconButton>
        </div>
      </div>
      <div>
        <SectionHeader className="mb-1.5">md — dans une barre d’actions</SectionHeader>
        <div className="flex items-center justify-between rounded-xl border border-teal/20 bg-white px-4 py-3">
          <div className="min-w-0">
            <SectionHeader>Accueil</SectionHeader>
            <p className="font-sans text-sm text-dark mt-0.5">2 bénévoles affectés</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <IconButton aria-label="Ajouter un bénévole à l’accueil"><IconPlus /></IconButton>
            <IconButton aria-label="Options de l’équipe Accueil"><IconPoints /></IconButton>
          </div>
        </div>
      </div>
      <div>
        <SectionHeader className="mb-1.5">lg — dans un en-tête de page</SectionHeader>
        <div className="flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3">
          <div className="min-w-0">
            <SectionHeader>Dimanche 12 octobre</SectionHeader>
            <p className="font-sans text-lg text-dark leading-tight mt-0.5">Culte du dimanche</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <IconButton size="lg" aria-label="Modifier le plan de culte"><IconCrayon s={18} /></IconButton>
            <IconButton size="lg" aria-label="Options du plan de culte"><IconPoints s={18} /></IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Les trois tons, posés sur le fond qui leur correspond. `danger` ne colore
 *  qu’au survol : au repos, une action destructrice reste aussi discrète que
 *  les autres. */
export function Tons() {
  return (
    <div className="max-w-md flex flex-col gap-3">
      <div>
        <SectionHeader className="mb-1.5">default</SectionHeader>
        <div className="flex items-center justify-between rounded-xl border border-teal/20 bg-white px-4 py-3">
          <p className="font-sans text-sm text-dark">Culte du dimanche · 10:00</p>
          <IconButton aria-label="Modifier le service"><IconCrayon /></IconButton>
        </div>
      </div>
      <div>
        <SectionHeader className="mb-1.5">danger</SectionHeader>
        <div className="flex items-center justify-between rounded-xl border border-teal/20 bg-white px-4 py-3">
          <p className="font-sans text-sm text-dark">Jean Dubois · Batterie</p>
          <IconButton tone="danger" aria-label="Retirer Jean Dubois de l’équipe"><IconCorbeille /></IconButton>
        </div>
      </div>
      <div>
        <SectionHeader className="mb-1.5">onDark</SectionHeader>
        <div className="flex items-center justify-between rounded-xl bg-ink px-4 py-3">
          <p className="font-sans text-sm text-white">Répétition · jeudi 20:00</p>
          <IconButton tone="onDark" aria-label="Options de la répétition"><IconPoints /></IconButton>
        </div>
      </div>
    </div>
  )
}

/** Barre d’outils de la colonne d’administration, sur fond sombre : le ton
 *  `onDark` garde les icônes lisibles sans les rendre criardes. */
export function BarreSombre() {
  return (
    <div className="max-w-md rounded-2xl bg-ink overflow-hidden">
      <div className="flex items-center justify-between border-b border-dark/10 px-4 py-3">
        <div className="min-w-0">
          <SectionHeader tone="onDark">Production</SectionHeader>
          <p className="font-sans text-sm text-white mt-0.5">4 bénévoles affectés</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <IconButton tone="onDark" aria-label="Ajouter un bénévole à la production"><IconPlus /></IconButton>
          <IconButton tone="onDark" aria-label="Relancer les invitations en attente"><IconEnveloppe /></IconButton>
          <IconButton tone="onDark" aria-label="Options de l’équipe Production"><IconPoints /></IconButton>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {['Marie Lefèvre · Régie', 'Sarah Nguyen · Caméra'].map(l => (
          <div key={l} className="rounded-xl bg-white/10 px-3.5 py-2.5 font-sans text-sm text-white">{l}</div>
        ))}
      </div>
    </div>
  )
}
