# 🚀 Guide de déploiement — Optimus Campus sur Hostinger

## Prérequis

- Hostinger avec hébergement Web (Premium ou Business)
- Node.js 18+ installé localement
- Accès au dashboard Supabase

---

## Étape 1 — Configurer Supabase (sécurité)

### 1.1 Migrer les utilisateurs vers Supabase Auth

Dans le dashboard Supabase > **Authentication** > **Users** :

Pour chaque utilisateur de votre table `users`, créez un compte Auth :

```
Email: superadmin@optimuscampus.com
Password: [nouveau mot de passe fort]
```

Répétez pour tous les comptes (admin, scolarité, enseignant, etc.).

### 1.2 Exécuter la migration RLS

Dans **SQL Editor** de Supabase, copiez-collez le contenu de :
```
supabase/migrations/001_complete_setup.sql
```

Cela active les Row Level Security sur toutes les tables et crée la table TOTP.

### 1.3 Configurer le 2FA pour le Super Admin

Dans le SQL Editor :

```sql
-- Générer un secret TOTP (32 caractères base32)
-- Utilisez https://totp.danhersam.com/ pour générer un secret
-- ou installez `otpauth` en CLI : npx otpauth generate

INSERT INTO admin_totp_secrets (user_id, secret, verified)
VALUES (
  'UUID-DU-SUPER-ADMIN',  -- depuis Auth > Users
  'VOTRE-SECRET-BASE32',  -- ex: JBSWY3DPEHPK3PXP
  true
);
```

Scannez le QR code dans Google Authenticator / Authy.

### 1.4 Supprimer les mots de passe en clair

Une fois tous les utilisateurs migrés vers Supabase Auth :

```sql
ALTER TABLE users DROP COLUMN IF EXISTS password;
```

---

## Étape 2 — Configurer les variables d'environnement

Créez un fichier `.env.production` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key
VITE_ENV=production
```

⚠️ **Ne jamais committer ce fichier**. Il est déjà dans le `.gitignore`.

---

## Étape 3 — Build de production

```bash
# Installer les dépendances
npm install

# Build
npm run build
```

Cela génère un dossier `dist/` avec tous les fichiers statiques.

---

## Étape 4 — Déployer sur Hostinger

### Option A : Via le File Manager Hostinger

1. Connectez-vous à **hPanel** > **File Manager**
2. Naviguez vers `public_html/`
3. Supprimez les fichiers existants (sauf `.htaccess` si vous en avez un custom)
4. Uploadez **tout le contenu** du dossier `dist/` dans `public_html/`
   - ⚠️ Le contenu DE `dist/`, pas le dossier `dist/` lui-même
5. Le fichier `.htaccess` est automatiquement copié depuis `public/` lors du build

### Option B : Via FTP/SFTP

1. hPanel > **Fichiers** > **Comptes FTP** → notez les identifiants
2. Utilisez FileZilla ou similaire
3. Connectez-vous et uploadez le contenu de `dist/` dans `public_html/`

### Option C : Via Git (recommandé)

1. hPanel > **Avancé** > **Git**
2. Connectez votre repo GitHub
3. Après chaque push, buildez et déployez automatiquement

---

## Étape 5 — Vérifications post-déploiement

- [ ] Le site charge sur `https://votre-domaine.com`
- [ ] La navigation fonctionne (pas d'erreur 404 sur les sous-pages)
- [ ] Le login standard fonctionne
- [ ] Le login admin 2FA fonctionne
- [ ] Les données Supabase s'affichent dans les dashboards
- [ ] Le HTTPS est actif (cadenas vert)
- [ ] La PWA est installable (icône "Installer" dans le navigateur)

---

## Étape 6 — Domaine personnalisé (optionnel)

1. hPanel > **Domaines** > Ajoutez votre domaine
2. Configurez les DNS (A record vers l'IP Hostinger)
3. Activez le SSL gratuit dans hPanel > **SSL**

---

## Maintenance

### Mise à jour de l'application
```bash
npm run build
# Puis re-uploadez dist/ sur Hostinger
```

### Monitoring
- Supabase Dashboard > **Database** > **Query Performance**
- Hostinger hPanel > **Statistiques** pour le trafic web

### Sauvegardes
- Supabase fait des backups automatiques (plan Pro)
- Hostinger propose des backups hebdomadaires

## 8. Application Mobile (Capacitor)

### Génération APK Android

```bash
# Installer Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/push-notifications @capacitor/status-bar @capacitor/splash-screen

# Initialiser
npx cap init "Optimus Campus" "ne.optimuscampus.app" --web-dir dist

# Build le projet
npm run build

# Ajouter Android
npx cap add android

# Synchroniser
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android
```

### Push Notifications

```bash
# Générer les clés VAPID
npx web-push generate-vapid-keys

# Ajouter la clé publique dans .env
VITE_VAPID_PUBLIC_KEY=<votre-clé-publique>

# Ajouter la clé privée dans Supabase Secrets
supabase secrets set VAPID_PRIVATE_KEY=<votre-clé-privée>
```
