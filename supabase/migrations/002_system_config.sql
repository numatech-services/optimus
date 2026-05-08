-- Migration 002: Add System Config and Tenant Notifications
-- To be executed in Supabase SQL Editor

-- 1. Add 'notifications' JSONB column to tenant_config for UniAdmin settings
ALTER TABLE tenant_config 
ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{
  "emailImpaye": true, 
  "emailInscription": true, 
  "smsExamen": false, 
  "emailResultat": true, 
  "emailAcces": false
}'::jsonb;

-- 2. Create the system_config table for Super Admin platform settings
CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY DEFAULT 'global',
  nom_plateforme TEXT DEFAULT 'Optimus Campus',
  version TEXT DEFAULT '2.0.0',
  environnement TEXT DEFAULT 'Production',
  fuseau_horaire TEXT DEFAULT 'Africa/Niamey (UTC+1)',
  devise TEXT DEFAULT 'FCFA (XOF)',
  langue TEXT DEFAULT 'Français',
  infrastructure JSONB DEFAULT '{
    "plan": "Cloud Standard",
    "modules": "12",
    "rls": "40",
    "edge": "2 (email + SMS)",
    "storage": "student-photos bucket"
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS and setup policies for system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_system_config" ON system_config FOR ALL
  USING (public.get_user_role() = 'super_admin');

-- Also allow everyone to read system_config (so frontend can adjust platform name if needed anywhere public)
CREATE POLICY "public_read_system_config" ON system_config FOR SELECT
  USING (true);

-- 4. Insert default row
INSERT INTO system_config (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;
