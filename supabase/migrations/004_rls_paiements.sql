-- ===================================================================
-- POLITIQUES RLS POUR LA TABLE PAIEMENTS
-- Exécutez ce script dans Supabase SQL Editor
-- ===================================================================

-- 1. Désactiver RLS temporairement pour modifier les politiques
ALTER TABLE public.paiements DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "paiements_select_policy" ON public.paiements;
DROP POLICY IF EXISTS "paiements_insert_policy" ON public.paiements;
DROP POLICY IF EXISTS "paiements_update_policy" ON public.paiements;
DROP POLICY IF EXISTS "paiements_delete_policy" ON public.paiements;

-- 3. Réactiver RLS
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- 4. Créer les nouvelles politiques
-- Sélection: chaque utilisateur ne voit que les paiements de son tenant
CREATE POLICY "paiements_select_policy"
  ON public.paiements
  FOR SELECT
  USING (
    tenant_id = auth.jwt() ->> 'tenant_id'
    OR tenant_id IS NULL
  );

-- Insertion: créer un paiement pour son tenant
CREATE POLICY "paiements_insert_policy"
  ON public.paiements
  FOR INSERT
  WITH CHECK (
    tenant_id = auth.jwt() ->> 'tenant_id'
  );

-- Modification: modifier les paiements de son tenant
CREATE POLICY "paiements_update_policy"
  ON public.paiements
  FOR UPDATE
  USING (
    tenant_id = auth.jwt() ->> 'tenant_id'
  )
  WITH CHECK (
    tenant_id = auth.jwt() ->> 'tenant_id'
  );

-- Suppression: supprimer les paiements de son tenant
CREATE POLICY "paiements_delete_policy"
  ON public.paiements
  FOR DELETE
  USING (
    tenant_id = auth.jwt() ->> 'tenant_id'
  );

-- ===================================================================
-- ALTERNATIVE: Si vous avez des erreurs, vous pouvez désactiver RLS
-- (non recommandé pour la production)
-- ===================================================================
-- ALTER TABLE public.paiements DISABLE ROW LEVEL SECURITY;
