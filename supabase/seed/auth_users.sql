-- ══════════════════════════════════════════════════════
-- Force $2b$ bcrypt format for Supabase GoTrue compatibility
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- Update encrypted_password using $2b$ prefix explicitly
UPDATE auth.users 
SET 
  encrypted_password = REPLACE(crypt('Admin@1234!', gen_salt('bf')), '$2a$', '$2b$'),
  updated_at = now()
WHERE email IN (
  'superadmin@optimuscampus.com',
  'admin@univ-niamey.ne',
  'admin@univ-dosso.ne',
  'scolarite@univ-niamey.ne',
  'comptable@univ-niamey.ne',
  'bibliotheque@univ-niamey.ne'
);

-- Also ensure is_sso_user is false (required in newer Supabase versions)
UPDATE auth.users 
SET is_sso_user = false
WHERE email IN (
  'superadmin@optimuscampus.com',
  'admin@univ-niamey.ne',
  'admin@univ-dosso.ne',
  'scolarite@univ-niamey.ne',
  'comptable@univ-niamey.ne',
  'bibliotheque@univ-niamey.ne'
);

-- Verify
SELECT email, 
  LEFT(encrypted_password, 7) AS hash_prefix,
  email_confirmed_at IS NOT NULL AS confirmed,
  is_sso_user,
  (SELECT COUNT(*) FROM auth.identities i WHERE i.user_id = auth.users.id) AS identities
FROM auth.users
ORDER BY email;
