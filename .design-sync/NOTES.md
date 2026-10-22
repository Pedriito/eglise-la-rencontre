# Notes de synchronisation — @eglise/ui

## Paramètres de lancement

- Construire le paquet avant le convertisseur : `npm run build -w @eglise/ui`.
- `--node-modules ./node_modules` — **la racine du dépôt**, pas `packages/ui/node_modules` :
  React est hoisté par npm et n'existe pas dans le paquet.
- `--entry ./packages/ui/dist/index.js`.
- Playwright vit dans `.ds-sync/` (chromium-headless-shell 1243). Il n'y avait ni cache
  système ni Chromium installé avant cette synchronisation.

## Pièges rencontrés, et leur correctif

- **`preview-rebuild.mjs` ne régénère PAS `_ds_bundle.css`.** Toute classe Tailwind
  introduite dans un aperçu reste sans effet — *silencieusement*, sans erreur, juste une
  mise en page effondrée — jusqu'à un `package-build.mjs` complet. En fan-out, cela signifie
  qu'une vague qui invente des classes produit des captures mensongères. **Toujours
  reconstruire entièrement puis recapturer avant de noter quoi que ce soit.**
- **Les aperçus vivent hors du paquet**, dans `.design-sync/previews/`. Sans la directive
  `@source "../../../../.design-sync/previews"` dans `packages/ui/src/styles/index.css`,
  Tailwind n'analyse pas ces fichiers : les composants s'affichent corrects mais sans aucune
  mise en page, et les cellules sur fond coloré sortent vides.
- **Les polices ne sont pas dans le paquet.** `--font-sans` et `--font-display` pointaient
  vers `var(--font-inter)` / `var(--font-cormorant)`, injectées par next/font dans
  l'application et définies nulle part ailleurs. Les jetons portent désormais un nom de
  famille en repli, et `index.css` charge Inter et Cormorant Garamond depuis Google Fonts.
- **Tailwind n'émet que ce qu'il rencontre.** La moitié de la palette de marque
  (`bg-teal-dark`, `text-coral`, `bg-teal-light`…) était absente du CSS livré. D'où
  `packages/ui/src/styles/vocabulary.txt`, qui les énumère pour forcer leur compilation.
  **Toute couleur ajoutée à `tokens.css` doit aussi y être listée**, sinon elle existera
  comme jeton sans jamais produire de classe utilisable.
- `ErrorText` a une cellule plus large que sa case : réglé par
  `overrides.ErrorText.cardMode = "column"` dans la configuration.
- Les composants minuscules (`IconButton`, `CloseButton`) rendus seuls produisent une image
  quasi vide et sont signalés défaillants. Les composer **dans leur contexte réel** —
  en-tête de modale, ligne de liste, barre d'actions.

## Vérifications non concluantes

- Une vague a signalé que les cartes pointaient vers un `styles.css` absent (404).
  **Vérifié : faux.** Le fichier existe bien à `../../../styles.css` depuis
  `components/<groupe>/<Nom>/`. Ne pas « corriger » ce non-problème.

## Risques pour les prochaines synchronisations

- **`vocabulary.txt` est une liste tenue à la main.** Elle se désynchronisera de `tokens.css`
  dès qu'une couleur sera ajoutée d'un côté sans l'autre. Le symptôme est muet : la classe
  ne produit rien. À recouper à chaque évolution de la palette.
- **Les polices sont chargées par requête distante** (`@import` vers Google Fonts) dans la
  feuille autonome. Un rendu hors ligne retombera sur les familles de repli.
- **Le CSS du paquet contient des utilitaires qui ne servent qu'aux aperçus** (`grid`,
  `divide-y`, `bg-ink`…), conséquence du `@source` vers `previews/`. C'est délibéré : ces
  utilitaires servent aussi à l'agent de design pour composer ses propres écrans. Ne pas
  les prendre pour du superflu à élaguer.
- **Le dépliage du dépôt suppose un workspace npm.** Le paquet se construit via le script
  racine (`npm run build` compile `@eglise/ui` avant l'application) et via `prepare` à
  l'installation. `dist/` n'est pas versionné : tout chemin qui contourne ces deux scripts
  trouvera un paquet vide.
- **Aucune police n'est embarquée dans le paquet** (pas de `.woff2`). Si un jour le rendu
  hors ligne devient nécessaire, il faudra les copier et passer par `cfg.extraFonts`.
- Les 13 aperçus sont écrits à la main dans `.design-sync/previews/` et versionnés : le
  convertisseur ne les touche jamais. Ils restent valables tant que l'API des composants
  ne change pas ; une propriété renommée les laisse compiler mais rend la démonstration
  fausse.
