-- Ajoute des attributs booléens aux équipes pour remplacer la logique basée sur les noms
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS allows_guests     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_coordination   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_positions    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_prayer_meeting boolean NOT NULL DEFAULT false;

-- Backfill pour les équipes connues (church_id = église par défaut)
UPDATE teams SET allows_guests = true  WHERE name IN ('Prédicateurs', 'Louange');
UPDATE teams SET is_prayer_meeting = true WHERE name IN ('Prédicateurs', 'Louange', 'Production');
UPDATE teams SET is_coordination = true   WHERE name = 'Coordination des célébrations';
UPDATE teams SET hide_positions = true    WHERE name = 'Prédicateurs';
