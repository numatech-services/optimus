# Optimus Campus — ERP Universitaire SaaS

**Plateforme de gestion universitaire pour le Niger**

## Présentation

Optimus Campus est un ERP SaaS multi-tenant conçu pour les universités publiques et privées du Niger. Il couvre l'intégralité du cycle de gestion universitaire : inscriptions, scolarité, finances, examens, contrôle d'accès, bibliothèque et communication.

## Stack technique

- **Frontend** : React 18 + Vite + VitePWA
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Design** : Design System "Bleu France" (Marianne, #000091)
- **Mobile** : PWA installable + Capacitor Android

## Chiffres

- 92 fichiers source, ~20 000 lignes de code
- 1 633 lignes SQL, 53 tables, 50 RLS policies
- 66 routes, 8 rôles utilisateurs
- 6 services (grades, notifications, PDF, push, payment, storage)

## 8 rôles

| Rôle | Accès |
|------|-------|
| Super Admin | Gestion plateforme, universités, facturation, alertes |
| Admin Université | Étudiants, enseignants, finances, structure, communication |
| Scolarité | Inscriptions, EDT (moteur conflits), notes, documents |
| Enseignant | Cours, notes (auto-calcul LMD), étudiants |
| Étudiant | Notes, EDT, paiements, documents, examens |
| Surveillant | Scanner, monitoring, accès examens, incidents |
| Bibliothèque | Catalogue, emprunts, retards |
| Comptabilité | Finances, échéancier, contrôle badges |

## Chaînes transversales

```
Inscription → Échéance → Impayé > 60j → Badge BLOQUÉ auto → Portique REFUSE → Examen REFUSE
Paiement → Badge DÉBLOQUÉ auto → Portique OK → Examen OK
Notes → Audit trail → Délibération → Publication → Email + Push
```

## Installation

```bash
# 1. Cloner et installer
git clone <repo>
cd optimus-campus
npm install

# 2. Configurer l'environnement
cp .env.example .env.local
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 3. Initialiser Supabase
# Exécuter supabase/migrations/001_complete_setup.sql dans le SQL Editor
# Puis exécuter supabase/seed/init_data.sql pour les données de base

# 4. Lancer en développement
npm run dev

# 5. Build production
npm run build
```

## Déploiement

Voir [DEPLOY.md](./DEPLOY.md) pour les instructions complètes (Hostinger, Capacitor Android, Edge Functions).

## Structure du projet

```
src/
├── pages/
│   ├── auth/           # Login, AdminLogin (TOTP), ForgotPassword
│   ├── vitrine/        # Home, Modules, About, Contact, Navbar
│   └── dashboards/
│       ├── SuperAdmin/     # 7 pages
│       ├── UniAdmin/       # 18 pages
│       ├── Scolarite/      # 6 pages
│       ├── Teacher/        # 5 pages
│       ├── Student/        # 6 pages
│       ├── Surveillant/    # 6 pages
│       ├── AccessControl/  # 7 pages
│       ├── Bibliotheque/   # 1 page (4 onglets)
│       └── Comptabilite/   # 2 pages
├── components/
│   ├── Layout/         # DashLayout, Sidebar, Topbar
│   └── UI/             # Pagination, CSV, Connectivity, ErrorBoundary
├── context/            # AuthContext, ToastContext
├── hooks/              # Debounce, Pagination, RateLimit, OfflineQueue, Export
├── utils/              # GradeCalc, Notifications, PDF, Push, Payment, Storage
└── styles/             # global.css (Design System Bleu France)
```

## Licence

Propriétaire — Numatech Services, Niger.
