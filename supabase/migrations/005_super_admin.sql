-- Ajouter super_admin à la contrainte de permission
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_permission_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_permission_check
  CHECK (permission IN ('admin', 'editor', 'viewer', 'super_admin'));

-- Contrainte unique sur church_settings.church_id (nécessaire pour upsert onConflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'church_settings_church_id_unique'
  ) THEN
    ALTER TABLE church_settings ADD CONSTRAINT church_settings_church_id_unique UNIQUE (church_id);
  END IF;
END $$;

-- Passer Nicolas en super_admin
UPDATE profiles
SET permission = 'super_admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'nicolas.salafranque@egliselarencontre.fr'
);
