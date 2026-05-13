// supabase/functions/create-agent/index.ts
// Deploy: supabase functions deploy create-agent

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Client admin (service role) — côté serveur uniquement
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Vérifier que l'appelant est bien admin_universite ou super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders })

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!caller) return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401, headers: corsHeaders })

    const { data: callerProfile } = await supabaseAdmin
      .from('users').select('role, tenant_id').eq('id', caller.id).single()

    if (!['admin_universite', 'super_admin'].includes(callerProfile?.role)) {
      return new Response(JSON.stringify({ error: 'Droits insuffisants' }), { status: 403, headers: corsHeaders })
    }

    const { name, email, role, telephone, password, tenant_id } = await req.json()

    // Validations
    if (!name || !email || !role || !password) {
      return new Response(JSON.stringify({ error: 'Champs requis manquants' }), { status: 400, headers: corsHeaders })
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Mot de passe trop court (min 8 caractères)' }), { status: 400, headers: corsHeaders })
    }

    const effectiveTenantId = callerProfile?.role === 'super_admin' ? tenant_id : callerProfile?.tenant_id

    // 1. Créer dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Pas besoin de confirmation email
      user_metadata: { name, role, tenant_id: effectiveTenantId },
    })

    if (authError) throw new Error(authError.message)

    // 2. Créer dans public.users (le trigger peut le faire aussi, mais on le force ici)
    const { error: dbError } = await supabaseAdmin.from('users').upsert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      name,
      role,
      tenant_id: effectiveTenantId,
    }, { onConflict: 'id' })

    if (dbError) {
      // Rollback auth si insert échoue
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(dbError.message)
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})