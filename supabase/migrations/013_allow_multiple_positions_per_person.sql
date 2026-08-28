-- La base impose actuellement une contrainte unique (plan_id, user_id, team_id) qui
-- limite chaque personne à UNE SEULE affectation par équipe et par service — elle
-- empêche donc, par ex., d'être à la fois conducteur ET guitariste sur le même culte.
-- Cette contrainte n'apparaît dans aucune migration suivie ici : elle a été ajoutée
-- directement en base à un moment donné, hors du dépôt.
ALTER TABLE plan_assignments DROP CONSTRAINT IF EXISTS plan_assignments_plan_id_user_id_team_id_key;

-- On la remplace par une règle plus fine : une même personne ne peut pas occuper deux
-- fois le MÊME poste nommé sur un service (mais peut cumuler plusieurs postes différents).
CREATE UNIQUE INDEX IF NOT EXISTS plan_assignments_unique_position
  ON plan_assignments (plan_id, user_id, position_id)
  WHERE position_id IS NOT NULL;

-- Pour les équipes SANS postes nommés (position_id toujours NULL, ex : Accueil, Café),
-- où il n'y a pas de rôle à distinguer, on garde la règle « un seul rôle par équipe ».
CREATE UNIQUE INDEX IF NOT EXISTS plan_assignments_unique_team_no_position
  ON plan_assignments (plan_id, user_id, team_id)
  WHERE position_id IS NULL;
