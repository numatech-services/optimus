import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function buildAvatar(name: string) {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'US'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') || ''

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData.user?.email) {
      return json({ error: 'Authentification requise.' }, 401)
    }

    const { data: requester, error: requesterError } = await serviceClient
      .from('users')
      .select('role')
      .eq('email', authData.user.email)
      .maybeSingle()

    if (requesterError || requester?.role !== 'super_admin') {
      return json({ error: 'Accès réservé aux super administrateurs.' }, 403)
    }

    const { name, email, password, role, tenantId } = await req.json()

    if (!name || !email || !password || !role) {
      return json({ error: 'Nom, email, mot de passe et rôle sont requis.' }, 400)
    }

    if (String(password).length < 8) {
      return json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400)
    }

    const normalizedRole = String(role).trim()
    const normalizedEmail = String(email).toLowerCase().trim()
    const normalizedName = String(name).trim()
    const normalizedTenantId = tenantId ? String(tenantId).trim() : null

    if (normalizedRole !== 'super_admin' && !normalizedTenantId) {
      return json({ error: 'Une université rattachée est requise pour ce rôle.' }, 400)
    }

    if (normalizedTenantId) {
      const { data: tenant, error: tenantError } = await serviceClient
        .from('tenants')
        .select('id')
        .eq('id', normalizedTenantId)
        .maybeSingle()

      if (tenantError || !tenant) {
        return json({ error: 'Université rattachée introuvable.' }, 400)
      }
    }

    const { data: createdAuth, error: createAuthError } = await serviceClient.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        role: normalizedRole,
        tenant_id: normalizedRole === 'super_admin' ? null : normalizedTenantId,
        name: normalizedName,
      },
      app_metadata: {
        role: normalizedRole,
        tenant_id: normalizedRole === 'super_admin' ? null : normalizedTenantId,
      },
    })

    if (createAuthError || !createdAuth.user) {
      return json({ error: createAuthError?.message || 'Création du compte auth impossible.' }, 400)
    }

    const { error: profileError } = await serviceClient
      .from('users')
      .insert([{
        id: createdAuth.user.id,
        email: normalizedEmail,
        name: normalizedName,
        role: normalizedRole,
        tenant_id: normalizedRole === 'super_admin' ? null : normalizedTenantId,
        avatar: buildAvatar(normalizedName),
      }])

    if (profileError) {
      await serviceClient.auth.admin.deleteUser(createdAuth.user.id)
      return json({ error: `Création du profil utilisateur impossible: ${profileError.message}` }, 400)
    }

    return json({
      success: true,
      userId: createdAuth.user.id,
      email: normalizedEmail,
      role: normalizedRole,
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erreur serveur inconnue.' }, 500)
  }
})
