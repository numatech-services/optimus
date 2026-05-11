-- ══════════════════════════════════════════════════════════════════
-- MIGRATION 005: Tables MATIERES et PRESENCES
-- Gestion des matières par classe/filière et année académique
-- + Feuilles de présence (examen ou cours)
-- ══════════════════════════════════════════════════════════════════

-- ── TABLE MATIERES ──
-- Une matière est liée à une filière, une année académique, et un enseignant
CREATE TABLE IF NOT EXISTS public.matieres (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  code        TEXT,
  nom         TEXT NOT NULL,
  filiere     TEXT NOT NULL,                           -- Ex: "L1 Informatique"
  semestre    TEXT,                                    -- S1, S2...
  annee       TEXT NOT NULL,                           -- Ex: "2025-2026"
  enseignant_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  enseignant_nom TEXT,                                 -- Dénormalisé pour perf
  coef        NUMERIC(3,1) DEFAULT 1,
  heures_cm   INT DEFAULT 0,
  heures_td   INT DEFAULT 0,
  heures_tp   INT DEFAULT 0,
  tenant_id   TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT matieres_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_matieres_tenant   ON public.matieres(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matieres_filiere  ON public.matieres(filiere);
CREATE INDEX IF NOT EXISTS idx_matieres_annee    ON public.matieres(annee);
CREATE INDEX IF NOT EXISTS idx_matieres_ens      ON public.matieres(enseignant_id);

ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matieres_select" ON public.matieres FOR SELECT
  USING (tenant_id = auth.uid()::TEXT OR tenant_id IS NULL);
CREATE POLICY "matieres_insert" ON public.matieres FOR INSERT
  WITH CHECK (tenant_id = auth.uid()::TEXT);
CREATE POLICY "matieres_update" ON public.matieres FOR UPDATE
  USING (tenant_id = auth.uid()::TEXT);
CREATE POLICY "matieres_delete" ON public.matieres FOR DELETE
  USING (tenant_id = auth.uid()::TEXT);

-- ── TABLE PRESENCES ──
-- Enregistre la présence/absence d'un étudiant à une session
-- La session peut être liée à un examen OU à une matière (cours)
CREATE TABLE IF NOT EXISTS public.presences (
  id           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  student_id   TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_nom  TEXT NOT NULL,       -- Dénormalisé
  student_mat  TEXT,                -- Matricule dénormalisé
  filiere      TEXT NOT NULL,
  annee        TEXT NOT NULL,
  matiere_id   TEXT REFERENCES matieres(id) ON DELETE CASCADE,
  matiere_nom  TEXT,                -- Dénormalisé
  examen_id    TEXT REFERENCES examens(id) ON DELETE CASCADE,  -- NULL si cours
  type_session TEXT NOT NULL DEFAULT 'COURS' CHECK (type_session IN ('COURS','EXAMEN')),
  date_session DATE NOT NULL DEFAULT CURRENT_DATE,
  statut       TEXT NOT NULL DEFAULT 'ABSENT'
                 CHECK (statut IN ('PRÉSENT','ABSENT','JUSTIFIÉ','RETARD')),
  justification TEXT,               -- Motif si JUSTIFIÉ
  heure_arrivee TIME,               -- Optionnel (scan badge ou saisie)
  notes        TEXT,
  saisie_par   TEXT,                -- user_id du surveillant/scolarité
  tenant_id    TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT presences_pkey PRIMARY KEY (id),
  -- Un étudiant ne peut avoir qu'une seule ligne par session
  CONSTRAINT presences_unique UNIQUE (student_id, matiere_id, examen_id, date_session)
);

CREATE INDEX IF NOT EXISTS idx_presences_tenant   ON public.presences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_presences_student  ON public.presences(student_id);
CREATE INDEX IF NOT EXISTS idx_presences_matiere  ON public.presences(matiere_id);
CREATE INDEX IF NOT EXISTS idx_presences_examen   ON public.presences(examen_id);
CREATE INDEX IF NOT EXISTS idx_presences_filiere  ON public.presences(filiere);
CREATE INDEX IF NOT EXISTS idx_presences_annee    ON public.presences(annee);
CREATE INDEX IF NOT EXISTS idx_presences_date     ON public.presences(date_session);

ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presences_select" ON public.presences FOR SELECT
  USING (tenant_id = auth.uid()::TEXT OR tenant_id IS NULL);
CREATE POLICY "presences_insert" ON public.presences FOR INSERT
  WITH CHECK (tenant_id = auth.uid()::TEXT);
CREATE POLICY "presences_update" ON public.presences FOR UPDATE
  USING (tenant_id = auth.uid()::TEXT);
CREATE POLICY "presences_delete" ON public.presences FOR DELETE
  USING (tenant_id = auth.uid()::TEXT);

-- ── TRIGGER updated_at pour presences ──
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_presences_updated_at ON public.presences;
CREATE TRIGGER trg_presences_updated_at
  BEFORE UPDATE ON public.presences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Ajouter colonne annee_academique aux examens (si manquante) ──
ALTER TABLE public.examens ADD COLUMN IF NOT EXISTS annee TEXT;
ALTER TABLE public.examens ADD COLUMN IF NOT EXISTS matiere_id TEXT REFERENCES matieres(id) ON DELETE SET NULL;

-- ── Vue utilitaire: stats présence par matière ──
CREATE OR REPLACE VIEW public.v_stats_presences AS
SELECT
  p.matiere_id,
  p.matiere_nom,
  p.filiere,
  p.annee,
  p.date_session,
  p.type_session,
  p.tenant_id,
  COUNT(*)                                                      AS total,
  COUNT(*) FILTER (WHERE p.statut = 'PRÉSENT')                  AS presents,
  COUNT(*) FILTER (WHERE p.statut = 'ABSENT')                   AS absents,
  COUNT(*) FILTER (WHERE p.statut = 'JUSTIFIÉ')                 AS justifies,
  COUNT(*) FILTER (WHERE p.statut = 'RETARD')                   AS retards,
  ROUND(COUNT(*) FILTER (WHERE p.statut IN ('PRÉSENT','RETARD'))::numeric
        / NULLIF(COUNT(*),0) * 100, 1)                          AS taux_presence
FROM public.presences p
GROUP BY p.matiere_id, p.matiere_nom, p.filiere, p.annee, p.date_session, p.type_session, p.tenant_id;
