-- Permet à un poste d'accepter plusieurs bénévoles simultanément (ex : Chorale, Choriste)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS allow_multiple boolean NOT NULL DEFAULT false;

UPDATE positions SET allow_multiple = true WHERE name IN ('Chorale', 'Choriste');
