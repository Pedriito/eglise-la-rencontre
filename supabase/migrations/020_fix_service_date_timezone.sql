-- Migration 020 : correction du fuseau horaire de plans.service_date
--
-- Bug corrigé côté code dans app/benevoles/admin/plans/actions.ts (voir lib/timezone.ts,
-- parisLocalToUtcIso) : toutes les écritures de service_date envoyaient une heure locale
-- "naïve" (ex: "2026-09-20T10:00", sans fuseau) directement dans cette colonne timestamptz.
-- Postgres l'interprétait comme de l'UTC : un service saisi à 10h était stocké comme 10h UTC,
-- puis correctement reconverti à l'affichage vers l'heure de Paris → 11h (CET, hiver) ou
-- 12h (CEST, été) au lieu de 10h.
--
-- Cette requête réinterprète chaque service_date déjà stockée comme si elle représentait en
-- réalité une heure de Paris (double conversion AT TIME ZONE), ce qui restitue le bon instant
-- UTC pour l'heure de Paris réellement voulue.
--
-- ⚠️ À exécuter UNE SEULE FOIS, et seulement APRÈS le déploiement du correctif de code
-- ci-dessus (sinon les plans créés après coup, déjà corrects, seraient re-décalés à tort).
-- Non idempotente : ne pas rejouer cette migration sur des lignes déjà corrigées.

update plans
set service_date = (service_date at time zone 'UTC' at time zone 'Europe/Paris');
