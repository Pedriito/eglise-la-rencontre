-- Apparence par arrangement : fond animé, layout, couleur texte
ALTER TABLE arrangements ADD COLUMN IF NOT EXISTS slide_style JSONB DEFAULT NULL;
