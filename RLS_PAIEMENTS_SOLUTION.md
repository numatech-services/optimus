# ⚠️ Erreur RLS Supabase - Solution

## Problème
```
Erreur: new row violates row-level security policy for table "paiements"
```

## Causes possibles
1. Les politiques RLS ne sont pas configurées correctement
2. Le `tenant_id` ne correspond pas entre le JWT et les données
3. L'utilisateur n'a pas le rôle/permission approprié

## Solutions

### Solution 1: Configurer les politiques RLS (Recommandé)

1. Allez dans **Supabase Dashboard → SQL Editor**
2. Ouvrez le fichier: `supabase/migrations/004_rls_paiements.sql`
3. Copiez et exécutez le SQL complet
4. Vérifiez qu'aucune erreur n'apparaît

### Solution 2: Vérifier le JWT (Debug)

Le `tenant_id` doit être présent dans votre JWT Supabase:

```javascript
// Ajoutez ceci dans votre code pour déboguer
const { data } = await supabase.auth.getUser()
console.log('JWT Claims:', data.user?.user_metadata)
console.log('Tenant ID:', data.user?.user_metadata?.tenant_id)
```

### Solution 3: Désactiver RLS temporairement (Développement uniquement)

Si rien ne fonctionne, exécutez ce SQL:

```sql
ALTER TABLE public.paiements DISABLE ROW LEVEL SECURITY;
```

⚠️ **Ne pas faire cela en production!**

### Solution 4: Vérifier les colonnes manquantes

Assurez-vous que votre table a tous ces champs:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'paiements'
ORDER BY ordinal_position;
```

## Vérification

Après avoir appliqué les politiques RLS:

1. Rechargez l'application
2. Essayez d'ajouter un nouveau paiement
3. Vérifiez la console pour les logs d'erreur détaillés

## Contact Support Supabase

Si le problème persiste:
- https://supabase.com/docs/guides/auth/row-level-security
- https://discord.supabase.io
