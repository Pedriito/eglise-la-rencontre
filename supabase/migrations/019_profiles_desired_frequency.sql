-- Migration 019 : fréquence de service souhaitée par le bénévole
-- Réglée par le bénévole lui-même depuis son profil (contrairement à team_members.frequency,
-- qui est par équipe et réglée par un admin). Mêmes valeurs, réutilisées telles quelles.
-- NULL = aucune préférence indiquée.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_frequency text
  CHECK (desired_frequency IN ('as_needed','twice_month','every_6_weeks','monthly','weekly'));
