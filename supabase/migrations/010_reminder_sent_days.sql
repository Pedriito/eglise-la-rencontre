-- Trace les jours auxquels un rappel a déjà été envoyé pour chaque affectation
-- Sert à éviter les doublons si le cron tourne plusieurs fois le même jour
ALTER TABLE plan_assignments
  ADD COLUMN IF NOT EXISTS reminder_sent_days integer[] NOT NULL DEFAULT '{}';
