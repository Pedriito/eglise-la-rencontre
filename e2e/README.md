# E2E — indisponibilités et planification

Vérifie, **sur desktop, iPhone (WebKit, PWA installée) et Android**, qu'une indisponibilité déclarée
par un bénévole empêche toujours de le planifier sur ces dates — par tous les chemins : bouton
desktop, formulaires mobiles, auto-remplissage, rôle DM, glisser-déposer d'un service, requêtes
forgées, pages périmées, et directement en base.

Tout tourne sur une base **locale** (`127.0.0.1:55422`), jamais sur la production.

## Lancer

```bash
cd e2e
./scripts/setup.sh              # base locale + données de test + migration 022
./scripts/start-app.sh          # build de production sur http://localhost:3100  (terminal séparé)
npx playwright test             # 3 appareils × ~30 scénarios + garde-fou base de données
node summarize.mjs results.json # matrice ✅/❌ par appareil
npx playwright show-report report
```

Comparer avant/après un correctif : `./scripts/start-app.sh <commit>` lance le code d'un commit.
`./scripts/setup.sh --sans-022` retire le trigger pour vérifier que la spec `db-garde-fou` le détecte.

## Ce qui est couvert

| Bloc | Contenu |
|---|---|
| 1 | Déclaration par le bénévole (1 jour, période, fin < début) + parcours complet mobile → admin |
| 2 | Bornes (veille, lendemain, jour J, 1er/dernier jour, englobante), plusieurs indispos, autre bénévole, équipe sans poste, formulaire du bas, workspace desktop, éditeur |
| 3 | Contournements : indispo posée pendant que la page est ouverte ; option mobile réactivée à la main |
| 4 | Minuit heure de Paris (00h30 hiver, 01h30 été, 23h30 la veille), > 1000 indispos, bénévole sans église |
| 5 | Auto-remplissage : jamais proposé (titulaire ni alternatives) ; indispo posée entre « Générer » et « Valider » |
| 6 | Rôle DM, glisser-déposer d'un service, « Planifier une autre date », alerte sur un affecté devenu indisponible |
| 7–8 | Garde-fou base de données (migration 022) : insertion, UPDATE, lot atomique, bornes, minuit, déplacement de service |

Les comptes de test (`seed.mjs`) partagent un mot de passe de démonstration ; la base est réinitialisée
(plans, affectations, indispos) avant chaque test.

`supabase/migrations/…_base_schema.sql` est une **reconstruction** du schéma à partir du dépôt
(`supabase/schema.sql`, `blockout_dates.sql`, migrations 005→021 et colonnes utilisées par le code),
pas un dump de production.
