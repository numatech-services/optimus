-- ══════════════════════════════════════════════════════════════
-- OPTIMUS CAMPUS — BASE DE DONNÉES DE TEST
-- 5 universités · 520 étudiants · 50 enseignants · 20 agents
-- Exécuter APRÈS 001_complete_setup.sql ET init_data.sql
-- ══════════════════════════════════════════════════════════════

-- ┌──────────────────────────────────────────────────┐
-- │  1. UNIVERSITÉS (3 publiques, 2 privées)         │
-- └──────────────────────────────────────────────────┘

INSERT INTO tenants (id, name, domain, status, subscription_plan, subscription_expires_at) VALUES
  ('univ-a', 'Université de la Renaissance', 'univ-renaissance.ne', 'ACTIVE', 'PREMIUM', '2027-09-30'),
  ('univ-b', 'Université du Sahel', 'univ-sahel.ne', 'ACTIVE', 'STANDARD', '2027-09-30'),
  ('univ-c', 'Université des Sciences du Niger', 'univ-sciences.ne', 'ACTIVE', 'STANDARD', '2027-09-30'),
  ('univ-d', 'Institut Privé des Hautes Études', 'iphe.ne', 'ACTIVE', 'PREMIUM', '2027-06-30'),
  ('univ-e', 'École Supérieure de Commerce', 'esc-niger.ne', 'ACTIVE', 'STARTER', '2027-03-31')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_config (id, tenant_id, type_etablissement, notes_config) VALUES
  ('cfg-a', 'univ-a', 'PUBLIC', '{"saisie_par":"enseignant","visibilite_etudiants":"apres_deliberation","modification_circuit":true}'),
  ('cfg-b', 'univ-b', 'PUBLIC', '{"saisie_par":"enseignant","visibilite_etudiants":"apres_deliberation","modification_circuit":true}'),
  ('cfg-c', 'univ-c', 'PUBLIC', '{"saisie_par":"scolarite","visibilite_etudiants":"apres_deliberation","modification_circuit":true}'),
  ('cfg-d', 'univ-d', 'PRIVE', '{"saisie_par":"enseignant","visibilite_etudiants":"au_fil_eau","modification_circuit":false}'),
  ('cfg-e', 'univ-e', 'PRIVE', '{"saisie_par":"enseignant","visibilite_etudiants":"au_fil_eau","modification_circuit":false}')
ON CONFLICT (id) DO NOTHING;

-- ┌──────────────────────────────────────────────────┐
-- │  2. ANNÉES ACADÉMIQUES + SEMESTRES               │
-- └──────────────────────────────────────────────────┘

INSERT INTO annees_academiques (id, label, date_debut, date_fin, active, tenant_id)
SELECT 'aa-' || t.id, '2025-2026', '2025-10-01', '2026-07-31', true, t.id
FROM tenants t WHERE t.id IN ('univ-a','univ-b','univ-c','univ-d','univ-e')
ON CONFLICT (id) DO NOTHING;

-- ┌──────────────────────────────────────────────────┐
-- │  3. COMPTES UTILISATEURS (8 rôles)               │
-- └──────────────────────────────────────────────────┘

-- SuperAdmin
INSERT INTO users (id, email, name, role, tenant_id) VALUES
  ('usr-sa', 'superadmin@optimus.test', 'Administrateur Plateforme', 'super_admin', 'univ-a')
ON CONFLICT (id) DO NOTHING;

-- Admins université (1 par tenant)
INSERT INTO users (id, email, name, role, tenant_id) VALUES
  ('usr-admin-a', 'admin@univ-a.test', 'Dr. Abdoulaye Maïga', 'admin_universite', 'univ-a'),
  ('usr-admin-b', 'admin@univ-b.test', 'Pr. Mariama Diallo', 'admin_universite', 'univ-b'),
  ('usr-admin-c', 'admin@univ-c.test', 'Pr. Ousmane Garba', 'admin_universite', 'univ-c'),
  ('usr-admin-d', 'admin@univ-d.test', 'Mme Halima Issaka', 'admin_universite', 'univ-d'),
  ('usr-admin-e', 'admin@univ-e.test', 'M. Amadou Boubacar', 'admin_universite', 'univ-e')
ON CONFLICT (id) DO NOTHING;

-- Agents (Univ A)
INSERT INTO users (id, email, name, role, tenant_id) VALUES
  ('usr-scol-a', 'scolarite@univ-a.test', 'Aïchatou Issoufou', 'scolarite', 'univ-a'),
  ('usr-bib-a', 'bibliotheque@univ-a.test', 'Fati Moussa', 'bibliotheque', 'univ-a'),
  ('usr-compta-a', 'compta@univ-a.test', 'Ibrahim Sani', 'comptabilite', 'univ-a'),
  ('usr-surv-a', 'securite@univ-a.test', 'Boubacar Garba', 'surveillant', 'univ-a'),
  ('usr-ens-a', 'enseignant@univ-a.test', 'Pr. Moussa Abdou', 'enseignant', 'univ-a'),
  ('usr-etu-a', 'etudiant@univ-a.test', 'Hadiza Mahamadou', 'etudiant', 'univ-a')
ON CONFLICT (id) DO NOTHING;

-- ┌──────────────────────────────────────────────────┐
-- │  4. FACULTÉS + DÉPARTEMENTS (Univ A)             │
-- └──────────────────────────────────────────────────┘

INSERT INTO facultes (id, nom, code, doyen, tenant_id) VALUES
  ('fac-a-st', 'Faculté des Sciences et Techniques', 'FST', 'Pr. Moussa Abdou', 'univ-a'),
  ('fac-a-lsh', 'Faculté des Lettres et Sciences Humaines', 'FLSH', 'Pr. Aïssa Djibo', 'univ-a'),
  ('fac-a-se', 'Faculté des Sciences Économiques', 'FSE', 'Pr. Ibrahim Sani', 'univ-a')
ON CONFLICT (id) DO NOTHING;

INSERT INTO departements (id, nom, code, faculte_id, tenant_id) VALUES
  ('dep-a-info', 'Informatique', 'INFO', 'fac-a-st', 'univ-a'),
  ('dep-a-math', 'Mathématiques', 'MATH', 'fac-a-st', 'univ-a'),
  ('dep-a-droit', 'Droit', 'DROIT', 'fac-a-lsh', 'univ-a'),
  ('dep-a-eco', 'Économie', 'ECO', 'fac-a-se', 'univ-a')
ON CONFLICT (id) DO NOTHING;

-- ┌──────────────────────────────────────────────────┐
-- │  5. SALLES (Univ A — 10 salles)                  │
-- └──────────────────────────────────────────────────┘

INSERT INTO salles (id, nom, code, batiment, etage, capacite, type, equipements, tenant_id) VALUES
  ('sal-a1', 'Amphi A', 'AMPA', 'Bâtiment Central', 'RDC', 300, 'AMPHI', ARRAY['Vidéoprojecteur','Sono','Climatisation'], 'univ-a'),
  ('sal-a2', 'Amphi B', 'AMPB', 'Bâtiment Central', 'RDC', 200, 'AMPHI', ARRAY['Vidéoprojecteur','Sono'], 'univ-a'),
  ('sal-a3', 'Salle 101', 'S101', 'Bâtiment A', '1er', 50, 'COURS', ARRAY['Vidéoprojecteur','Tableau blanc'], 'univ-a'),
  ('sal-a4', 'Salle 102', 'S102', 'Bâtiment A', '1er', 50, 'COURS', ARRAY['Vidéoprojecteur'], 'univ-a'),
  ('sal-a5', 'Salle TD1', 'TD1', 'Bâtiment B', 'RDC', 40, 'TD', ARRAY['Tableau blanc'], 'univ-a'),
  ('sal-a6', 'Salle TD2', 'TD2', 'Bâtiment B', 'RDC', 40, 'TD', ARRAY['Tableau blanc'], 'univ-a'),
  ('sal-a7', 'Labo Info 1', 'LAB1', 'Bâtiment A', '2ème', 30, 'TP', ARRAY['Ordinateurs','Wifi','Climatisation'], 'univ-a'),
  ('sal-a8', 'Labo Info 2', 'LAB2', 'Bâtiment A', '2ème', 30, 'TP', ARRAY['Ordinateurs','Wifi'], 'univ-a'),
  ('sal-a9', 'Salle Examen 1', 'EX1', 'Bâtiment Central', '1er', 100, 'EXAMEN', ARRAY['Vidéoprojecteur'], 'univ-a'),
  ('sal-a10', 'Salle Réunion', 'REUN', 'Administration', '2ème', 20, 'REUNION', ARRAY['Vidéoprojecteur','Wifi'], 'univ-a')
ON CONFLICT (id) DO NOTHING;

-- ┌──────────────────────────────────────────────────┐
-- │  6. 520 ÉTUDIANTS (répartition réaliste)         │
-- │  52% hommes, 48% femmes, L1→M2                   │
-- └──────────────────────────────────────────────────┘

-- Noms nigériens réalistes (prénoms et noms)
DO $$
DECLARE
  prenoms_h TEXT[] := ARRAY['Abdou','Ibrahim','Moussa','Boubacar','Amadou','Issoufou','Harouna','Ousmane','Saidou','Mahamadou','Garba','Yacouba','Issa','Hamidou','Ali','Salissou','Djibo','Adamou','Soumana','Maman'];
  prenoms_f TEXT[] := ARRAY['Hadiza','Mariama','Fati','Aïchatou','Rahila','Zara','Salamatou','Balkissa','Nana','Rabi','Haoua','Amina','Binta','Safiatou','Hassana','Maimouna','Nafissa','Oumou','Djeneba','Fatima'];
  noms TEXT[] := ARRAY['Mahamadou','Issoufou','Abdou','Moussa','Garba','Ibrahim','Boubacar','Diallo','Harouna','Sani','Djibo','Adamou','Oumarou','Souley','Maïga','Idi','Yacouba','Mamane','Seydou','Hassane'];
  niveaux TEXT[] := ARRAY['L1','L1','L1','L2','L2','L3','L3','M1','M2'];
  filieres TEXT[] := ARRAY['Informatique','Mathématiques','Droit','Économie','Gestion','Lettres','Physique','Chimie'];
  univ_ids TEXT[] := ARRAY['univ-a','univ-a','univ-a','univ-a','univ-b','univ-b','univ-c','univ-d','univ-e'];
  i INT;
  prenom TEXT;
  nom TEXT;
  genre TEXT;
  niv TEXT;
  fil TEXT;
  tid TEXT;
  age_offset INT;
  matricule TEXT;
BEGIN
  FOR i IN 1..520 LOOP
    -- Répartition 52% hommes, 48% femmes
    IF random() < 0.52 THEN
      genre := 'M';
      prenom := prenoms_h[1 + floor(random() * 20)::int];
    ELSE
      genre := 'F';
      prenom := prenoms_f[1 + floor(random() * 20)::int];
    END IF;
    
    nom := noms[1 + floor(random() * 20)::int];
    niv := niveaux[1 + floor(random() * 9)::int];
    fil := filieres[1 + floor(random() * 8)::int];
    tid := univ_ids[1 + floor(random() * 9)::int];
    age_offset := 17 + floor(random() * 12)::int;
    matricule := 'ETU-' || (2020 + floor(random() * 6)::int) || '-' || lpad(i::text, 4, '0');
    
    INSERT INTO students (id, nom, prenom, email, matricule, genre, niveau, filiere, date_naissance, status, tenant_id, est_boursier, annee_inscription)
    VALUES (
      'stu-' || lpad(i::text, 4, '0'),
      nom, prenom,
      lower(prenom) || '.' || lower(nom) || i || '@test.ne',
      matricule, genre, niv, fil,
      ('2008-01-01'::date - (age_offset * interval '365 days'))::date,
      CASE WHEN random() < 0.05 THEN 'INACTIF' ELSE 'ACTIF' END,
      tid,
      random() < 0.2,
      '2025-2026'
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- ┌──────────────────────────────────────────────────┐
-- │  7. 50 ENSEIGNANTS (30 permanents, 20 vacataires)│
-- └──────────────────────────────────────────────────┘

DO $$
DECLARE
  prenoms TEXT[] := ARRAY['Abdou','Ibrahim','Moussa','Boubacar','Amadou','Issoufou','Harouna','Ousmane','Aïssa','Mariama','Fati','Hadiza','Rahila','Zara','Salamatou'];
  noms TEXT[] := ARRAY['Mahamadou','Issoufou','Abdou','Moussa','Garba','Ibrahim','Boubacar','Diallo','Harouna','Sani','Djibo','Adamou','Oumarou','Souley','Maïga'];
  specs TEXT[] := ARRAY['Informatique','Mathématiques','Physique','Chimie','Droit','Économie','Gestion','Lettres','Histoire','Anglais'];
  grades TEXT[] := ARRAY['Professeur','Maître de conférences','Maître assistant','Chargé de cours','Vacataire'];
  i INT;
BEGIN
  FOR i IN 1..50 LOOP
    INSERT INTO teachers (id, nom, prenom, email, specialite, grade, statut, heures_prevues, heures_effectuees, tenant_id)
    VALUES (
      'tea-' || lpad(i::text, 3, '0'),
      noms[1 + floor(random() * 15)::int],
      prenoms[1 + floor(random() * 15)::int],
      'prof' || i || '@test.ne',
      specs[1 + floor(random() * 10)::int],
      CASE WHEN i <= 30 THEN grades[1 + floor(random() * 4)::int] ELSE 'Vacataire' END,
      CASE WHEN i <= 30 THEN 'Permanent' ELSE 'Vacataire' END,
      CASE WHEN i <= 30 THEN 180 ELSE 100 END,
      floor(random() * 150)::int,
      CASE WHEN i <= 20 THEN 'univ-a' WHEN i <= 30 THEN 'univ-b' WHEN i <= 40 THEN 'univ-c' ELSE 'univ-d' END
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- ┌──────────────────────────────────────────────────┐
-- │  8. NOTES (5000+ notes pour 3 promotions)        │
-- └──────────────────────────────────────────────────┘

DO $$
DECLARE
  matieres TEXT[] := ARRAY['Algorithmique','Base de données','Réseaux','Mathématiques','Physique','Droit Civil','Droit Constitutionnel','Micro-économie','Macro-économie','Anglais','Français','Gestion','Comptabilité','Statistiques','Chimie Générale'];
  rec RECORD;
  mat TEXT;
  note_cc NUMERIC;
  note_ex NUMERIC;
  note_final NUMERIC;
BEGIN
  FOR rec IN SELECT id, niveau, tenant_id FROM students WHERE status = 'ACTIF' LIMIT 400 LOOP
    FOR j IN 1..array_length(matieres, 1) LOOP
      IF random() < 0.35 THEN -- chaque étudiant a ~5 notes
        note_cc := round((random() * 16 + 4)::numeric, 1);
        note_ex := round((random() * 16 + 4)::numeric, 1);
        note_final := round((note_cc * 0.4 + note_ex * 0.6)::numeric, 2);
        INSERT INTO notes (id, student_id, matiere, note_cc, note_examen, note_final, coefficient, enseignant, tenant_id, publie)
        VALUES (
          gen_random_uuid()::text, rec.id,
          matieres[j], note_cc, note_ex, note_final,
          CASE WHEN j <= 5 THEN 4 ELSE 2 END,
          'Pr. Test', rec.tenant_id, true
        ) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ┌──────────────────────────────────────────────────┐
-- │  9. PAIEMENTS (2000+ sur 12 mois)               │
-- └──────────────────────────────────────────────────┘

DO $$
DECLARE
  methodes TEXT[] := ARRAY['AIRTEL_MONEY','NITA','AMANA','ESPECES','VIREMENT'];
  rec RECORD;
  m INT;
BEGIN
  FOR rec IN SELECT id, tenant_id, est_boursier FROM students WHERE status = 'ACTIF' LIMIT 400 LOOP
    -- Frais inscription
    INSERT INTO paiements (id, student_id, montant, methode, statut, description, tenant_id, created_at)
    VALUES (gen_random_uuid()::text, rec.id,
      CASE WHEN rec.est_boursier THEN 25000 ELSE 50000 END,
      methodes[1 + floor(random() * 5)::int], 'PAYÉ', 'Frais inscription',
      rec.tenant_id, '2025-10-' || lpad((1+floor(random()*28))::text, 2, '0') || ' 10:00:00+00')
    ON CONFLICT DO NOTHING;
    
    -- Frais scolarité S1
    IF random() < 0.87 THEN
      INSERT INTO paiements (id, student_id, montant, methode, statut, description, tenant_id, created_at)
      VALUES (gen_random_uuid()::text, rec.id,
        CASE WHEN rec.est_boursier THEN 37500 ELSE 175000 END,
        methodes[1 + floor(random() * 5)::int], 'PAYÉ', 'Frais scolarité S1',
        rec.tenant_id, '2025-11-' || lpad((1+floor(random()*28))::text, 2, '0') || ' 10:00:00+00')
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO paiements (id, student_id, montant, methode, statut, description, tenant_id, created_at)
      VALUES (gen_random_uuid()::text, rec.id,
        CASE WHEN rec.est_boursier THEN 37500 ELSE 175000 END,
        methodes[1 + floor(random() * 5)::int], 'EN RETARD', 'Frais scolarité S1',
        rec.tenant_id, '2025-11-15 10:00:00+00')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Frais scolarité S2 (partiel)
    IF random() < 0.6 THEN
      INSERT INTO paiements (id, student_id, montant, methode, statut, description, tenant_id, created_at)
      VALUES (gen_random_uuid()::text, rec.id,
        CASE WHEN rec.est_boursier THEN 37500 ELSE 175000 END,
        methodes[1 + floor(random() * 5)::int], 'PAYÉ', 'Frais scolarité S2',
        rec.tenant_id, '2026-02-' || lpad((1+floor(random()*28))::text, 2, '0') || ' 10:00:00+00')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ┌──────────────────────────────────────────────────┐
-- │  10. BADGES + LOGS D'ACCÈS (10 000+)            │
-- └──────────────────────────────────────────────────┘

DO $$
DECLARE
  rec RECORD;
  j INT;
BEGIN
  -- Badges pour les 200 premiers étudiants
  FOR rec IN SELECT id, tenant_id FROM students LIMIT 200 LOOP
    INSERT INTO badges (id, student_id, card_number, status, tenant_id)
    VALUES ('bdg-' || rec.id, rec.id, 'RFID-' || upper(substring(md5(rec.id) from 1 for 8)), 'ACTIVE', rec.tenant_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Logs d'accès simulés (50 jours × ~200 entrées/jour)
  FOR j IN 1..10000 LOOP
    INSERT INTO access_events (id, badge_id, device_id, event_type, status, tenant_id, created_at)
    SELECT 
      gen_random_uuid()::text,
      'bdg-stu-' || lpad((1+floor(random()*200))::text, 4, '0'),
      NULL,
      CASE WHEN random() < 0.6 THEN 'ENTRY' ELSE 'EXIT' END,
      CASE WHEN random() < 0.95 THEN 'GRANTED' ELSE 'DENIED' END,
      'univ-a',
      now() - (floor(random() * 50) || ' days')::interval - (floor(random() * 14) || ' hours')::interval
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ┌──────────────────────────────────────────────────┐
-- │  11. COMPTES DE TEST — RÉCAPITULATIF             │
-- └──────────────────────────────────────────────────┘

-- ╔═════════════════════════════════════════════════════════════╗
-- ║  COMPTES DE TEST                                           ║
-- ╠═════════════════════╦══════════════════════╦═══════════════╣
-- ║  Rôle               ║  Email               ║  Mot de passe ║
-- ╠═════════════════════╬══════════════════════╬═══════════════╣
-- ║  SuperAdmin         ║  superadmin@optimus.test  ║  (Supabase Auth) ║
-- ║  Admin Univ A       ║  admin@univ-a.test        ║  (Supabase Auth) ║
-- ║  Scolarité          ║  scolarite@univ-a.test    ║  (Supabase Auth) ║
-- ║  Bibliothèque       ║  bibliotheque@univ-a.test ║  (Supabase Auth) ║
-- ║  Comptabilité       ║  compta@univ-a.test       ║  (Supabase Auth) ║
-- ║  Sécurité           ║  securite@univ-a.test     ║  (Supabase Auth) ║
-- ║  Enseignant         ║  enseignant@univ-a.test   ║  (Supabase Auth) ║
-- ║  Étudiant           ║  etudiant@univ-a.test     ║  (Supabase Auth) ║
-- ╚═════════════════════╩══════════════════════╩═══════════════╝
--
-- NOTE : Les mots de passe doivent être créés via Supabase Auth
-- Dashboard → Authentication → Users → Invite User
-- Mot de passe recommandé pour tests : Test@2026!Niger

