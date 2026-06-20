-- RLS : autoriser admins/editors/super_admin à lire et modifier projection_settings
CREATE POLICY "Admins peuvent modifier projection_settings" ON projection_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND permission IN ('admin', 'editor', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND permission IN ('admin', 'editor', 'super_admin')
    )
  );

-- Colonnes annonces manquantes (si pas encore appliqué)
ALTER TABLE projection_settings
  ADD COLUMN IF NOT EXISTS ann_bg_type               TEXT    NOT NULL DEFAULT 'color',
  ADD COLUMN IF NOT EXISTS ann_bg_color              TEXT    NOT NULL DEFAULT '#1e293b',
  ADD COLUMN IF NOT EXISTS ann_bg_gradient           TEXT,
  ADD COLUMN IF NOT EXISTS ann_bg_image_url          TEXT,
  ADD COLUMN IF NOT EXISTS ann_bg_blur               NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ann_bg_overlay_opacity    NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ann_font_family           TEXT    NOT NULL DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS ann_text_color            TEXT    NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS ann_text_shadow           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ann_text_transform        TEXT    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS ann_title_font_size_scale NUMERIC NOT NULL DEFAULT 1.1,
  ADD COLUMN IF NOT EXISTS ann_font_size_scale       NUMERIC NOT NULL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS ann_text_max_width        NUMERIC NOT NULL DEFAULT 94;
