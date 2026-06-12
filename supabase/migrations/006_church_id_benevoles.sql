-- Multi-tenancy phase 3b : church_id sur les tables bénévoles

-- S'assurer que l'église par défaut existe dans churches
INSERT INTO churches (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000010', 'Église La Rencontre', 'la-rencontre')
ON CONFLICT (id) DO NOTHING;

-- S'assurer que les profils sans church_id sont rattachés à l'église par défaut
UPDATE profiles
SET church_id = '00000000-0000-0000-0000-000000000010'
WHERE church_id IS NULL;

-- ── teams ──────────────────────────────────────────────────────
ALTER TABLE teams ADD COLUMN church_id UUID REFERENCES churches(id);
UPDATE teams SET church_id = '00000000-0000-0000-0000-000000000010';
ALTER TABLE teams ALTER COLUMN church_id SET NOT NULL;

-- ── plans ──────────────────────────────────────────────────────
ALTER TABLE plans ADD COLUMN church_id UUID REFERENCES churches(id);
UPDATE plans SET church_id = '00000000-0000-0000-0000-000000000010';
ALTER TABLE plans ALTER COLUMN church_id SET NOT NULL;

-- ── RLS : teams ────────────────────────────────────────────────
DROP POLICY "Bénévoles connectés peuvent lire" ON teams;
CREATE POLICY "Bénévoles voient les équipes de leur église" ON teams
  FOR SELECT USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
  );

-- ── RLS : positions (via teams) ────────────────────────────────
DROP POLICY "Bénévoles connectés peuvent lire" ON positions;
CREATE POLICY "Bénévoles voient les postes de leur église" ON positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN profiles p ON p.id = auth.uid()
      WHERE t.id = positions.team_id AND t.church_id = p.church_id
    )
  );

-- ── RLS : team_members (via teams) ────────────────────────────
DROP POLICY "Bénévoles connectés peuvent lire" ON team_members;
CREATE POLICY "Bénévoles voient les membres de leur église" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN profiles p ON p.id = auth.uid()
      WHERE t.id = team_members.team_id AND t.church_id = p.church_id
    )
  );

-- ── RLS : member_positions (via positions → teams) ─────────────
DROP POLICY "Bénévoles connectés peuvent lire" ON member_positions;
CREATE POLICY "Bénévoles voient les postes membres de leur église" ON member_positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM positions pos
      JOIN teams t ON t.id = pos.team_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE pos.id = member_positions.position_id AND t.church_id = p.church_id
    )
  );

-- ── RLS : plans ────────────────────────────────────────────────
DROP POLICY "Bénévoles connectés peuvent lire" ON plans;
CREATE POLICY "Bénévoles voient les plans de leur église" ON plans
  FOR SELECT USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
  );

-- ── RLS : plan_assignments (via plans) ────────────────────────
DROP POLICY "Bénévoles connectés peuvent lire" ON plan_assignments;
CREATE POLICY "Bénévoles voient les affectations de leur église" ON plan_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plans pl
      JOIN profiles p ON p.id = auth.uid()
      WHERE pl.id = plan_assignments.plan_id AND pl.church_id = p.church_id
    )
  );

-- ── RLS : plan_announcements (via plans) ──────────────────────
DROP POLICY "Authenticated users can read plan_announcements" ON plan_announcements;
CREATE POLICY "Bénévoles voient les annonces de leur église" ON plan_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plans pl
      JOIN profiles p ON p.id = auth.uid()
      WHERE pl.id = plan_announcements.plan_id AND pl.church_id = p.church_id
    )
  );

-- ── RLS : plan_sermons (via plans) ────────────────────────────
DROP POLICY "Authenticated users can read plan_sermons" ON plan_sermons;
CREATE POLICY "Bénévoles voient les prédications de leur église" ON plan_sermons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plans pl
      JOIN profiles p ON p.id = auth.uid()
      WHERE pl.id = plan_sermons.plan_id AND pl.church_id = p.church_id
    )
  );

-- ── RLS : blockout_dates (remplacer la politique admin) ────────
DROP POLICY IF EXISTS "Admins voient tout" ON blockout_dates;
CREATE POLICY "Admins voient les indispos de leur église" ON blockout_dates
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles admin_p
      JOIN profiles member_p ON member_p.id = blockout_dates.user_id
      WHERE admin_p.id = auth.uid()
        AND admin_p.permission IN ('admin', 'editor', 'super_admin')
        AND admin_p.church_id = member_p.church_id
    )
  );
