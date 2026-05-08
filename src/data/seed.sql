-- ==========================================
-- 1. NETTOYAGE (Optionnel, attention aux données existantes)
-- ==========================================
DROP TABLE IF EXISTS notifications, convocations, examens, notes, edts, paiements, 
                     access_events, badges, access_rules, access_sessions, 
                     access_groups, readers, devices, students, users, tenants CASCADE;

-- ==========================================
-- 2. CRÉATION DES TABLES
-- ==========================================

-- Universités (Tenants)
CREATE TABLE tenants (
    id TEXT PRIMARY KEY, -- ex: 'univ-dakar'
    name TEXT NOT NULL,
    country TEXT,
    plan TEXT,
    students_count INTEGER,
    teachers_count INTEGER,
    campus_count INTEGER,
    status TEXT,
    mrr INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT,
    tenant_id TEXT REFERENCES tenants(id),
    avatar TEXT,
    matricule TEXT,
    filiere TEXT,
    badge_id TEXT,
    card_number TEXT
);

-- Étudiants
CREATE TABLE students (
    id TEXT PRIMARY KEY, -- Matricule
    nom TEXT,
    prenom TEXT,
    filiere TEXT,
    annee TEXT,
    status TEXT,
    genre TEXT,
    tel TEXT,
    email TEXT
);

-- Matériel (Devices)
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    ip TEXT,
    port INTEGER,
    protocol TEXT,
    location TEXT,
    status TEXT,
    firmware TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    extra_config JSONB -- Pour stocker les spécificités des portiques
);

-- Lecteurs (Readers)
CREATE TABLE readers (
    id TEXT PRIMARY KEY,
    name TEXT,
    controller_id TEXT REFERENCES devices(id),
    side TEXT,
    type TEXT,
    room TEXT,
    capacity INTEGER,
    status TEXT,
    last_event TEXT
);

-- Groupes d'accès
CREATE TABLE access_groups (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    color TEXT,
    member_count INTEGER
);

-- Badges
CREATE TABLE badges (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    card_number TEXT,
    card_type TEXT,
    status TEXT,
    issued_at DATE,
    expires_at DATE,
    access_groups JSONB, -- Stocke le tableau des groupes
    paiement_statut TEXT,
    montant_impaye INTEGER,
    blocage_impayes BOOLEAN,
    blocked_reason TEXT
);

-- Règles d'accès
CREATE TABLE access_rules (
    id TEXT PRIMARY KEY,
    name TEXT,
    device_id TEXT,
    time_zone TEXT,
    groups JSONB,
    status TEXT,
    direction TEXT
);

-- Évènements d'accès (Logs)
CREATE TABLE access_events (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE,
    type TEXT, -- GRANTED, DENIED, UNKNOWN
    card_number TEXT,
    matricule TEXT,
    student_name TEXT,
    filiere TEXT,
    direction TEXT,
    reader_id TEXT REFERENCES readers(id),
    reason TEXT
);

-- Paiements
CREATE TABLE paiements (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    description TEXT,
    montant INTEGER,
    date_paiement TEXT,
    methode TEXT,
    statut TEXT,
    delai_retard INTEGER
);

-- Emploi du temps (EDT)
CREATE TABLE edts (
    id TEXT PRIMARY KEY,
    filiere TEXT,
    jour TEXT,
    heure TEXT,
    matiere TEXT,
    code TEXT,
    prof TEXT,
    salle TEXT,
    type TEXT
);

-- Notes
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    semestre TEXT,
    code TEXT,
    matiere TEXT,
    coef INTEGER,
    note_cc NUMERIC,
    note_examen NUMERIC,
    note_final NUMERIC,
    mention TEXT,
    valide BOOLEAN
);

-- Examens
CREATE TABLE examens (
    id TEXT PRIMARY KEY,
    filiere TEXT,
    semestre TEXT,
    code TEXT,
    matiere TEXT,
    date_examen TEXT,
    heure TEXT,
    salle TEXT,
    statut TEXT
);

-- Convocations
CREATE TABLE convocations (
    id SERIAL PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    exam_id TEXT REFERENCES examens(id),
    salle TEXT,
    numero_table INTEGER,
    statut TEXT
);

-- Notifications
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    type TEXT,
    role_dest TEXT,
    titre TEXT,
    detail TEXT,
    lu BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE,
    link TEXT
);

-- ==========================================
-- 3. INSERTION DES DONNÉES DE TEST (SEED)
-- ==========================================

-- Tenants
INSERT INTO tenants (id, name, country, plan, students_count, teachers_count, campus_count, status, mrr) VALUES
('univ-dakar', 'Université de Dakar', 'Sénégal', 'STANDARD', 3240, 187, 2, 'ACTIVE', 350000),
('esc-abidjan', 'ESC Abidjan', 'Côte d''Ivoire', 'PREMIUM', 1850, 94, 3, 'ACTIVE', 650000),
('isig-bamako', 'ISIG Bamako', 'Mali', 'STARTER', 640, 38, 1, 'SETUP', 150000);

-- Users
INSERT INTO users (email, password, role, name, tenant_id, avatar, matricule, filiere) VALUES
('superadmin@optimuscampus.com', 'Admin@2026!', 'super_admin', 'Super Administrateur', NULL, 'SA', NULL, NULL),
('admin@univ-dakar.edu', 'UniDakar@2026', 'admin_universite', 'Dr. Mamadou Koné', 'univ-dakar', 'AD', NULL, NULL),
('prof.traore@univ-dakar.edu', 'Prof@2026', 'enseignant', 'Prof. Traoré', 'univ-dakar', 'PT', NULL, NULL),
('fatou.dieng@etu.univ-dakar.edu', 'Etud@2026', 'etudiant', 'Fatou Dieng', 'univ-dakar', 'FD', 'ETU-2024-0847', 'L3 Informatique');

-- Students (Extrait)
INSERT INTO students (id, nom, prenom, filiere, annee, status, genre, tel, email) VALUES
('ETU-2024-0847', 'Dieng', 'Fatou', 'L3 Informatique', '2025-2026', 'ACTIF', 'F', '+221 77 123 4567', 'fatou.dieng@etu.univ-dakar.edu'),
('ETU-2024-0512', 'Ba', 'Omar', 'M1 Gestion', '2025-2026', 'ACTIF', 'M', '+221 76 234 5678', 'omar.ba@etu.univ-dakar.edu'),
('ETU-2024-0892', 'Camara', 'Mamadou', 'M1 Gestion', '2025-2026', 'ACTIF', 'M', '+221 76 345 6780', 'mamadou.camara@etu.univ-dakar.edu');

-- Devices
INSERT INTO devices (id, name, type, ip, port, protocol, location, status, firmware) VALUES
('CTR-001', 'Contrôleur Amphi A', 'tcp', '192.168.1.101', 4370, 'TCP/IP', 'Bâtiment A — RDC', 'ONLINE', 'V3.4.2'),
('CTR-PORTIQUE-01', 'Portique Optique', 'rs485', NULL, NULL, 'RS485', 'Entrée principale', 'ONLINE', 'V1-2302');

-- Readers
INSERT INTO readers (id, name, controller_id, side, type, room, status) VALUES
('RDR-PORTIQUE-ENT', 'Portique Entrée', 'CTR-PORTIQUE-01', 'entry', 'rfid_wiegand26', 'Entrée principale', 'ONLINE'),
('RDR-001A', 'Lecteur Amphi A', 'CTR-001', 'entry', 'qr_rfid', 'Amphi A', 'ONLINE');

-- Badges
INSERT INTO badges (id, student_id, card_number, card_type, status, issued_at, expires_at, access_groups, paiement_statut, montant_impaye, blocage_impayes) VALUES
('BADGE-001', 'ETU-2024-0847', 'A043BAE1', 'RFID', 'ACTIVE', '2024-09-01', '2027-06-30', '["ETU_L3", "CAMPUS_GENERAL"]', 'À JOUR', 0, false),
('BADGE-013', 'ETU-2024-0892', 'F8FD0BA8', 'RFID', 'BLOCKED', '2024-09-01', '2027-06-30', '["ETU_M1"]', 'EN RETARD', 485000, true);

-- Notifications
INSERT INTO notifications (id, type, role_dest, titre, detail, lu, created_at, link) VALUES
('NOTIF-001', 'impayé', 'admin_universite', 'Mamadou Camara — impayé 63j', 'Badge bloqué automatiquement — 485 000 XOF', false, '2026-03-05T08:00:00Z', '/dashboard/uni-admin/impayes-acces');

INSERT INTO students (id, nom, prenom, filiere, annee, status, genre, tel, email) VALUES
('ETU-2024-0234', 'Sow', 'Aliou', 'L2 Droit', '2025-2026', 'ACTIF', 'M', '+221 78 345 6789', 'aliou.sow@etu.univ-dakar.edu'),
('ETU-2024-0678', 'Fall', 'Mariama', 'L3 Informatique', '2025-2026', 'ACTIF', 'F', '+221 77 456 7890', 'mariama.fall@etu.univ-dakar.edu'),
('ETU-2023-1102', 'Koné', 'Aïssa', 'M2 Finance', '2025-2026', 'ACTIF', 'F', '+221 76 567 8901', 'aissa.kone@etu.univ-dakar.edu'),
('ETU-2024-0391', 'Traoré', 'Salif', 'L2 Droit', '2025-2026', 'SUSPENDU', 'M', '+221 78 678 9012', 'salif.traore@etu.univ-dakar.edu'),
('ETU-2024-0445', 'Diallo', 'Khadija', 'M1 Gestion', '2025-2026', 'ACTIF', 'F', '+221 77 789 0123', 'khadija.diallo@etu.univ-dakar.edu'),
('ETU-2024-0287', 'Mbaye', 'Ibrahima', 'L3 Informatique', '2025-2026', 'ACTIF', 'M', '+221 76 890 1234', 'ibrahima.mbaye@etu.univ-dakar.edu'),
('ETU-2024-0720', 'Diallo', 'Ibrahima', 'L3 Informatique', '2025-2026', 'ACTIF', 'M', '+221 77 901 2345', 'ibrahima.diallo@etu.univ-dakar.edu'),
('ETU-2023-0104', 'Baldé', 'Mariama', 'M2 Finance', '2025-2026', 'ACTIF', 'F', '+221 76 012 3456', 'mariama.balde@etu.univ-dakar.edu'),
('ETU-2025-0033', 'Traoré', 'Seydou', 'L1 Informatique', '2025-2026', 'ACTIF', 'M', '+221 78 123 4568', 'seydou.traore@etu.univ-dakar.edu'),
('ETU-2024-0156', 'Ndiaye', 'Rokhaya', 'L3 Informatique', '2025-2026', 'ACTIF', 'F', '+221 77 234 5679', 'rokhaya.ndiaye@etu.univ-dakar.edu'),
('ETU-2024-0334', 'Sy', 'Adja', 'L2 Droit', '2025-2026', 'ACTIF', 'F', '+221 78 456 7891', 'adja.sy@etu.univ-dakar.edu'),
('ETU-2023-0781', 'Bah', 'Alpha', 'M2 Finance', '2025-2026', 'ACTIF', 'M', '+221 77 567 8902', 'alpha.bah@etu.univ-dakar.edu'),
('ETU-2024-0563', 'Cissé', 'Aminata', 'L3 Informatique', '2025-2026', 'ACTIF', 'F', '+221 76 678 9013', 'aminata.cisse@etu.univ-dakar.edu'),
('ETU-2024-0091', 'Ouédraogo', 'Issouf', 'L2 Droit', '2025-2026', 'ACTIF', 'M', '+221 78 789 0124', 'issouf.ouedraogo@etu.univ-dakar.edu'),
('ETU-2025-0117', 'Keita', 'Fatoumata', 'L1 Informatique', '2025-2026', 'ACTIF', 'F', '+221 77 890 1235', 'fatoumata.keita@etu.univ-dakar.edu'),
('ETU-2024-0403', 'Barry', 'Boubacar', 'M1 Gestion', '2025-2026', 'ACTIF', 'M', '+221 76 901 2346', 'boubacar.barry@etu.univ-dakar.edu'),
('ETU-2024-0771', 'Dème', 'Astou', 'L3 Informatique', '2025-2026', 'ACTIF', 'F', '+221 78 012 3457', 'astou.deme@etu.univ-dakar.edu');

INSERT INTO access_groups (id, name, description, color, member_count) VALUES
('ETUDIANTS_L3', 'Étudiants L3', 'Accès salles L3 et salles communes', '#1a5fa8', 87),
('ETUDIANTS_M1', 'Étudiants M1', 'Accès salles M1, amphi B et labo', '#0e7c6f', 52),
('BIBLIOTHEQUE', 'Bibliothèque', 'Accès salle lecture 07h–22h', '#1e8449', 310);

INSERT INTO access_rules (id, name, device_id, time_zone, groups, status, direction) VALUES
('RULE-PTQ-01', 'Étudiants — Accès horaires cours', 'CTR-PORTIQUE-01', 'Lun-Ven 07h30-20h00', '["ETU_L1", "ETU_L2", "ETU_L3"]', 'ACTIVE', 'both'),
('RULE-001', 'Étudiants — Jours ouvrés', 'CTR-001', 'Lun-Ven 07h-20h', '["ETUDIANTS_L3", "ETUDIANTS_L2"]', 'ACTIVE', 'both');

INSERT INTO edts (id, filiere, jour, heure, matiere, code, prof, salle, type) VALUES
('EDT-L3-000', 'L3 Informatique', 'Vendredi', '14h00-16h00', 'Algorithmique avancée', 'INF301', 'Prof. Traoré', 'Salle C3', 'CM'),
('EDT-L3-004', 'L3 Informatique', 'Mercredi', '16h00-18h00', 'Bases de données', 'INF302', 'Prof. Diallo', 'Bibliothèque', 'CM'),
('EDT-M1-000', 'M1 Gestion', 'Lundi', '16h00-18h00', 'Management stratégique', 'GST401', 'Prof. Koné', 'Amphi A', 'CM');

INSERT INTO notes (id, student_id, semestre, code, matiere, coef, note_cc, note_examen, note_final, mention, valide) VALUES
('NOTE-0001', 'ETU-2024-0847', 'S1', 'INF301', 'Algorithmique avancée', 4, 11.8, 17.3, 15.3, 'Bien', true),
('NOTE-0002', 'ETU-2024-0847', 'S1', 'INF302', 'Bases de données', 3, 8.0, 13.4, 12.6, 'Assez Bien', true),
('NOTE-0007', 'ETU-2024-0847', 'S1', 'MAT301', 'Probabilités & statistiques', 2, 9.2, 7.2, 8.9, 'Insuffisant', false);

INSERT INTO paiements (id, student_id, description, montant, date_paiement, methode, statut, delai_retard) VALUES
('PAY-2026-0001', 'ETU-2024-0847', 'Inscription S1 2025-2026', 350000, '01/09/2025', 'Caisse', 'PAYÉ', 0),
('PAY-2026-0004', 'ETU-2024-0847', 'Inscription S2 2025-2026', 350000, '01/01/2026', 'Orange Money', 'PAYÉ', 0),
('PAY-2026-0014', 'ETU-2024-0234', 'Inscription S2 2025-2026', 280000, NULL, '—', 'EN ATTENTE', 30);

INSERT INTO examens (id, filiere, semestre, code, matiere, date_examen, heure, salle, statut) VALUES
('EXM-011', 'L3 Informatique', 'S2', 'INF301', 'Algorithmique avancée', '10/03/2026', '14h00-16h00', 'Amphi A', 'PLANIFIÉ'),
('EXM-006', 'L2 Droit', 'S2', 'DRT201', 'Droit civil', '10/03/2026', '16h00-18h00', 'Amphi A', 'PLANIFIÉ');

INSERT INTO convocations (student_id, exam_id, salle, numero_table, statut) VALUES
('ETU-2024-0847', 'EXM-011', 'Amphi A', 33, 'CONVOQUÉ'),
('ETU-2024-0234', 'EXM-006', 'Amphi A', 10, 'CONVOQUÉ');

-- Table pour les sessions d'accès/examens (Surveillance)
CREATE TABLE access_sessions (
    id TEXT PRIMARY KEY,
    name TEXT,
    room TEXT,
    controller_id TEXT REFERENCES devices(id),
    reader_id TEXT REFERENCES readers(id),
    time_start TEXT,
    time_end TEXT,
    expected_students INTEGER,
    date_session TEXT,
    supervisor_email TEXT, -- Référence l'email du surveillant
    status TEXT
);

-- Table pour le suivi des cours par enseignant
CREATE TABLE prof_cours (
    id SERIAL PRIMARY KEY,
    code TEXT,
    titre TEXT,
    prof_name TEXT, -- Nom du prof (pour la démo)
    filiere TEXT,
    heures_total INTEGER,
    heures_effectuees INTEGER,
    coef INTEGER,
    etudiants_count INTEGER
);

-- Insertion pour Access Sessions (Surveillance)
INSERT INTO access_sessions (id, name, room, controller_id, reader_id, time_start, time_end, expected_students, date_session, supervisor_email, status) VALUES
('EXAM-2026-001', 'Algorithmique — Examen Final L3 Info', 'Amphi A', 'CTR-001', 'RDR-001A', '08:00', '10:00', 87, '2026-03-10', 'surveillant@univ-dakar.edu', 'UPCOMING'),
('EXAM-2026-002', 'Bases de données — DS M1 Gestion', 'Amphi B', 'CTR-002', 'RDR-002A', '10:30', '12:30', 52, '2026-03-10', 'surveillant@univ-dakar.edu', 'UPCOMING'),
('EXAM-2026-003', 'Programmation Web — TP Noté L3', 'Salle Info 01', 'CTR-003', 'RDR-003A', '14:00', '16:00', 38, '2026-03-11', 'surveillant@univ-dakar.edu', 'UPCOMING');

-- Insertion pour Suivi des Cours (Enseignants)
INSERT INTO prof_cours (code, titre, prof_name, filiere, heures_total, heures_effectuees, coef, etudiants_count) VALUES
('INF101', 'Introduction à la programmation', 'Prof. Mbaye', 'L1 Informatique', 40, 15, 3, 2),
('INF102', 'Architecture des ordinateurs', 'Prof. Diallo', 'L1 Informatique', 30, 10, 2, 2),
('MAT101', 'Mathématiques discrètes', 'Prof. Sy', 'L1 Informatique', 35, 17, 3, 2),
('DRT201', 'Droit civil', 'Prof. Traoré', 'L2 Droit', 40, 26, 4, 4),
('INF301', 'Algorithmique avancée', 'Prof. Traoré', 'L3 Informatique', 40, 31, 4, 7),
('GST401', 'Management stratégique', 'Prof. Koné', 'M1 Gestion', 40, 30, 4, 4),
('FIN505', 'Mémoire de recherche', 'Prof. Barry', 'M2 Finance', 60, 36, 6, 3);

----------------------------------------------------

-- 1. NETTOYAGE RADICAL (Supprime les données dans le bon ordre de dépendance)
TRUNCATE devices, readers, access_sessions RESTART IDENTITY CASCADE;

-- 2. INSERTION DES APPAREILS (Les Parents)
INSERT INTO devices (id, name, type, ip, port, protocol, location, status, firmware) VALUES
('CTR-001', 'Contrôleur Amphi A', 'tcp', '192.168.1.101', 4370, 'TCP/IP', 'Bâtiment A — RDC', 'ONLINE', 'V3.4.2'),
('CTR-002', 'Contrôleur Amphi B', 'tcp', '192.168.1.102', 4370, 'TCP/IP', 'Bâtiment A — 1er', 'ONLINE', 'V3.4.2'),
('CTR-003', 'Contrôleur Salle Info', 'tcp', '192.168.1.103', 4370, 'TCP/IP', 'Bâtiment B — RDC', 'OFFLINE', 'V3.3.1'),
('CTR-004', 'Contrôleur Entrée Principale', 'tcp', '192.168.1.100', 4370, 'TCP/IP', 'Portail Principal', 'OFFLINE', 'V3.2.0'),
('CTR-PORTIQUE-01', 'Portique Optique — Entrée Principale', 'rs485', NULL, NULL, 'RS485', 'Entrée principale — RDC Bâtiment A', 'ONLINE', 'V1-2302');

-- 3. INSERTION DES LECTEURS (Les Enfants de Devices)
INSERT INTO readers (id, name, controller_id, side, type, room, status) VALUES
('RDR-PORTIQUE-ENT', 'Portique DS-S-V1-2302 — Entrée', 'CTR-PORTIQUE-01', 'entry', 'rfid_wiegand26', 'Entrée principale', 'ONLINE'),
('RDR-PORTIQUE-SOR', 'Portique DS-S-V1-2302 — Sortie', 'CTR-PORTIQUE-01', 'exit', 'rfid_wiegand26', 'Entrée principale', 'ONLINE'),
('RDR-001A', 'Portique Amphi A — Entrée', 'CTR-001', 'entry', 'qr_rfid', 'Amphi A', 'ONLINE'),
('RDR-001B', 'Portique Amphi A — Sortie', 'CTR-001', 'exit', 'qr_rfid', 'Amphi A', 'ONLINE'),
('RDR-002A', 'Portique Amphi B — Entrée', 'CTR-002', 'entry', 'rfid', 'Amphi B', 'ONLINE'),
('RDR-002B', 'Portique Amphi B — Sortie', 'CTR-002', 'exit', 'rfid', 'Amphi B', 'ONLINE'),
('RDR-003A', 'Salle Informatique 01 — Entrée', 'CTR-003', 'entry', 'qr_rfid', 'Salle Info 01', 'OFFLINE'),
('RDR-004A', 'Lecteur Campus — Entrée', 'CTR-004', 'entry', 'rfid', 'Campus', 'OFFLINE'),
('RDR-004B', 'Lecteur Campus — Sortie', 'CTR-004', 'exit', 'rfid', 'Campus', 'OFFLINE');

-- 4. INSERTION DES SESSIONS (Les Enfants de Readers et Devices)
INSERT INTO access_sessions (id, name, room, controller_id, reader_id, time_start, time_end, expected_students, date_session, supervisor_email, status) VALUES
('EXAM-2026-001', 'Algorithmique — Examen Final L3 Info', 'Amphi A', 'CTR-001', 'RDR-001A', '08:00', '10:00', 87, '2026-03-10', 'surveillant@univ-dakar.edu', 'UPCOMING'),
('EXAM-2026-002', 'Bases de données — DS M1 Gestion', 'Amphi B', 'CTR-002', 'RDR-002A', '10:30', '12:30', 52, '2026-03-10', 'surveillant@univ-dakar.edu', 'UPCOMING'),
('EXAM-2026-003', 'Programmation Web — TP Noté L3', 'Salle Info 01', 'CTR-003', 'RDR-003A', '14:00', '16:00', 38, '2026-03-11', 'surveillant@univ-dakar.edu', 'UPCOMING');




-- Ajouter les colonnes manquantes à la table students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS date_naissance TEXT,
ADD COLUMN IF NOT EXISTS photo TEXT;

-- On s'assure que la colonne tel existe bien (utilisée pour telephone)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='tel') THEN
    ALTER TABLE students ADD COLUMN tel TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    email TEXT UNIQUE,
    tel TEXT,
    specialite TEXT,
    grade TEXT,
    heures INTEGER,
    effectuees INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les colonnes manquantes à la table examens
ALTER TABLE examens 
ADD COLUMN IF NOT EXISTS surveillant TEXT,
ADD COLUMN IF NOT EXISTS etudiants_count INTEGER DEFAULT 0;

-- S'assurer que le type de l'ID est bien compatible avec vos matricules TEXT
-- Si votre ID était SERIAL (nombre), ce script le transforme en TEXT
ALTER TABLE examens ALTER COLUMN id TYPE TEXT;

TRUNCATE access_rules CASCADE;

INSERT INTO access_rules (id, name, device_id, time_zone, groups, status, direction) VALUES
('RULE-001', 'Étudiants — Jours ouvrés', 'CTR-001', '07:00-20:00', '["ETUDIANTS_L3", "ETUDIANTS_L2"]', 'ACTIVE', 'both'),
('RULE-002', 'Sessions d''examen', 'CTR-001', '07:30-18:00', '["EXAMENS"]', 'ACTIVE', 'entry'),
('RULE-003', 'Bibliothèque — Nocturne', 'CTR-003', '07:00-22:00', '["BIBLIOTHEQUE"]', 'ACTIVE', 'both'),
('RULE-004', 'Labo Recherche', 'CTR-003', '08:00-19:00', '["LABO_RECHERCHE"]', 'ACTIVE', 'both'),
('RULE-005', 'Portail Principal', 'CTR-004', '06:30-22:00', '["TOUS"]', 'SUSPENDED', 'both');

--------------------------------
-- 1. Nettoyage des tables dépendantes
TRUNCATE notes, prof_cours RESTART IDENTITY CASCADE;

-- 2. Insertion des ÉTUDIANTS (Indispensable pour les clés étrangères)
-- On utilise ON CONFLICT pour ne pas créer de doublons si l'étudiant existe déjà
INSERT INTO students (id, nom, prenom, filiere, status)
VALUES 
('ETU-2024-0847', 'Dieng', 'Fatou', 'L3 Informatique', 'ACTIF'),
('ETU-2024-0512', 'Ba', 'Omar', 'M1 Gestion', 'ACTIF'),
('ETU-2024-0234', 'Sow', 'Aliou', 'L2 Droit', 'ACTIF'),
('ETU-2024-0678', 'Fall', 'Mariama', 'L3 Informatique', 'ACTIF'),
('ETU-2023-1102', 'Koné', 'Aïssa', 'M2 Finance', 'ACTIF'),
('ETU-2025-0011', 'Coulibaly', 'Moussa', 'M1 Gestion', 'ACTIF'),
('ETU-2024-0445', 'Fall', 'Khadija', 'L2 Droit', 'ACTIF')
ON CONFLICT (id) DO NOTHING;

-- 3. Insertion des MODULES (COURS)
INSERT INTO prof_cours (code, titre, prof_name, filiere, heures_total, heures_effectuees, coef, etudiants_count)
VALUES 
('INF301', 'Algorithmique', 'Prof. Traoré', 'L3 Informatique', 40, 31, 4, 5),
('GES501', 'Comptabilité analytique', 'Prof. Sy', 'M1 Gestion', 35, 20, 3, 3),
('DRT201', 'Droit civil', 'Prof. Koné', 'L2 Droit', 30, 25, 4, 2);

-- 4. Insertion des NOTES (Maintenant les IDs étudiants existent !)
INSERT INTO notes (id, student_id, code, matiere, note_final, semestre, valide)
VALUES 
-- Notes pour Algorithmique (INF301)
('N1', 'ETU-2024-0847', 'INF301', 'Algorithmique', 16, 'S1', true),
('N2', 'ETU-2024-0512', 'INF301', 'Algorithmique', 13, 'S1', true),
('N3', 'ETU-2024-0234', 'INF301', 'Algorithmique', 11, 'S1', true),
('N4', 'ETU-2024-0678', 'INF301', 'Algorithmique', 18, 'S1', true),
('N5', 'ETU-2023-1102', 'INF301', 'Algorithmique', 09, 'S1', false),

-- Notes pour Comptabilité (GES501)
('N6', 'ETU-2025-0011', 'GES501', 'Comptabilité analytique', 14, 'S1', true),
('N7', 'ETU-2024-0512', 'GES501', 'Comptabilité analytique', 12, 'S1', true),
('N8', 'ETU-2024-0847', 'GES501', 'Comptabilité analytique', 15, 'S1', true),

-- Notes pour Droit Civil (DRT201)
('N9', 'ETU-2024-0445', 'DRT201', 'Droit civil', 17, 'S1', true),
('N10', 'ETU-2024-0234', 'DRT201', 'Droit civil', 08, 'S1', false);

-----
-- 1. Création de la table
CREATE TABLE IF NOT EXISTS document_requests (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    student_id TEXT REFERENCES students(id),
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insertion de test
INSERT INTO document_requests (type, student_id, status) VALUES 
('Attestation de scolarité', 'ETU-2024-0847', 'TREATED'),
('Relevé de notes', 'ETU-2024-0512', 'PENDING'),
('Certificat de réussite', 'ETU-2024-0678', 'PENDING');

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT NOT NULL, -- BADGE_INCONNU, BADGE_BLOQUÉ, etc.
    severity TEXT NOT NULL, -- HIGH, MEDIUM, LOW
    reader_id TEXT REFERENCES readers(id),
    room TEXT,
    description TEXT,
    student_matricule TEXT,
    student_name TEXT,
    status TEXT DEFAULT 'REPORTED', -- REPORTED, RESOLVED, ESCALATED
    resolution TEXT,
    escalated_to TEXT
);

-- Insertion de quelques données initiales
INSERT INTO incidents (id, type, severity, reader_id, room, description, student_matricule, student_name, status)
VALUES 
('INC-001', 'BADGE_INCONNU', 'MEDIUM', 'RDR-001A', 'Amphi A', 'Badge RFID non reconnu.', '???-9999-0001', 'Inconnu', 'REPORTED'),
('INC-002', 'BADGE_BLOQUÉ', 'LOW', 'RDR-001A', 'Amphi A', 'Badge bloqué pour impayé.', 'ETU-2023-0291', 'Aïssa Koné', 'RESOLVED');

-- Création de la table pour le calendrier des semaines
CREATE TABLE IF NOT EXISTS academic_weeks (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL, -- ex: 'S1 — 03–07 Mars'
    dates JSONB NOT NULL -- ex: ["03/03","04/03","05/03","06/03","07/03"]
);

-- Insertion des données de test
INSERT INTO academic_weeks (label, dates) VALUES
('S1 — 03–07 Mars', '["03/03","04/03","05/03","06/03","07/03"]'),
('S2 — 10–14 Mars', '["10/03","11/03","12/03","13/03","14/03"]'),
('S3 — 17–21 Mars', '["17/03","18/03","19/03","20/03","21/03"]'),
('S4 — 24–28 Mars', '["24/03","25/03","26/03","27/03","28/03"]');




ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS official_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Création de la table d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    action TEXT,
    detail TEXT
);

-- Ajout de la colonne 2FA si elle n'existe pas dans votre table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- 1. Table des définitions de plans
CREATE TABLE IF NOT EXISTS billing_plans (
    id TEXT PRIMARY KEY, -- STARTER, STANDARD, etc.
    prix INTEGER,
    color TEXT,
    features JSONB -- Tableau des fonctionnalités
);

-- 2. Insertion des données
INSERT INTO billing_plans (id, prix, color, features) VALUES
('STARTER', 150000, 'var(--slate)', '["500 étudiants", "1 campus", "Support email", "Scolarité de base"]'),
('STANDARD', 350000, 'var(--blue)', '["3 500 étudiants", "3 campus", "Support prioritaire", "Scolarité + Finance"]'),
('PREMIUM', 650000, 'var(--gold)', '["Illimité", "Campus illimités", "Support 24/7", "Tous les modules + API"]'),
('ENTERPRISE', NULL, 'var(--teal)', '["Sur devis", "SLA garanti", "Intégrations custom", "Dedicated success manager"]');

-- Ajout de la colonne tenant_id aux tables manquantes
ALTER TABLE students ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE examens ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Mise à jour des données existantes (pour éviter les tables vides au début)
-- On lie tout à 'univ-dakar' par défaut pour les données de test
UPDATE students SET tenant_id = 'univ-dakar' WHERE tenant_id IS NULL;
UPDATE teachers SET tenant_id = 'univ-dakar' WHERE tenant_id IS NULL;
UPDATE paiements SET tenant_id = 'univ-dakar' WHERE tenant_id IS NULL;
UPDATE examens SET tenant_id = 'univ-dakar' WHERE tenant_id IS NULL;
UPDATE devices SET tenant_id = 'univ-dakar' WHERE tenant_id IS NULL;


-- Tables de référence pour supprimer le code en dur
CREATE TABLE IF NOT EXISTS academic_years (id SERIAL PRIMARY KEY, label TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS student_statuses (id SERIAL PRIMARY KEY, label TEXT UNIQUE, color_class TEXT);
CREATE TABLE IF NOT EXISTS filieres (id SERIAL PRIMARY KEY, label TEXT UNIQUE);

-- Insertion des données (si vides)
INSERT INTO academic_years (label) VALUES ('2023-2024'), ('2024-2025'), ('2025-2026') ON CONFLICT DO NOTHING;
INSERT INTO student_statuses (label, color_class) VALUES ('ACTIF', 'badge-green'), ('SUSPENDU', 'badge-red'), ('DIPLÔMÉ', 'badge-teal'), ('RETIRÉ', 'badge-slate') ON CONFLICT DO NOTHING;
INSERT INTO filieres (label) VALUES ('L1 Informatique'), ('L2 Informatique'), ('L3 Informatique'), ('M1 Gestion'), ('M2 Finance'), ('L1 Droit') ON CONFLICT DO NOTHING;

-- Ajouter la colonne tenant_id à la table filieres
ALTER TABLE filieres ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Associer les filières existantes à l'université par défaut (Dakar)
UPDATE filieres SET tenant_id = 'univ-dakar' WHERE tenant_id IS NULL;

ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE filieres ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);


-- Tables de référence pour les enseignants
CREATE TABLE IF NOT EXISTS teacher_specialities (id SERIAL PRIMARY KEY, label TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS teacher_grades (id SERIAL PRIMARY KEY, label TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS teacher_statuses (id SERIAL PRIMARY KEY, label TEXT UNIQUE, color_class TEXT);

-- Insertion des données par défaut
INSERT INTO teacher_specialities (label) VALUES ('Informatique'), ('Mathématiques'), ('Droit'), ('Gestion'), ('Finance'), ('Médecine') ON CONFLICT DO NOTHING;
INSERT INTO teacher_grades (label) VALUES ('Professeur'), ('Maître de conférences'), ('Maître-assistant'), ('Vacataire') ON CONFLICT DO NOTHING;
INSERT INTO teacher_statuses (label, color_class) VALUES ('ACTIF', 'badge-green'), ('CONGÉ', 'badge-gold'), ('RETRAITÉ', 'badge-slate') ON CONFLICT DO NOTHING;

ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE filieres ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE teacher_grades ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE teacher_specialities ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);


-- 1. Supprimer l'ancienne contrainte si elle ne prenait pas en compte le tenant_id
ALTER TABLE academic_years DROP CONSTRAINT IF EXISTS academic_years_label_key;

-- 2. Créer une contrainte d'unicité "Label + Tenant" 
-- Cela permet à l'Université A et l'Université B d'avoir toutes les deux "2024-2025"
ALTER TABLE academic_years ADD CONSTRAINT academic_years_label_tenant_unique UNIQUE (label, tenant_id);

-- 3. Vérifier les politiques RLS (Row Level Security)
-- Cette commande permet de s'assurer que vous pouvez VOIR les données de votre tenant
DROP POLICY IF EXISTS "Users can view their own university data" ON academic_years;
CREATE POLICY "Users can view their own university data" ON academic_years
FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');


--------------------------------------
-- ==========================================================
-- 1. CORRECTION DES CONTRAINTES D'UNICITÉ (Unique par Tenant)
-- ==========================================================

-- Pour les Filières
ALTER TABLE filieres DROP CONSTRAINT IF EXISTS filieres_label_key;
ALTER TABLE filieres ADD CONSTRAINT filieres_label_tenant_unique UNIQUE (label, tenant_id);

-- Pour les Grades
ALTER TABLE teacher_grades DROP CONSTRAINT IF EXISTS teacher_grades_label_key;
ALTER TABLE teacher_grades ADD CONSTRAINT teacher_grades_label_tenant_unique UNIQUE (label, tenant_id);

-- Pour les Spécialités
ALTER TABLE teacher_specialities DROP CONSTRAINT IF EXISTS teacher_specialities_label_key;
ALTER TABLE teacher_specialities ADD CONSTRAINT teacher_specialities_label_tenant_unique UNIQUE (label, tenant_id);


-- ==========================================================
-- 2. ACTIVATION ET POLITIQUES RLS (Texte à Texte)
-- ==========================================================

ALTER TABLE filieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_specialities ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY['filieres', 'teacher_grades', 'teacher_specialities'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Suppression des anciennes politiques
        EXECUTE format('DROP POLICY IF EXISTS "tenant_select_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_update_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_policy" ON %I', t);

        -- LECTURE : Comparaison simple entre TEXT
        EXECUTE format('CREATE POLICY "tenant_select_policy" ON %I FOR SELECT USING (tenant_id = (auth.jwt() ->> ''tenant_id''))', t);
        
        -- INSERTION
        EXECUTE format('CREATE POLICY "tenant_insert_policy" ON %I FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> ''tenant_id''))', t);
        
        -- MISE À JOUR
        EXECUTE format('CREATE POLICY "tenant_update_policy" ON %I FOR UPDATE USING (tenant_id = (auth.jwt() ->> ''tenant_id''))', t);
        
        -- SUPPRESSION
        EXECUTE format('CREATE POLICY "tenant_delete_policy" ON %I FOR DELETE USING (tenant_id = (auth.jwt() ->> ''tenant_id''))', t);
    END LOOP;
END $$;

-------------
-- 1. ACTIVER EXPLICITEMENT LE RLS (Indispensable pour que les politiques fonctionnent)
ALTER TABLE filieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_specialities ENABLE ROW LEVEL SECURITY;

-- 2. ACCORDER LES DROITS AUX UTILISATEURS CONNECTÉS
-- Parfois le rôle 'authenticated' perd les droits d'accès de base sur certaines tables
GRANT ALL ON TABLE filieres TO authenticated;
GRANT ALL ON TABLE teacher_grades TO authenticated;
GRANT ALL ON TABLE teacher_specialities TO authenticated;
GRANT ALL ON TABLE filieres TO service_role;
GRANT ALL ON TABLE teacher_grades TO service_role;
GRANT ALL ON TABLE teacher_specialities TO service_role;

-- 3. APPLIQUER LES POLITIQUES (On utilise la même logique que pour academic_years)
DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY['filieres', 'teacher_grades', 'teacher_specialities'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Nettoyage complet
        EXECUTE format('DROP POLICY IF EXISTS "tenant_select_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_update_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_policy" ON %I', t);

        -- LECTURE : Autorise si le tenant_id correspond
        EXECUTE format('CREATE POLICY "tenant_select_policy" ON %I FOR SELECT TO authenticated USING (tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id''))', t);
        
        -- INSERTION : Autorise si le tenant_id de la nouvelle ligne est celui de l''utilisateur
        EXECUTE format('CREATE POLICY "tenant_insert_policy" ON %I FOR INSERT TO authenticated WITH CHECK (tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id''))', t);
        
        -- MISE À JOUR
        EXECUTE format('CREATE POLICY "tenant_update_policy" ON %I FOR UPDATE TO authenticated USING (tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id''))', t);
        
        -- SUPPRESSION
        EXECUTE format('CREATE POLICY "tenant_delete_policy" ON %I FOR DELETE TO authenticated USING (tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id''))', t);
    END LOOP;
END $$;


------------
-- ==========================================
-- 1. RÉPARATION DES PERMISSIONS (Fix 401)
-- ==========================================
-- On redonne explicitement les droits d'accès aux tables pour les utilisateurs connectés
GRANT ALL ON TABLE filieres TO authenticated, service_role;
GRANT ALL ON TABLE teacher_grades TO authenticated, service_role;
GRANT ALL ON TABLE teacher_specialities TO authenticated, service_role;

-- ==========================================
-- 2. ACTIVATION RLS
-- ==========================================
ALTER TABLE filieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_specialities ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. POLITIQUES (Syntaxe exacte de academic_years)
-- ==========================================

-- --- Table : filieres ---
DROP POLICY IF EXISTS "tenant_select_policy" ON filieres;
CREATE POLICY "tenant_select_policy" ON filieres 
FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');

DROP POLICY IF EXISTS "tenant_insert_policy" ON filieres;
CREATE POLICY "tenant_insert_policy" ON filieres 
FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');

-- --- Table : teacher_grades ---
DROP POLICY IF EXISTS "tenant_select_policy" ON teacher_grades;
CREATE POLICY "tenant_select_policy" ON teacher_grades 
FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');

DROP POLICY IF EXISTS "tenant_insert_policy" ON teacher_grades;
CREATE POLICY "tenant_insert_policy" ON teacher_grades 
FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');

-- --- Table : teacher_specialities ---
DROP POLICY IF EXISTS "tenant_select_policy" ON teacher_specialities;
CREATE POLICY "tenant_select_policy" ON teacher_specialities 
FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');

DROP POLICY IF EXISTS "tenant_insert_policy" ON teacher_specialities;
CREATE POLICY "tenant_insert_policy" ON teacher_specialities 
FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');

--------------fi
-- 1. On désactive complètement le RLS sur les 3 tables
ALTER TABLE public.filieres DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_specialities DISABLE ROW LEVEL SECURITY;

-- 2. On donne tous les droits de bas niveau au rôle 'authenticated'
GRANT ALL PRIVILEGES ON TABLE public.filieres TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.teacher_grades TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.teacher_specialities TO authenticated;

-- 3. On donne les droits au rôle 'anon' (par sécurité pour l'API)
GRANT ALL PRIVILEGES ON TABLE public.filieres TO anon;
GRANT ALL PRIVILEGES ON TABLE public.teacher_grades TO anon;
GRANT ALL PRIVILEGES ON TABLE public.teacher_specialities TO anon;

-- 4. On force l'API Supabase à oublier ses erreurs de cache
NOTIFY pgrst, 'reload schema';