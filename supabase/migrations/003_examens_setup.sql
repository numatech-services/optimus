-- ══════════════════════════════════════════════════════════════════
-- MIGRATION 003: Table EXAMENS et Configuration
-- ══════════════════════════════════════════════════════════════════

-- ── TABLE EXAMENS ──
CREATE TABLE IF NOT EXISTS public.examens (
  id TEXT NOT NULL DEFAULT (gen_random_uuid())::TEXT,
  filiere TEXT NULL,
  semestre TEXT NULL,
  code TEXT NULL,
  matiere TEXT NOT NULL,
  prof TEXT NULL,
  coef NUMERIC(3, 1) NULL DEFAULT 1,
  date_examen DATE NULL,
  heure TEXT NULL,
  salle TEXT NULL,
  duree TEXT NULL,
  statut TEXT NULL DEFAULT 'NON PLANIFIÉ'::TEXT CHECK (statut IN ('NON PLANIFIÉ', 'PLANIFIÉ', 'TERMINÉ', 'ANNULÉ')),
  tenant_id TEXT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NULL DEFAULT now(),
  CONSTRAINT examens_pkey PRIMARY KEY (id),
  CONSTRAINT examens_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- ── INDEXES ──
CREATE INDEX IF NOT EXISTS idx_examens_tenant ON public.examens USING btree (tenant_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_examens_statut ON public.examens USING btree (statut) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_examens_date ON public.examens USING btree (date_examen) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_examens_matiere ON public.examens USING btree (matiere) TABLESPACE pg_default;

-- ── FONCTION NOTIFICATION (trigger pour résultats publiés) ──
CREATE OR REPLACE FUNCTION public.notify_results_published()
RETURNS TRIGGER AS $$
BEGIN
  -- Notification quand le statut change à TERMINÉ
  IF NEW.statut = 'TERMINÉ' AND OLD.statut != 'TERMINÉ' THEN
    PERFORM pg_notify('exam_results', json_build_object(
      'exam_id', NEW.id,
      'matiere', NEW.matiere,
      'date_publication', now()
    )::TEXT);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── TRIGGER ──
DROP TRIGGER IF EXISTS trg_results_published ON examens;
CREATE TRIGGER trg_results_published
AFTER UPDATE ON examens
FOR EACH ROW
EXECUTE FUNCTION notify_results_published();

-- ── RLS (Row Level Security) ──
ALTER TABLE public.examens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les scolarités voient leurs examens"
  ON public.examens
  FOR SELECT
  USING (tenant_id = auth.uid()::TEXT OR tenant_id IS NULL);

CREATE POLICY "Les scolarités peuvent insérer des examens"
  ON public.examens
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid()::TEXT);

CREATE POLICY "Les scolarités peuvent modifier leurs examens"
  ON public.examens
  FOR UPDATE
  USING (tenant_id = auth.uid()::TEXT)
  WITH CHECK (tenant_id = auth.uid()::TEXT);

CREATE POLICY "Les scolarités peuvent supprimer leurs examens"
  ON public.examens
  FOR DELETE
  USING (tenant_id = auth.uid()::TEXT);
