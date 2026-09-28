# Design system — Église La Rencontre

Bibliothèque de l'espace bénévoles d'une église : planification des services, affectation
des équipes, gestion des chants. Interface **en français** — libellés, messages et contenus
d'exemple doivent l'être aussi.

## Aucun fournisseur de contexte à installer

Les composants sont purement présentationnels : ni contexte React, ni thème à injecter, ni
racine à envelopper. On les importe et on les utilise directement. Une seule condition :
`styles.css` doit être chargé — il apporte les jetons, les polices (Inter et Cormorant
Garamond) et les styles des composants.

## L'idiome : classes utilitaires Tailwind

Les composants portent leur propre apparence. Pour tout le reste — mise en page, espacement,
couleurs de tes propres blocs — utilise les classes utilitaires ci-dessous. **Elles sont
garanties présentes dans la feuille livrée** ; une classe de marque inventée hors de cette
liste ne produirait aucun style.

| Famille | Noms disponibles |
|---|---|
| Fonds | `bg-teal` `bg-teal-dark` `bg-teal-light` `bg-teal-50` `bg-sand` `bg-ink` `bg-ink-light` `bg-coral` `bg-white`, et les transparences `bg-teal/5` `bg-teal/10` `bg-dark/5` `bg-white/10` |
| Texte | `text-teal` `text-teal-dark` `text-dark` `text-ink` `text-coral` `text-white`, et les nuances `text-dark/40` `text-dark/60` `text-dark/70` `text-white/30` |
| Bordures | `border-teal` `border-coral` `border-dark`, et `border-teal/20` `border-teal/30` `border-dark/10` |
| Séparateurs | `divide-teal/10` `divide-dark/10` |
| Typographie | `font-sans` (Inter, courante) · `font-display` (Cormorant Garamond, titres) |
| Rayons | `rounded-lg` `rounded-xl` `rounded-2xl` `rounded-3xl` `rounded-full` |

Repères d'usage : `teal` est la couleur de marque et porte les actions principales ; `coral`
l'action mise en avant d'un en-tête, jamais deux fois sur un même écran ; `sand` et `teal-50`
sont des fonds de page ; `ink` le fond des barres de navigation sombres. Les titres de
section sont en majuscules espacées — c'est le rôle de `SectionHeader`, ne le réécris pas
à la main.

## Les composants

`Button` · `IconButton` · `CloseButton` · `Card` · `SectionHeader` · `Badge` · `EmptyState`
`TextField` · `Textarea` · `Select` · `FieldLabel` · `HelperText` · `ErrorText`

Trois fonctions accompagnent les composants : `buttonClasses()` et `fieldClasses()` rendent
les classes sans l'élément — utile pour donner l'apparence d'un bouton à un lien de
navigation — et `cx()` concatène des classes conditionnelles.

Deux règles que les composants appliquent et qu'il ne faut pas contourner : un `IconButton`
exige un `aria-label` (il n'a pas de texte visible), et les champs ne descendent jamais sous
16 px sur mobile (en-deçà, iOS zoome à la prise de focus).

## Où lire la vérité

Avant de styler, lis `_ds/<dossier>/styles.css` et les fichiers qu'il importe : c'est la
source exacte des jetons et des classes disponibles. Chaque composant a son
`<Nom>.prompt.md` avec ses propriétés réelles, et son `<Nom>.d.ts` comme contrat d'API.

## Exemple

```jsx
<Card>
  <div className="px-4 py-3 border-b border-teal/10 flex items-center justify-between">
    <SectionHeader>Louange</SectionHeader>
    <Badge tone="orange">À pourvoir</Badge>
  </div>
  <div className="divide-y divide-teal/10">
    <div className="px-4 py-3">
      <p className="font-sans text-sm text-dark">Marie Lefèvre</p>
      <p className="font-sans text-xs text-dark/40 mt-0.5">Conducteur de louange</p>
    </div>
  </div>
  <div className="px-4 py-3 border-t border-teal/10 flex justify-end gap-2">
    <Button variant="outline" size="sm">Annuler</Button>
    <Button size="sm">Affecter</Button>
  </div>
</Card>
```
