-- ══════════════════════════════════════════════════════════════════
-- OPTIMUS CAMPUS — Script SQL complet pour Supabase
-- Exécuter dans l'ordre dans le SQL Editor de Supabase Dashboard
-- ══════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────┐
-- │  PARTIE 1 : CRÉATION DES TABLES        │
-- └─────────────────────────────────────────┘

-- ── TENANTS (universités) ──
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT DEFAULT 'Niger',
  plan TEXT DEFAULT 'STANDARD' CHECK (plan IN ('STARTER','STANDARD','PREMIUM','ENTERPRISE')),
  status TEXT DEFAULT 'SETUP' CHECK (status IN ('ACTIVE','SETUP','SUSPENDED')),
  students_count INT DEFAULT 0,
  teachers_count INT DEFAULT 0,
  campus_count INT DEFAULT 1,
  mrr INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── USERS (profils applicatifs) ──
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin_universite','scolarite','enseignant','etudiant','surveillant','bibliotheque','comptabilite')),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── STUDENTS ──
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY DEFAULT 'ETU-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random()*9999)::text, 4, '0'),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  tel TEXT,
  matricule TEXT,
  genre TEXT CHECK (genre IN ('M','F')),
  filiere TEXT,
  annee TEXT,
  status TEXT DEFAULT 'ACTIF' CHECK (status IN ('ACTIF','EN ATTENTE','SUSPENDU','DIPLÔMÉ')),
  date_naissance DATE CHECK (date_naissance < CURRENT_DATE AND date_naissance > '1950-01-01'),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── TEACHERS ──
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  tel TEXT,
  specialite TEXT,
  grade TEXT,
  status TEXT DEFAULT 'ACTIF',
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── FILIERES ──
CREATE TABLE IF NOT EXISTS filieres (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  code TEXT,
  niveau TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── PAIEMENTS ──
CREATE TABLE IF NOT EXISTS paiements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT,
  student_email TEXT,
  filiere TEXT,
  description TEXT,
  montant INT DEFAULT 0 CHECK (montant >= 0),
  date DATE DEFAULT CURRENT_DATE,
  methode TEXT DEFAULT 'ESPÈCES',
  statut TEXT DEFAULT 'EN ATTENTE' CHECK (statut IN ('PAYÉ','EN ATTENTE','EN RETARD','ANNULÉ')),
  delai_retard INT DEFAULT 0,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── EXAMENS ──
CREATE TABLE IF NOT EXISTS examens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  filiere TEXT,
  semestre TEXT,
  code TEXT,
  matiere TEXT NOT NULL,
  prof TEXT,
  coef NUMERIC(3,1) DEFAULT 1,
  date_examen DATE,
  heure TEXT,
  salle TEXT,
  duree TEXT,
  statut TEXT DEFAULT 'NON PLANIFIÉ',
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── CONVOCATIONS ──
CREATE TABLE IF NOT EXISTS convocations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT,
  filiere TEXT,
  exam_id TEXT REFERENCES examens(id) ON DELETE CASCADE,
  matiere TEXT,
  code TEXT,
  date DATE,
  heure TEXT,
  salle TEXT,
  place TEXT,
  statut TEXT DEFAULT 'CONVOQUÉ',
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── EMPLOIS DU TEMPS ──
CREATE TABLE IF NOT EXISTS edts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  filiere TEXT,
  jour TEXT CHECK (jour IN ('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi')),
  heure TEXT,
  matiere TEXT,
  code TEXT,
  prof TEXT,
  salle TEXT,
  type TEXT DEFAULT 'CM',
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── NOTES ──
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT,
  filiere TEXT,
  semestre TEXT,
  code TEXT,
  matiere TEXT,
  prof TEXT,
  coef NUMERIC(3,1) DEFAULT 1,
  note_cc NUMERIC(5,2) CHECK (note_cc >= 0 AND note_cc <= 20),
  note_examen NUMERIC(5,2) CHECK (note_examen >= 0 AND note_examen <= 20),
  note_final NUMERIC(5,2) CHECK (note_final >= 0 AND note_final <= 20),
  mention TEXT,
  valide BOOLEAN DEFAULT false,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── COURS PROFESSEURS ──
CREATE TABLE IF NOT EXISTS prof_cours (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT,
  titre TEXT NOT NULL,
  prof TEXT,
  filiere TEXT,
  heures INT DEFAULT 0,
  effectuees INT DEFAULT 0,
  coef NUMERIC(3,1) DEFAULT 1,
  etudiants INT DEFAULT 0,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── DEVICES (contrôleurs d'accès) ──
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'ZKTeco',
  ip TEXT,
  port INT DEFAULT 4370,
  protocol TEXT DEFAULT 'TCP',
  location TEXT,
  status TEXT DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE','OFFLINE','MAINTENANCE')),
  firmware TEXT,
  last_seen TIMESTAMPTZ,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── READERS (lecteurs de cartes) ──
CREATE TABLE IF NOT EXISTS readers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  controller TEXT REFERENCES devices(id) ON DELETE CASCADE,
  side TEXT DEFAULT 'IN',
  type TEXT DEFAULT 'RFID',
  room TEXT,
  wiegand TEXT DEFAULT '26-bit',
  open_signal TEXT DEFAULT 'relay',
  status TEXT DEFAULT 'ACTIVE',
  last_event TIMESTAMPTZ,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── BADGES ──
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT,
  matricule TEXT,
  card_number TEXT UNIQUE,
  card_type TEXT DEFAULT 'MIFARE',
  status TEXT DEFAULT 'ACTIF' CHECK (status IN ('ACTIF','SUSPENDU','EXPIRÉ','PERDU')),
  issued_at DATE DEFAULT CURRENT_DATE,
  expires_at DATE,
  access_groups TEXT[],
  paiement_statut TEXT DEFAULT 'OK',
  montant_impaye INT DEFAULT 0,
  blocage_impayes BOOLEAN DEFAULT false,
  dernier_controle TIMESTAMPTZ,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── ACCESS EVENTS ──
CREATE TABLE IF NOT EXISTS access_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp TIMESTAMPTZ DEFAULT now(),
  type TEXT DEFAULT 'ACCESS_GRANTED',
  card_number TEXT,
  matricule TEXT,
  student_name TEXT,
  filiere TEXT,
  direction TEXT DEFAULT 'IN',
  reader TEXT,
  reason TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── ACCESS SESSIONS ──
CREATE TABLE IF NOT EXISTS access_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  room TEXT,
  controller TEXT,
  reader TEXT,
  time_start TEXT,
  time_end TEXT,
  expected_students INT DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  supervisor TEXT,
  status TEXT DEFAULT 'ACTIVE',
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── ACCESS GROUPS ──
CREATE TABLE IF NOT EXISTS access_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  member_count INT DEFAULT 0,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── ACCESS RULES ──
CREATE TABLE IF NOT EXISTS access_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  device TEXT,
  time_zone TEXT DEFAULT '08:00-18:00',
  groups TEXT[],
  status TEXT DEFAULT 'ACTIVE',
  direction TEXT DEFAULT 'BOTH',
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── NOTIFICATIONS ──
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT DEFAULT 'default',
  role TEXT NOT NULL,
  titre TEXT NOT NULL,
  detail TEXT,
  lu BOOLEAN DEFAULT false,
  date TIMESTAMPTZ DEFAULT now(),
  link TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── INCIDENTS ──
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT DEFAULT 'AUTRE',
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'LOW' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
  reported_by TEXT,
  matricule TEXT,
  location TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ── DOCUMENT REQUESTS ──
CREATE TABLE IF NOT EXISTS document_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'EN ATTENTE' CHECK (status IN ('EN ATTENTE','EN COURS','PRÊT','REMIS','REFUSÉ')),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── BILLING PLANS ──
CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  prix INT DEFAULT 0,
  features TEXT[],
  max_users INT,
  max_storage_gb INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── AUDIT LOGS ──
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── ACADEMIC YEARS ──
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── ACADEMIC WEEKS ──
CREATE TABLE IF NOT EXISTS academic_weeks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year_id TEXT REFERENCES academic_years(id) ON DELETE CASCADE,
  week_number INT,
  start_date DATE,
  end_date DATE,
  label TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── TEACHER LOOKUP TABLES ──
CREATE TABLE IF NOT EXISTS teacher_grades (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_specialities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_statuses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_statuses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── TOTP 2FA ──
CREATE TABLE IF NOT EXISTS admin_totp_secrets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ┌─────────────────────────────────────────┐
-- │  PARTIE 2 : INDEX DE PERFORMANCE       │
-- └─────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_teachers_tenant ON teachers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_paiements_tenant ON paiements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_paiements_statut ON paiements(statut);
CREATE INDEX IF NOT EXISTS idx_paiements_student ON paiements(student_id);
CREATE INDEX IF NOT EXISTS idx_examens_tenant ON examens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_examens_statut ON examens(statut);
CREATE INDEX IF NOT EXISTS idx_notes_student ON notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_tenant ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_edts_tenant ON edts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_edts_filiere ON edts(filiere);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_badges_tenant ON badges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_badges_card ON badges(card_number);
CREATE INDEX IF NOT EXISTS idx_access_events_tenant ON access_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_access_events_time ON access_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(role);
CREATE INDEX IF NOT EXISTS idx_convocations_student ON convocations(student_id);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(created_at DESC);

-- ┌─────────────────────────────────────────┐
-- │  PARTIE 3 : ROW LEVEL SECURITY (RLS)  │
-- └─────────────────────────────────────────┘

-- Fonctions helpers
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users
  WHERE email = auth.jwt() ->> 'email'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS TEXT AS $$
  SELECT tenant_id FROM public.users
  WHERE email = auth.jwt() ->> 'email'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Activer RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE examens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edts ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prof_cours ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE readers ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE filieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_totp_secrets ENABLE ROW LEVEL SECURITY;

-- ── SUPER ADMIN : accès total ──
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users','tenants','students','teachers','paiements','examens','notes','edts',
    'convocations','prof_cours','devices','readers','badges','access_events',
    'access_sessions','access_groups','access_rules','notifications','incidents',
    'document_requests','billing_plans','audit_logs','filieres'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "super_admin_all_%s" ON %I FOR ALL USING (public.get_user_role() = ''super_admin'')',
      t, t
    );
  END LOOP;
END $$;

-- ── TENANT-SCOPED : staff de l'université ──
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'students','teachers','paiements','examens','notes','edts','convocations',
    'prof_cours','devices','readers','badges','access_events','access_sessions',
    'access_groups','access_rules','notifications','incidents','document_requests','filieres'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "tenant_staff_%s" ON %I FOR ALL USING (
        public.get_user_role() IN (''admin_universite'',''scolarite'',''enseignant'',''surveillant'')
        AND tenant_id = public.get_user_tenant()
      )', t, t
    );
  END LOOP;
END $$;

-- ── ÉTUDIANTS : lecture seule sur leur tenant ──
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'edts','examens','convocations','prof_cours','filieres'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "student_read_%s" ON %I FOR SELECT USING (
        public.get_user_role() = ''etudiant''
        AND tenant_id = public.get_user_tenant()
      )', t, t
    );
  END LOOP;
END $$;

-- Étudiants : données personnelles uniquement
CREATE POLICY "student_own_notes" ON notes FOR SELECT
  USING (public.get_user_role() = 'etudiant' AND student_id IN (
    SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "student_own_paiements" ON paiements FOR SELECT
  USING (public.get_user_role() = 'etudiant' AND student_email = auth.jwt() ->> 'email');

CREATE POLICY "student_own_convocations" ON convocations FOR SELECT
  USING (public.get_user_role() = 'etudiant' AND student_id IN (
    SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "student_own_documents" ON document_requests FOR ALL
  USING (public.get_user_role() = 'etudiant' AND student_id IN (
    SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
  ));

-- Users policies
CREATE POLICY "users_view_own" ON users FOR SELECT
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "uni_admin_view_tenant_users" ON users FOR SELECT
  USING (public.get_user_role() = 'admin_universite' AND tenant_id = public.get_user_tenant());

-- Tenants policies  
CREATE POLICY "uni_admin_view_own_tenant" ON tenants FOR SELECT
  USING (id = public.get_user_tenant());

-- Billing plans : lecture pour tous les authentifiés
CREATE POLICY "authenticated_read_plans" ON billing_plans FOR SELECT
  USING (auth.role() = 'authenticated');

-- TOTP : seul l'admin voit son propre secret
CREATE POLICY "admin_own_totp" ON admin_totp_secrets FOR SELECT
  USING (user_id = auth.uid());

-- Audit logs : admin only
CREATE POLICY "admin_read_audit" ON audit_logs FOR SELECT
  USING (public.get_user_role() IN ('super_admin','admin_universite'));

-- ┌─────────────────────────────────────────┐
-- │  PARTIE 4 : DONNÉES INITIALES          │
-- └─────────────────────────────────────────┘

INSERT INTO tenants (id, name, country, plan, status, students_count, teachers_count, campus_count, mrr) VALUES
  ('univ-niamey', 'Université de Niamey', 'Niger', 'PREMIUM', 'ACTIVE', 3240, 45, 2, 1200000),
  ('univ-dosso', 'Université de Dosso', 'Niger', 'STANDARD', 'ACTIVE', 1850, 28, 1, 750000),
  ('univ-diffa', 'Université de Diffa', 'Niger', 'STANDARD', 'ACTIVE', 980, 18, 1, 500000),
  ('eccam', 'ECCAM', 'Niger', 'STARTER', 'SETUP', 640, 12, 1, 250000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO billing_plans (id, name, prix, features, max_users, max_storage_gb) VALUES
  ('plan-starter', 'Starter', 25000, ARRAY['5 utilisateurs','3 modules','1 Go stockage','Support email'], 5, 1),
  ('plan-pro', 'Pro', 75000, ARRAY['20 utilisateurs','Tous les modules','10 Go stockage','Support prioritaire','API'], 20, 10),
  ('plan-enterprise', 'Enterprise', 0, ARRAY['Utilisateurs illimités','Tous les modules','Stockage illimité','Support dédié','SLA'], NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 5 : MIGRATION SUPABASE AUTH                     │
-- │  Exécuter APRÈS avoir créé les users dans Auth > Users  │
-- └──────────────────────────────────────────────────────────┘

-- ÉTAPE 1 : Créez manuellement les users dans Supabase Dashboard > Authentication > Users
-- Pour chaque utilisateur, utilisez le MÊME email que dans votre table users.
-- Exemple : superadmin@optimuscampus.com avec un nouveau mot de passe fort.

-- ÉTAPE 2 : Une fois tous les users créés dans Auth, supprimez la colonne password :
-- ALTER TABLE users DROP COLUMN IF EXISTS password;

-- ÉTAPE 3 : Pour configurer le TOTP du Super Admin :
-- INSERT INTO admin_totp_secrets (user_id, secret, verified)
-- VALUES ('UUID-DEPUIS-AUTH-USERS', 'VOTRE-SECRET-BASE32', true);
-- Scannez le QR avec Google Authenticator.

-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 6 : CONFIGURATION AVANCÉE PAR UNIVERSITÉ       │
-- │  Personnalisation public/privé, bourses, notation       │
-- └──────────────────────────────────────────────────────────┘

-- ── CONFIGURATION ÉTABLISSEMENT ──
CREATE TABLE IF NOT EXISTS tenant_config (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Type d'établissement
  type_etablissement TEXT DEFAULT 'PUBLIC' CHECK (type_etablissement IN ('PUBLIC','PRIVE','SEMI_PUBLIC')),
  
  -- Frais différenciés (JSONB pour flexibilité)
  grille_frais JSONB DEFAULT '{
    "formation_initiale": {
      "boursier": { "inscription": 0, "scolarite": 0, "examen": 0, "bibliotheque": 0 },
      "non_boursier": { "inscription": 15000, "scolarite": 50000, "examen": 5000, "bibliotheque": 3000 }
    },
    "formation_continue": {
      "boursier": { "inscription": 0, "scolarite": 0, "examen": 0, "bibliotheque": 0 },
      "non_boursier": { "inscription": 25000, "scolarite": 150000, "examen": 10000, "bibliotheque": 5000 }
    }
  }'::jsonb,
  
  -- Frais additionnels (sport, assurance, etc.)
  frais_additionnels JSONB DEFAULT '{
    "sport": 2000,
    "assurance": 3000,
    "carte_etudiant": 1500,
    "dossier_administratif": 2500
  }'::jsonb,
  
  -- Configuration du calcul des notes
  systeme_notation JSONB DEFAULT '{
    "type": "LMD",
    "note_max": 20,
    "note_validation": 10,
    "note_rattrapage": 8,
    "coefficient_cc": 0.4,
    "coefficient_examen": 0.6,
    "credits_licence": 180,
    "credits_master": 120,
    "mentions": [
      { "seuil": 16, "label": "Très Bien" },
      { "seuil": 14, "label": "Bien" },
      { "seuil": 12, "label": "Assez Bien" },
      { "seuil": 10, "label": "Passable" }
    ],
    "compensation_ue": true,
    "seuil_compensation": 8
  }'::jsonb,
  
  -- Types de formation proposés
  formations JSONB DEFAULT '["Formation Initiale", "Formation Continue"]'::jsonb,
  
  -- Types de bourse reconnus
  types_bourse JSONB DEFAULT '["Bourse d''État", "Bourse ANAB", "Bourse d''excellence", "Exonéré"]'::jsonb,
  
  -- Méthodes de paiement acceptées
  methodes_paiement JSONB DEFAULT '["Espèces", "Airtel Money", "NITA", "AMANA", "Virement bancaire"]'::jsonb,
  
  -- Paramètres divers
  annee_academique TEXT DEFAULT '2025-2026',
  devise TEXT DEFAULT 'XOF',
  langue TEXT DEFAULT 'fr',
  fuseau_horaire TEXT DEFAULT 'Africa/Niamey',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_tenant_config" ON tenant_config FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "uni_admin_own_config" ON tenant_config FOR ALL
  USING (
    public.get_user_role() = 'admin_universite'
    AND tenant_id = public.get_user_tenant()
  );

-- Ajouter les colonnes manquantes à la table students
ALTER TABLE students ADD COLUMN IF NOT EXISTS type_formation TEXT DEFAULT 'Formation Initiale';
ALTER TABLE students ADD COLUMN IF NOT EXISTS type_bourse TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS est_boursier BOOLEAN DEFAULT false;

-- Index
CREATE INDEX IF NOT EXISTS idx_students_boursier ON students(est_boursier);
CREATE INDEX IF NOT EXISTS idx_students_formation ON students(type_formation);

-- Insérer la config par défaut pour chaque tenant existant
INSERT INTO tenant_config (tenant_id, type_etablissement)
SELECT id, CASE 
  WHEN id IN ('univ-niamey','univ-dosso','univ-diffa') THEN 'PUBLIC'
  ELSE 'PRIVE'
END
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;


-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 7 : SUPABASE STORAGE BUCKET                    │
-- └──────────────────────────────────────────────────────────┘
-- Exécuter dans Supabase Dashboard > Storage > New Bucket :
-- Nom : student-photos
-- Public : true
-- File size limit : 2MB
-- Allowed MIME types : image/jpeg, image/png, image/webp

-- Policy pour que les utilisateurs authentifiés puissent upload
-- (à créer dans Storage > Policies du bucket student-photos)
-- INSERT policy : auth.role() = 'authenticated'
-- SELECT policy : true (public)
-- DELETE policy : auth.role() = 'authenticated'


-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 8 : TRIGGERS AUTOMATIQUES POUR NOTIFICATIONS   │
-- └──────────────────────────────────────────────────────────┘

-- Ajouter des colonnes au tableau notifications pour le tracking
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS canal TEXT DEFAULT 'email';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS destinataire TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS statut_envoi TEXT DEFAULT 'PENDING';

-- Index pour les requêtes de notification
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ── TRIGGER : Impayé > 30 jours → notification automatique ──
CREATE OR REPLACE FUNCTION check_overdue_payments()
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (type, role, titre, detail, tenant_id, student_id, canal)
  SELECT 
    'payment_overdue_30',
    'etudiant',
    'Paiement en retard de plus de 30 jours',
    'Montant: ' || p.montant || ' FCFA — ' || p.description,
    p.tenant_id,
    p.student_id,
    'email'
  FROM paiements p
  WHERE p.statut = 'EN RETARD'
    AND p.delai_retard > 30
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.student_id = p.student_id 
        AND n.type = 'payment_overdue_30'
        AND n.created_at > now() - interval '7 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── TRIGGER : Résultats publiés ──
CREATE OR REPLACE FUNCTION notify_results_published()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'PUBLIÉ' AND (OLD.statut IS NULL OR OLD.statut != 'PUBLIÉ') THEN
    INSERT INTO notifications (type, role, titre, detail, tenant_id, canal)
    VALUES (
      'results_published',
      'etudiant',
      'Résultats disponibles — ' || NEW.matiere,
      'Les résultats de ' || NEW.matiere || ' sont disponibles.',
      NEW.tenant_id,
      'email'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_results_published
  AFTER UPDATE ON examens
  FOR EACH ROW
  EXECUTE FUNCTION notify_results_published();

-- ── CRON JOB : Rappel examen J-2 ──
-- À exécuter via pg_cron (Supabase Pro) ou un cron externe
-- SELECT cron.schedule('exam-reminder', '0 8 * * *', $$
--   INSERT INTO notifications (type, role, titre, detail, tenant_id, student_id, canal)
--   SELECT 
--     'exam_reminder_48h', 'etudiant',
--     'Rappel examen dans 48h — ' || e.matiere,
--     'Salle: ' || COALESCE(e.salle, 'TBD') || ' — ' || COALESCE(e.heure, ''),
--     e.tenant_id, c.student_id, 'sms'
--   FROM examens e
--   JOIN convocations c ON c.exam_id = e.id
--   WHERE e.date_examen = CURRENT_DATE + interval '2 days'
--     AND e.statut != 'ANNULÉ';
-- $$);



-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 9 : CONTRAINTES D'INTÉGRITÉ RENFORCÉES        │
-- └──────────────────────────────────────────────────────────┘

-- Empêcher les notes absurdes via trigger (double sécurité avec CHECK)
CREATE OR REPLACE FUNCTION validate_note()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.note_cc IS NOT NULL AND (NEW.note_cc < 0 OR NEW.note_cc > 20) THEN
    RAISE EXCEPTION 'Note CC invalide: %. Doit être entre 0 et 20.', NEW.note_cc;
  END IF;
  IF NEW.note_examen IS NOT NULL AND (NEW.note_examen < 0 OR NEW.note_examen > 20) THEN
    RAISE EXCEPTION 'Note examen invalide: %. Doit être entre 0 et 20.', NEW.note_examen;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_validate_note
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION validate_note();

-- Empêcher les montants négatifs
CREATE OR REPLACE FUNCTION validate_paiement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.montant < 0 THEN
    RAISE EXCEPTION 'Montant négatif interdit: %', NEW.montant;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_validate_paiement
  BEFORE INSERT OR UPDATE ON paiements
  FOR EACH ROW EXECUTE FUNCTION validate_paiement();

-- RLS : Empêcher un surveillant d'écrire dans les notes
CREATE POLICY "deny_surveillant_notes_write" ON notes
  FOR INSERT
  WITH CHECK (public.get_user_role() != 'surveillant');

CREATE POLICY "deny_surveillant_notes_update" ON notes
  FOR UPDATE
  USING (public.get_user_role() != 'surveillant');

-- RLS : Empêcher un étudiant d'écrire dans les notes
CREATE POLICY "deny_student_notes_write" ON notes
  FOR INSERT
  WITH CHECK (public.get_user_role() != 'etudiant');

CREATE POLICY "deny_student_notes_update" ON notes
  FOR UPDATE
  USING (public.get_user_role() != 'etudiant');

-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 10 : SUSPENSION AUTOMATIQUE DES ABONNEMENTS    │
-- └──────────────────────────────────────────────────────────┘

-- Ajouter colonnes d'abonnement à tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'STARTER';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Fonction qui vérifie et suspend les abonnements expirés
-- Appelée à chaque login admin ou via cron externe
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS void AS $$
BEGIN
  -- Suspendre les tenants dont l'abonnement a expiré depuis > 7 jours de grâce
  UPDATE tenants 
  SET status = 'SUSPENDED'
  WHERE status = 'ACTIVE'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < CURRENT_DATE - interval '7 days';

  -- Insérer une notification pour chaque suspension
  INSERT INTO notifications (type, role, titre, detail, tenant_id, canal)
  SELECT 
    'subscription_expired',
    'admin_universite',
    'Abonnement suspendu — ' || name,
    'Votre abonnement a expiré le ' || subscription_expires_at::text || '. Accès restreint.',
    id,
    'email'
  FROM tenants
  WHERE status = 'SUSPENDED'
    AND subscription_expires_at < CURRENT_DATE - interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.tenant_id = tenants.id 
        AND n.type = 'subscription_expired'
        AND n.created_at > now() - interval '1 day'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction appelée à chaque login pour vérifier le statut
CREATE OR REPLACE FUNCTION check_tenant_access(p_tenant_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_expires DATE;
BEGIN
  SELECT status, subscription_expires_at INTO v_status, v_expires
  FROM tenants WHERE id = p_tenant_id;
  
  IF v_status = 'SUSPENDED' THEN RETURN FALSE; END IF;
  
  -- Vérifier l'expiration en temps réel
  IF v_expires IS NOT NULL AND v_expires < CURRENT_DATE - interval '7 days' THEN
    UPDATE tenants SET status = 'SUSPENDED' WHERE id = p_tenant_id;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 11 : STRUCTURE ACADÉMIQUE COMPLÈTE             │
-- │  Faculté → Département → Filière → Niveau → Section    │
-- │  + Groupes TD/TP/Stage                                  │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS facultes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  code TEXT,
  doyen TEXT,
  email TEXT,
  telephone TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  code TEXT,
  chef TEXT,
  faculte_id TEXT REFERENCES facultes(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ajouter les liens hiérarchiques aux tables existantes
ALTER TABLE filieres ADD COLUMN IF NOT EXISTS departement_id TEXT REFERENCES departements(id) ON DELETE SET NULL;
ALTER TABLE filieres ADD COLUMN IF NOT EXISTS niveau TEXT DEFAULT 'L1';

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  code TEXT,
  filiere_id TEXT REFERENCES filieres(id) ON DELETE CASCADE,
  niveau TEXT DEFAULT 'L1',
  capacite INT DEFAULT 50,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS groupes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('TD','TP','STAGE','COURS')),
  section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
  enseignant_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  salle TEXT,
  capacite INT DEFAULT 30,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lier l'étudiant à la structure
ALTER TABLE students ADD COLUMN IF NOT EXISTS faculte_id TEXT REFERENCES facultes(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS departement_id TEXT REFERENCES departements(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES sections(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_facultes_tenant ON facultes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departements_tenant ON departements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departements_faculte ON departements(faculte_id);
CREATE INDEX IF NOT EXISTS idx_sections_filiere ON sections(filiere_id);
CREATE INDEX IF NOT EXISTS idx_groupes_section ON groupes(section_id);
CREATE INDEX IF NOT EXISTS idx_groupes_type ON groupes(type);
CREATE INDEX IF NOT EXISTS idx_students_faculte ON students(faculte_id);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section_id);

-- RLS
ALTER TABLE facultes ENABLE ROW LEVEL SECURITY;
ALTER TABLE departements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_facultes" ON facultes FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "super_admin_all_departements" ON departements FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "super_admin_all_sections" ON sections FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "super_admin_all_groupes" ON groupes FOR ALL USING (public.get_user_role() = 'super_admin');

CREATE POLICY "tenant_staff_facultes" ON facultes FOR ALL USING (
  public.get_user_role() IN ('admin_universite','scolarite') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "tenant_staff_departements" ON departements FOR ALL USING (
  public.get_user_role() IN ('admin_universite','scolarite') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "tenant_staff_sections" ON sections FOR ALL USING (
  public.get_user_role() IN ('admin_universite','scolarite') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "tenant_staff_groupes" ON groupes FOR ALL USING (
  public.get_user_role() IN ('admin_universite','scolarite','enseignant') AND tenant_id = public.get_user_tenant()
);


-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 12 : GESTION DES SALLES                        │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS salles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  code TEXT,
  batiment TEXT,
  etage TEXT,
  capacite INT DEFAULT 40,
  type TEXT DEFAULT 'COURS' CHECK (type IN ('COURS','TD','TP','AMPHI','LABO','EXAMEN','REUNION')),
  equipements TEXT[], -- ex: ['vidéoprojecteur','climatisation','wifi']
  disponible BOOLEAN DEFAULT true,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salles_tenant ON salles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salles_type ON salles(type);

ALTER TABLE salles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_staff_salles" ON salles FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','scolarite') AND tenant_id = public.get_user_tenant()
);

-- Lier les EDT aux salles
ALTER TABLE edts ADD COLUMN IF NOT EXISTS salle_id TEXT REFERENCES salles(id) ON DELETE SET NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 13 : ÉCHÉANCIER FINANCIER                      │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS echeances (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  montant INT DEFAULT 0 CHECK (montant >= 0),
  date_limite DATE NOT NULL,
  statut TEXT DEFAULT 'A_VENIR' CHECK (statut IN ('A_VENIR','EN_COURS','PAYÉ','EN_RETARD','ANNULÉ')),
  paiement_id TEXT REFERENCES paiements(id) ON DELETE SET NULL,
  rappel_envoye BOOLEAN DEFAULT false,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_echeances_student ON echeances(student_id);
CREATE INDEX IF NOT EXISTS idx_echeances_date ON echeances(date_limite);
CREATE INDEX IF NOT EXISTS idx_echeances_statut ON echeances(statut);
CREATE INDEX IF NOT EXISTS idx_echeances_tenant ON echeances(tenant_id);

ALTER TABLE echeances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_staff_echeances" ON echeances FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','scolarite','comptabilite') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "student_own_echeances" ON echeances FOR SELECT USING (
  public.get_user_role() = 'etudiant' AND student_id IN (SELECT id FROM students WHERE email = auth.jwt() ->> 'email')
);

-- Trigger : marquer les échéances en retard
CREATE OR REPLACE FUNCTION check_echeances_retard()
RETURNS void AS $$
BEGIN
  UPDATE echeances SET statut = 'EN_RETARD'
  WHERE statut IN ('A_VENIR','EN_COURS') AND date_limite < CURRENT_DATE;
  
  UPDATE echeances SET statut = 'EN_COURS'
  WHERE statut = 'A_VENIR' AND date_limite BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 14 : MESSAGERIE & ANNONCES                     │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS annonces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  auteur_id TEXT,
  auteur_nom TEXT,
  cible TEXT DEFAULT 'tous' CHECK (cible IN ('tous','etudiants','enseignants','staff','filiere')),
  cible_filiere TEXT, -- si cible = 'filiere'
  important BOOLEAN DEFAULT false,
  publie BOOLEAN DEFAULT true,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  expediteur_id TEXT NOT NULL,
  expediteur_nom TEXT NOT NULL,
  destinataire_id TEXT NOT NULL,
  destinataire_nom TEXT NOT NULL,
  sujet TEXT,
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT false,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annonces_tenant ON annonces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_annonces_cible ON annonces(cible);
CREATE INDEX IF NOT EXISTS idx_messages_dest ON messages(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_messages_exp ON messages(expediteur_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);

ALTER TABLE annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_annonces" ON annonces FOR SELECT USING (tenant_id = public.get_user_tenant());
CREATE POLICY "staff_write_annonces" ON annonces FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','scolarite') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "own_messages" ON messages FOR SELECT USING (
  destinataire_id IN (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
  OR expediteur_id IN (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
);
CREATE POLICY "send_messages" ON messages FOR INSERT WITH CHECK (
  expediteur_id IN (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 15 : PUSH NOTIFICATIONS (Web Push)             │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_push_sub" ON push_subscriptions FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 16 : ACCÈS SALLES D'EXAMEN                     │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS exam_access_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  examen_id TEXT REFERENCES examens(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  salle_id TEXT REFERENCES salles(id) ON DELETE SET NULL,
  heure_entree TIMESTAMPTZ DEFAULT now(),
  heure_sortie TIMESTAMPTZ,
  verifie_par TEXT, -- surveillant
  statut TEXT DEFAULT 'PRÉSENT' CHECK (statut IN ('PRÉSENT','ABSENT','RETARD','EXCLU')),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exam_access_examen ON exam_access_logs(examen_id);
CREATE INDEX IF NOT EXISTS idx_exam_access_student ON exam_access_logs(student_id);

ALTER TABLE exam_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_exam_access" ON exam_access_logs FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','scolarite','surveillant') AND tenant_id = public.get_user_tenant()
);


-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 17 : CHAÎNES TRANSVERSALES                     │
-- │  Paiement ↔ Badge ↔ Portique ↔ Examen                  │
-- └──────────────────────────────────────────────────────────┘

-- 1. Quand une échéance passe EN_RETARD > 60j → bloquer le badge automatiquement
CREATE OR REPLACE FUNCTION auto_block_badge_on_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'EN_RETARD' AND NEW.date_limite < CURRENT_DATE - interval '60 days' THEN
    UPDATE badges 
    SET status = 'BLOCKED', blocked_reason = 'Impayé > 60 jours — ' || NEW.description, blocage_impayes = true
    WHERE student_id = NEW.student_id;
    
    -- Notification automatique
    INSERT INTO notifications (type, role, titre, detail, tenant_id, canal)
    VALUES ('access_denied', 'etudiant', 
      'Badge bloqué — Impayé',
      'Votre badge a été bloqué suite à un impayé de plus de 60 jours : ' || NEW.description,
      NEW.tenant_id, 'email');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_auto_block_badge
  AFTER UPDATE OF statut ON echeances
  FOR EACH ROW
  WHEN (NEW.statut = 'EN_RETARD')
  EXECUTE FUNCTION auto_block_badge_on_overdue();

-- 2. Quand un paiement est confirmé → débloquer le badge si plus d'impayés
CREATE OR REPLACE FUNCTION auto_unblock_badge_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining INT;
BEGIN
  IF NEW.statut = 'PAYÉ' THEN
    -- Compter les échéances encore en retard pour cet étudiant
    SELECT COUNT(*) INTO v_remaining
    FROM echeances
    WHERE student_id = NEW.student_id AND statut = 'EN_RETARD';
    
    -- Si plus aucun impayé → débloquer
    IF v_remaining = 0 THEN
      UPDATE badges 
      SET status = 'ACTIVE', blocked_reason = NULL, blocage_impayes = false
      WHERE student_id = NEW.student_id AND blocage_impayes = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_auto_unblock_badge
  AFTER UPDATE OF statut ON echeances
  FOR EACH ROW
  WHEN (NEW.statut = 'PAYÉ')
  EXECUTE FUNCTION auto_unblock_badge_on_payment();

-- 3. Fonction de vérification accès examen (appelée par ExamAccess)
CREATE OR REPLACE FUNCTION check_exam_eligibility(p_student_id TEXT, p_tenant_id TEXT)
RETURNS TABLE (eligible BOOLEAN, raison TEXT) AS $$
DECLARE
  v_overdue INT;
  v_badge_status TEXT;
  v_has_convocation BOOLEAN;
BEGIN
  -- Vérifier les impayés
  SELECT COUNT(*) INTO v_overdue
  FROM echeances
  WHERE student_id = p_student_id AND statut = 'EN_RETARD' AND tenant_id = p_tenant_id;
  
  IF v_overdue > 0 THEN
    RETURN QUERY SELECT false, 'Impayé : ' || v_overdue || ' échéance(s) en retard';
    RETURN;
  END IF;
  
  -- Vérifier le badge
  SELECT status INTO v_badge_status
  FROM badges WHERE student_id = p_student_id LIMIT 1;
  
  IF v_badge_status = 'BLOCKED' THEN
    RETURN QUERY SELECT false, 'Badge bloqué';
    RETURN;
  END IF;
  
  -- Tout est OK
  RETURN QUERY SELECT true, 'Éligible';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ┌──────────────────────────────────────────────────────────┐
-- │  PARTIE 18 : COMPTABILITÉ → GESTION BADGES             │
-- └──────────────────────────────────────────────────────────┘

-- Permettre à la comptabilité de lire et modifier les badges
CREATE POLICY "comptabilite_manage_badges" ON badges FOR ALL USING (
  public.get_user_role() = 'comptabilite' AND tenant_id = public.get_user_tenant()
);

-- Permettre à la comptabilité de lire les échéances
CREATE POLICY "comptabilite_read_echeances" ON echeances FOR ALL USING (
  public.get_user_role() = 'comptabilite' AND tenant_id = public.get_user_tenant()
);

-- Permettre à la comptabilité de lire les étudiants
CREATE POLICY "comptabilite_read_students" ON students FOR SELECT USING (
  public.get_user_role() = 'comptabilite' AND tenant_id = public.get_user_tenant()
);

-- Log des actions manuelles sur les badges
CREATE TABLE IF NOT EXISTS badge_actions_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  badge_id TEXT REFERENCES badges(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('BLOCK','UNBLOCK')),
  raison TEXT NOT NULL,
  effectue_par TEXT NOT NULL,
  effectue_par_role TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_actions_student ON badge_actions_log(student_id);
ALTER TABLE badge_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_badge_actions" ON badge_actions_log FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','comptabilite') AND tenant_id = public.get_user_tenant()
);


-- ┌──────────────────────────────────────────────────────────────┐
-- │  PARTIE 19 : ANNÉES ACADÉMIQUES, SEMESTRES, PROMOTIONS     │
-- └──────────────────────────────────────────────────────────────┘

-- Années académiques avec basculement
CREATE TABLE IF NOT EXISTS annees_academiques (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT NOT NULL, -- ex: '2025-2026'
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  active BOOLEAN DEFAULT false,
  archivee BOOLEAN DEFAULT false,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Semestres (S1-S6 pour Licence, S1-S4 pour Master, D1-D5 pour Doctorat)
CREATE TABLE IF NOT EXISTS semestres (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL, -- S1, S2, S3...S6, D1...D5
  label TEXT NOT NULL, -- 'Semestre 1', 'Doctorat 1ère année'
  niveau TEXT NOT NULL, -- L1, L2, L3, M1, M2, D1, D2, D3, D4, D5
  annee_academique_id TEXT REFERENCES annees_academiques(id) ON DELETE CASCADE,
  date_debut DATE,
  date_fin DATE,
  deliberations_ouvertes BOOLEAN DEFAULT false,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Promotions (cohorte d'étudiants par année d'inscription)
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT NOT NULL, -- ex: 'Promotion 2024-2025 L1 Info'
  annee_inscription TEXT NOT NULL, -- '2024-2025'
  niveau TEXT NOT NULL,
  filiere_id TEXT REFERENCES filieres(id) ON DELETE SET NULL,
  departement_id TEXT REFERENCES departements(id) ON DELETE SET NULL,
  faculte_id TEXT REFERENCES facultes(id) ON DELETE SET NULL,
  effectif INT DEFAULT 0,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historique académique de l'étudiant (frise chronologique)
CREATE TABLE IF NOT EXISTS parcours_academique (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  annee_academique_id TEXT REFERENCES annees_academiques(id),
  annee_label TEXT NOT NULL,
  niveau TEXT NOT NULL,
  semestre TEXT,
  filiere TEXT,
  departement TEXT,
  faculte TEXT,
  moyenne NUMERIC(5,2),
  credits_valides INT DEFAULT 0,
  credits_requis INT DEFAULT 30,
  resultat TEXT CHECK (resultat IN ('VALIDÉ','AJOURNÉ','RATTRAPAGE','EN_COURS','ABANDON')),
  promotion_id TEXT REFERENCES promotions(id),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Liens étudiants ↔ semestres
ALTER TABLE students ADD COLUMN IF NOT EXISTS annee_inscription TEXT; -- '2024-2025'
ALTER TABLE students ADD COLUMN IF NOT EXISTS promotion_id TEXT REFERENCES promotions(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS semestre_id TEXT REFERENCES semestres(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS annee_academique_id TEXT REFERENCES annees_academiques(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parcours_student ON parcours_academique(student_id);
CREATE INDEX IF NOT EXISTS idx_parcours_annee ON parcours_academique(annee_academique_id);
CREATE INDEX IF NOT EXISTS idx_semestres_annee ON semestres(annee_academique_id);
CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON promotions(tenant_id);

ALTER TABLE annees_academiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE semestres ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcours_academique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_annees" ON annees_academiques FOR ALL USING (tenant_id = public.get_user_tenant());
CREATE POLICY "tenant_semestres" ON semestres FOR ALL USING (tenant_id = public.get_user_tenant());
CREATE POLICY "tenant_promotions" ON promotions FOR ALL USING (tenant_id = public.get_user_tenant());
CREATE POLICY "tenant_parcours" ON parcours_academique FOR ALL USING (tenant_id = public.get_user_tenant());

-- Fonction de basculement d'année académique
CREATE OR REPLACE FUNCTION basculer_annee_academique(p_old_id TEXT, p_new_id TEXT, p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  -- Archiver l'ancienne année
  UPDATE annees_academiques SET active = false, archivee = true WHERE id = p_old_id AND tenant_id = p_tenant_id;
  -- Activer la nouvelle
  UPDATE annees_academiques SET active = true WHERE id = p_new_id AND tenant_id = p_tenant_id;
  -- Sauvegarder le parcours de chaque étudiant
  INSERT INTO parcours_academique (student_id, annee_academique_id, annee_label, niveau, filiere, tenant_id, resultat)
  SELECT s.id, p_old_id, aa.label, s.niveau, s.filiere, s.tenant_id, 'EN_COURS'
  FROM students s, annees_academiques aa
  WHERE s.tenant_id = p_tenant_id AND aa.id = p_old_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌──────────────────────────────────────────────────────────────┐
-- │  PARTIE 20 : DOSSIERS DE BOURSE (ANAB)                     │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS dossiers_bourse (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  type_bourse TEXT NOT NULL, -- 'Bourse d''État', 'Bourse ANAB', 'Bourse d''excellence', 'Exonéré'
  annee_academique_id TEXT REFERENCES annees_academiques(id),
  statut TEXT DEFAULT 'SOUMIS' CHECK (statut IN ('SOUMIS','EN_COURS','ATTRIBUÉ','REFUSÉ','SUSPENDU')),
  date_soumission DATE DEFAULT CURRENT_DATE,
  date_attribution DATE,
  montant_mensuel INT DEFAULT 0,
  reference_anab TEXT, -- numéro de référence ANAB
  pieces_jointes TEXT[], -- liste de fichiers
  commentaire TEXT,
  traite_par TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bourse_student ON dossiers_bourse(student_id);
CREATE INDEX IF NOT EXISTS idx_bourse_statut ON dossiers_bourse(statut);
CREATE INDEX IF NOT EXISTS idx_bourse_tenant ON dossiers_bourse(tenant_id);

ALTER TABLE dossiers_bourse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_bourses" ON dossiers_bourse FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','scolarite','comptabilite') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "student_own_bourse" ON dossiers_bourse FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE email = auth.jwt() ->> 'email')
);

-- ┌──────────────────────────────────────────────────────────────┐
-- │  PARTIE 21 : DÉLIBÉRATIONS & CIRCUIT DE VALIDATION NOTES   │
-- └──────────────────────────────────────────────────────────────┘

-- Config publication notes par tenant
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS notes_config JSONB DEFAULT '{
  "saisie_par": "enseignant",
  "visibilite_etudiants": "apres_deliberation",
  "modification_circuit": true
}'::jsonb;

-- Délibérations (sessions de jury)
CREATE TABLE IF NOT EXISTS deliberations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  semestre_id TEXT REFERENCES semestres(id) ON DELETE CASCADE,
  annee_academique_id TEXT REFERENCES annees_academiques(id),
  filiere_id TEXT REFERENCES filieres(id),
  label TEXT NOT NULL,
  date_deliberation DATE,
  statut TEXT DEFAULT 'PRÉPARATION' CHECK (statut IN ('PRÉPARATION','EN_COURS','VALIDÉE','PUBLIÉE')),
  president_jury TEXT,
  membres_jury TEXT[],
  pv_url TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Liste de présence jury
CREATE TABLE IF NOT EXISTS jury_presences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  deliberation_id TEXT REFERENCES deliberations(id) ON DELETE CASCADE,
  membre_nom TEXT NOT NULL,
  membre_role TEXT, -- 'Président', 'Membre', 'Secrétaire'
  present BOOLEAN DEFAULT true,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Journal de modification des notes (audit trail strict)
CREATE TABLE IF NOT EXISTS notes_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  student_id TEXT,
  matiere TEXT,
  ancienne_valeur NUMERIC(5,2),
  nouvelle_valeur NUMERIC(5,2),
  champ_modifie TEXT NOT NULL, -- 'note_cc', 'note_examen', 'note_final'
  raison TEXT NOT NULL,
  modifie_par TEXT NOT NULL,
  modifie_par_role TEXT NOT NULL,
  approuve_par TEXT, -- si circuit de validation
  approuve BOOLEAN DEFAULT false,
  deliberation_id TEXT REFERENCES deliberations(id),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger d'audit automatique sur modification de note
CREATE OR REPLACE FUNCTION audit_note_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.note_final IS DISTINCT FROM NEW.note_final THEN
    INSERT INTO notes_audit_log (note_id, student_id, matiere, ancienne_valeur, nouvelle_valeur, champ_modifie, raison, modifie_par, modifie_par_role, tenant_id)
    VALUES (NEW.id, NEW.student_id, NEW.matiere, OLD.note_final, NEW.note_final, 'note_final', 'Modification directe', COALESCE(current_setting('app.current_user', true), 'system'), COALESCE(current_setting('app.current_role', true), 'system'), NEW.tenant_id);
  END IF;
  IF OLD.note_cc IS DISTINCT FROM NEW.note_cc THEN
    INSERT INTO notes_audit_log (note_id, student_id, matiere, ancienne_valeur, nouvelle_valeur, champ_modifie, raison, modifie_par, modifie_par_role, tenant_id)
    VALUES (NEW.id, NEW.student_id, NEW.matiere, OLD.note_cc, NEW.note_cc, 'note_cc', 'Modification directe', COALESCE(current_setting('app.current_user', true), 'system'), COALESCE(current_setting('app.current_role', true), 'system'), NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_audit_notes
  AFTER UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION audit_note_modification();

ALTER TABLE deliberations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jury_presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_deliberations" ON deliberations FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','scolarite') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "staff_jury" ON jury_presences FOR ALL USING (true);
CREATE POLICY "staff_notes_audit" ON notes_audit_log FOR ALL USING (tenant_id = public.get_user_tenant());

-- ┌──────────────────────────────────────────────────────────────┐
-- │  PARTIE 22 : SCAFFOLD PAIEMENT EN LIGNE                    │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS transactions_paiement (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  echeance_id TEXT REFERENCES echeances(id),
  montant INT NOT NULL CHECK (montant > 0),
  methode TEXT NOT NULL CHECK (methode IN ('AIRTEL_MONEY','NITA','AMANA','VIREMENT','ESPECES','CARTE','AUTRE')),
  reference_externe TEXT, -- ID transaction du prestataire
  statut TEXT DEFAULT 'INITIÉE' CHECK (statut IN ('INITIÉE','EN_ATTENTE','CONFIRMÉE','ÉCHOUÉE','ANNULÉE','REMBOURSÉE')),
  telephone TEXT, -- pour Airtel Money
  metadata JSONB DEFAULT '{}',
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions_paiement(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_statut ON transactions_paiement(statut);
ALTER TABLE transactions_paiement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_transactions" ON transactions_paiement FOR ALL USING (tenant_id = public.get_user_tenant());


-- ┌──────────────────────────────────────────────────────────────┐
-- │  PARTIE 23 : BIBLIOTHÈQUE COMPLÈTE                         │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS ouvrages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titre TEXT NOT NULL,
  auteur TEXT,
  isbn TEXT,
  editeur TEXT,
  annee_publication INT,
  categorie TEXT DEFAULT 'Général',
  exemplaires INT DEFAULT 1,
  disponibles INT DEFAULT 1,
  emplacement TEXT, -- ex: Rayon A3-Étagère 2
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emprunts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ouvrage_id TEXT REFERENCES ouvrages(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  date_emprunt DATE DEFAULT CURRENT_DATE,
  date_retour_prevue DATE NOT NULL,
  date_retour_effective DATE,
  statut TEXT DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS','RENDU','EN_RETARD','PERDU')),
  penalite INT DEFAULT 0,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ouvrages_tenant ON ouvrages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ouvrages_categorie ON ouvrages(categorie);
CREATE INDEX IF NOT EXISTS idx_emprunts_student ON emprunts(student_id);
CREATE INDEX IF NOT EXISTS idx_emprunts_ouvrage ON emprunts(ouvrage_id);
CREATE INDEX IF NOT EXISTS idx_emprunts_statut ON emprunts(statut);
CREATE INDEX IF NOT EXISTS idx_emprunts_tenant ON emprunts(tenant_id);

ALTER TABLE ouvrages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprunts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_ouvrages" ON ouvrages FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','bibliotheque') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "read_ouvrages" ON ouvrages FOR SELECT USING (tenant_id = public.get_user_tenant());
CREATE POLICY "tenant_emprunts" ON emprunts FOR ALL USING (
  public.get_user_role() IN ('super_admin','admin_universite','bibliotheque') AND tenant_id = public.get_user_tenant()
);
CREATE POLICY "student_own_emprunts" ON emprunts FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE email = auth.jwt() ->> 'email')
);

-- Trigger : marquer les emprunts en retard automatiquement
CREATE OR REPLACE FUNCTION check_emprunts_retard()
RETURNS void AS $$
BEGIN
  UPDATE emprunts SET statut = 'EN_RETARD'
  WHERE statut = 'EN_COURS' AND date_retour_prevue < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger : décrémenter/incrémenter les exemplaires disponibles
CREATE OR REPLACE FUNCTION update_ouvrage_dispo()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.statut = 'EN_COURS' THEN
    UPDATE ouvrages SET disponibles = GREATEST(0, disponibles - 1) WHERE id = NEW.ouvrage_id;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.statut IN ('RENDU','PERDU') AND OLD.statut = 'EN_COURS' THEN
    UPDATE ouvrages SET disponibles = LEAST(exemplaires, disponibles + 1) WHERE id = NEW.ouvrage_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_update_dispo
  AFTER INSERT OR UPDATE ON emprunts
  FOR EACH ROW EXECUTE FUNCTION update_ouvrage_dispo();


-- Photo pour enseignants et personnel
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT;

-- ┌──────────────────────────────────────────────────────────────┐
-- │  PARTIE 24 : CONTRAINTES D'INTÉGRITÉ MÉTIER               │
-- │  (Audit Senior Architect)                                   │
-- └──────────────────────────────────────────────────────────────┘

-- Un étudiant ne peut avoir qu'une seule note par matière et semestre
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_note_student_matiere 
  ON notes(student_id, matiere, semestre_id) WHERE semestre_id IS NOT NULL;

-- Un étudiant ne peut avoir qu'un seul badge actif
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_badge_student 
  ON badges(student_id) WHERE status = 'ACTIVE';

-- Un étudiant ne peut être inscrit que dans une seule faculté par année
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_faculte_annee 
  ON parcours_academique(student_id, annee_academique_id);

-- Un seul dossier de bourse par étudiant par année
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_bourse_student_annee 
  ON dossiers_bourse(student_id, annee_academique_id);

-- Un cours ne peut pas être planifié 2 fois au même créneau dans la même salle
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_edt_salle_creneau 
  ON edts(jour, heure, salle_id) WHERE salle_id IS NOT NULL;

-- Un push subscription par utilisateur
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_push_user 
  ON push_subscriptions(user_id);

-- Empêcher les doublons d'email dans users pour un même tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_email_tenant 
  ON users(email, tenant_id);

-- Empêcher les doublons de matricule dans students pour un même tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_matricule_tenant 
  ON students(matricule, tenant_id) WHERE matricule IS NOT NULL;

-- RLS sur admin_totp_secrets : JAMAIS accessible via anon key
DROP POLICY IF EXISTS "totp_admin_only" ON admin_totp_secrets;
CREATE POLICY "totp_service_only" ON admin_totp_secrets FOR SELECT USING (false);
-- Les secrets TOTP ne doivent JAMAIS être lisibles depuis le frontend.
-- La vérification doit se faire via Edge Function côté serveur.


-- F2: Interdire les notes sans enseignant assigné
ALTER TABLE notes ALTER COLUMN prof SET NOT NULL;
ALTER TABLE notes ALTER COLUMN prof SET DEFAULT '';

-- F3: Soft delete pour les tenants (archivage au lieu de suppression)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Fonction de suppression douce
CREATE OR REPLACE FUNCTION soft_delete_tenant(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tenants SET is_deleted = true, deleted_at = now(), status = 'DELETED' WHERE id = p_tenant_id;
  UPDATE students SET is_deleted = true, deleted_at = now() WHERE tenant_id = p_tenant_id;
  UPDATE users SET role = 'disabled' WHERE tenant_id = p_tenant_id AND role != 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: exclure les enregistrements soft-deleted
CREATE POLICY "hide_deleted_tenants" ON tenants FOR SELECT USING (is_deleted = false OR is_deleted IS NULL);
CREATE POLICY "hide_deleted_students" ON students FOR SELECT USING (is_deleted = false OR is_deleted IS NULL);


-- ┌──────────────────────────────────────────────────────────────┐
-- │  PARTIE 25 : DEMANDES DE CONTACT (site vitrine)            │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS contact_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  etablissement TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'demo', -- 'demo', 'devis', 'support', 'autre'
  traite BOOLEAN DEFAULT false,
  traite_par TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_requests(created_at DESC);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Insertion anonyme (depuis le site vitrine sans auth)
CREATE POLICY "public_insert_contact" ON contact_requests FOR INSERT WITH CHECK (true);

-- Lecture pour SuperAdmin et Admin Universite
CREATE POLICY "admin_read_contact" ON contact_requests FOR SELECT USING (
  public.get_user_role() IN ('super_admin', 'admin_universite')
);

