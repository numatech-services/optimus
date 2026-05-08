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

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
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

    const {
      schoolName,
      country,
      plan,
      status,
      students,
      teachers,
      campus,
      mrr,
      adminName,
      adminEmail,
      adminPassword,
    } = await req.json()

    if (!schoolName || !country || !adminName || !adminEmail || !adminPassword) {
      return json({ error: 'Nom école, pays, nom admin, email admin et mot de passe admin sont requis.' }, 400)
    }

    if (String(adminPassword).length < 8) {
      return json({ error: 'Le mot de passe administrateur doit contenir au moins 8 caractères.' }, 400)
    }

    const tenantId = `univ-${slugify(String(schoolName))}-${Date.now().toString().slice(-4)}`

    const tenantPayload = {
      id: tenantId,
      name: String(schoolName).trim(),
      country: String(country).trim(),
      plan: plan || 'STANDARD',
      status: status || 'SETUP',
      students_count: Number(students) || 0,
      teachers_count: Number(teachers) || 0,
      campus_count: Math.max(1, Number(campus) || 1),
      mrr: Math.max(0, Number(mrr) || 0),
    }

    const { error: tenantError } = await serviceClient
      .from('tenants')
      .insert([tenantPayload])

    if (tenantError) {
      return json({ error: tenantError.message }, 400)
    }

    const { error: configError } = await serviceClient
      .from('tenant_config')
      .upsert({
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      })

    if (configError) {
      await serviceClient.from('tenants').delete().eq('id', tenantId)
      return json({ error: `Configuration tenant impossible: ${configError.message}` }, 400)
    }

    const { data: createdAuth, error: createAuthError } = await serviceClient.auth.admin.createUser({
      email: String(adminEmail).toLowerCase().trim(),
      password: String(adminPassword),
      email_confirm: true,
      user_metadata: {
        role: 'admin_universite',
        tenant_id: tenantId,
        name: String(adminName).trim(),
      },
      app_metadata: {
        role: 'admin_universite',
        tenant_id: tenantId,
      },
    })

    if (createAuthError || !createdAuth.user) {
      await serviceClient.from('tenant_config').delete().eq('tenant_id', tenantId)
      await serviceClient.from('tenants').delete().eq('id', tenantId)
      return json({ error: createAuthError?.message || 'Création du compte auth impossible.' }, 400)
    }

    const { error: profileError } = await serviceClient
      .from('users')
      .insert([{
        id: createdAuth.user.id,
        email: String(adminEmail).toLowerCase().trim(),
        name: String(adminName).trim(),
        role: 'admin_universite',
        tenant_id: tenantId,
      }])

    if (profileError) {
      await serviceClient.auth.admin.deleteUser(createdAuth.user.id)
      await serviceClient.from('tenant_config').delete().eq('tenant_id', tenantId)
      await serviceClient.from('tenants').delete().eq('id', tenantId)
      return json({ error: `Création du profil admin impossible: ${profileError.message}` }, 400)
    }

    return json({
      success: true,
      tenantId,
      adminEmail: String(adminEmail).toLowerCase().trim(),
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erreur serveur inconnue.' }, 500)
  }
})
