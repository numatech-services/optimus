-- ══════════════════════════════════════════════════════
-- OPTIMUS CAMPUS — Données d'initialisation (FIXED)
-- Exécuter APRÈS 001_complete_setup.sql et 002_system_config.sql
-- ══════════════════════════════════════════════════════

-- ── 1. Tenants (universités) ──
INSERT INTO tenants (id, name, country, plan, status, students_count, teachers_count, campus_count, mrr, subscription_plan, subscription_expires_at) VALUES
  ('univ-niamey', 'Université de Niamey', 'Niger', 'PREMIUM', 'ACTIVE', 3240, 45, 2, 1200000, 'PREMIUM', '2027-09-30'),
  ('univ-dosso',  'Université de Dosso',  'Niger', 'STANDARD', 'ACTIVE', 1850, 28, 1, 750000,  'STANDARD', '2027-06-30'),
  ('univ-diffa',  'Université de Diffa',  'Niger', 'STANDARD', 'ACTIVE', 980,  18, 1, 500000,  'STANDARD', '2027-06-30'),
  ('eccam',       'ECCAM',                'Niger', 'STARTER',  'SETUP',  640,  12, 1, 250000,  'STARTER',  '2027-03-31')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Users (profils applicatifs) ──
-- NOTE: These emails MUST match auth users you create in Supabase Dashboard > Authentication > Users
INSERT INTO users (id, email, name, role, tenant_id) VALUES
  ('usr-superadmin', 'superadmin@optimuscampus.com', 'Super Admin', 'super_admin', NULL),
  ('usr-admin-niamey', 'admin@univ-niamey.ne', 'Admin Niamey', 'admin_universite', 'univ-niamey'),
  ('usr-admin-dosso', 'admin@univ-dosso.ne', 'Admin Dosso', 'admin_universite', 'univ-dosso'),
  ('usr-scolarite', 'scolarite@univ-niamey.ne', 'Scolarité Niamey', 'scolarite', 'univ-niamey'),
  ('usr-comptable', 'comptable@univ-niamey.ne', 'Comptable Niamey', 'comptabilite', 'univ-niamey'),
  ('usr-biblio', 'bibliotheque@univ-niamey.ne', 'Bibliothécaire', 'bibliotheque', 'univ-niamey')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Années académiques ──
INSERT INTO annees_academiques (id, label, date_debut, date_fin, active, tenant_id) VALUES
  ('aa-2025-2026-niamey', '2025-2026', '2025-10-01', '2026-07-31', true, 'univ-niamey'),
  ('aa-2025-2026-dosso',  '2025-2026', '2025-10-01', '2026-07-31', true, 'univ-dosso')
ON CONFLICT (id) DO NOTHING;

-- ── 4. Semestres ──
INSERT INTO semestres (id, code, label, niveau, annee_academique_id, tenant_id) VALUES
  ('sem-s1-l1-niamey', 'S1', 'Semestre 1 — L1', 'L1', 'aa-2025-2026-niamey', 'univ-niamey'),
  ('sem-s2-l1-niamey', 'S2', 'Semestre 2 — L1', 'L1', 'aa-2025-2026-niamey', 'univ-niamey'),
  ('sem-s3-l2-niamey', 'S3', 'Semestre 3 — L2', 'L2', 'aa-2025-2026-niamey', 'univ-niamey'),
  ('sem-s4-l2-niamey', 'S4', 'Semestre 4 — L2', 'L2', 'aa-2025-2026-niamey', 'univ-niamey'),
  ('sem-s5-l3-niamey', 'S5', 'Semestre 5 — L3', 'L3', 'aa-2025-2026-niamey', 'univ-niamey'),
  ('sem-s6-l3-niamey', 'S6', 'Semestre 6 — L3', 'L3', 'aa-2025-2026-niamey', 'univ-niamey')
ON CONFLICT (id) DO NOTHING;

-- ── 5. Facultés ──
INSERT INTO facultes (id, nom, code, doyen, tenant_id) VALUES
  ('fac-st',  'Faculté des Sciences et Techniques',      'FST',  'Pr. Abdou Moussa',  'univ-niamey'),
  ('fac-lsh', 'Faculté des Lettres et Sciences Humaines','FLSH', 'Pr. Aïssa Djibo',   'univ-niamey'),
  ('fac-se',  'Faculté des Sciences Économiques',        'FSE',  'Pr. Ibrahim Sani',  'univ-niamey'),
  ('fac-it',  'Institut de Technologie',                 'IT',   'Dr. Moussa Harouna','univ-niamey')
ON CONFLICT (id) DO NOTHING;

-- ── 6. Départements ──
INSERT INTO departements (id, nom, code, faculte_id, tenant_id) VALUES
  ('dep-info',    'Informatique',          'INFO',    'fac-st',  'univ-niamey'),
  ('dep-math',    'Mathématiques',         'MATH',    'fac-st',  'univ-niamey'),
  ('dep-phys',    'Physique',              'PHYS',    'fac-st',  'univ-niamey'),
  ('dep-droit',   'Droit',                 'DROIT',   'fac-lsh', 'univ-niamey'),
  ('dep-lettres', 'Lettres',               'LETTRES', 'fac-lsh', 'univ-niamey'),
  ('dep-eco',     'Sciences Économiques',  'ECO',     'fac-se',  'univ-niamey'),
  ('dep-gestion', 'Gestion',               'GEST',    'fac-se',  'univ-niamey'),
  ('dep-genie',   'Génie Civil',           'GC',      'fac-it',  'univ-niamey')
ON CONFLICT (id) DO NOTHING;

-- ── 7. Salles ──
INSERT INTO salles (id, nom, code, batiment, etage, capacite, type, equipements, tenant_id) VALUES
  ('salle-a1',   'Amphi A',            'AMPA', 'Bâtiment Principal', 'RDC',   300, 'AMPHI', ARRAY['Vidéoprojecteur','Sono','Climatisation'], 'univ-niamey'),
  ('salle-a2',   'Amphi B',            'AMPB', 'Bâtiment Principal', 'RDC',   200, 'AMPHI', ARRAY['Vidéoprojecteur','Sono'], 'univ-niamey'),
  ('salle-b1',   'Salle B12',          'B12',  'Bâtiment B',         '1er',    50, 'COURS', ARRAY['Vidéoprojecteur','Tableau blanc'], 'univ-niamey'),
  ('salle-b2',   'Salle B14',          'B14',  'Bâtiment B',         '1er',    50, 'COURS', ARRAY['Vidéoprojecteur'], 'univ-niamey'),
  ('salle-c1',   'Salle C4',           'C4',   'Bâtiment C',         'RDC',    40, 'TD',    ARRAY['Tableau blanc'], 'univ-niamey'),
  ('salle-c2',   'Salle C6',           'C6',   'Bâtiment C',         'RDC',    40, 'TD',    ARRAY['Tableau blanc'], 'univ-niamey'),
  ('salle-lab1', 'Labo Informatique 1','LAB1', 'Bâtiment B',         '2ème',   30, 'TP',    ARRAY['Ordinateurs','Wifi','Climatisation'], 'univ-niamey'),
  ('salle-lab2', 'Labo Informatique 2','LAB2', 'Bâtiment B',         '2ème',   30, 'TP',    ARRAY['Ordinateurs','Wifi'], 'univ-niamey'),
  ('salle-ex1',  'Salle Examen 1',     'EX1',  'Bâtiment Principal', '1er',   100, 'EXAMEN',ARRAY['Vidéoprojecteur'], 'univ-niamey'),
  ('salle-ex2',  'Salle Examen 2',     'EX2',  'Bâtiment Principal', '1er',    80, 'EXAMEN',ARRAY[]::TEXT[], 'univ-niamey')
ON CONFLICT (id) DO NOTHING;

-- ── 8. Config tenant ──
INSERT INTO tenant_config (tenant_id, type_etablissement) VALUES
  ('univ-niamey', 'PUBLIC'),
  ('univ-dosso',  'PUBLIC'),
  ('univ-diffa',  'PUBLIC'),
  ('eccam',       'PRIVE')
ON CONFLICT (tenant_id) DO NOTHING;

-- ── 9. Plans de facturation ──
INSERT INTO billing_plans (id, name, prix, features, max_users, max_storage_gb) VALUES
  ('plan-starter',    'Starter',    25000,  ARRAY['5 utilisateurs','3 modules','1 Go stockage','Support email'], 5, 1),
  ('plan-standard',   'Standard',   75000,  ARRAY['20 utilisateurs','Tous les modules','10 Go stockage','Support prioritaire','API'], 20, 10),
  ('plan-premium',    'Premium',    200000, ARRAY['50 utilisateurs','Tous les modules','50 Go stockage','Support dédié','API','SLA'], 50, 50),
  ('plan-enterprise', 'Enterprise', 0,      ARRAY['Utilisateurs illimités','Tous les modules','Stockage illimité','Support dédié','SLA'], NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════
-- ✅ Initialisation terminée
-- ══════════════════════════════════════════════════════
