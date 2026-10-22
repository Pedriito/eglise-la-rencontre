-- Migration 021 : masquer un poste sans le supprimer (préserve l'historique des affectations)
--
-- NULL/false = poste visible normalement (comportement actuel, rétrocompatible).
-- true = poste masqué des créneaux à pourvoir (admin, auto-remplissage) mais conservé en base ;
-- les affectations déjà enregistrées sur ce poste restent affichées telles quelles.

ALTER TABLE positions ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Masque "Ordi - clic/track" (équipe Louange), plus utilisé.
UPDATE positions
SET archived = true
WHERE name = 'Ordi - clic/track'
  AND team_id IN (SELECT id FROM teams WHERE name = 'Louange');
