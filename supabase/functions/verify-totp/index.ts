import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email, code, action } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role: bypasses RLS
  )
  
  if (action === 'check') {
    const { data } = await supabase.from('admin_totp_secrets').select('id').eq('email', email).single()
    return new Response(JSON.stringify({ configured: !!data }), { status: 200 })
  }
  
  // Verify TOTP code
  const { data: secret } = await supabase.from('admin_totp_secrets').select('secret').eq('email', email).single()
  if (!secret?.secret) {
    return new Response(JSON.stringify({ valid: false, reason: 'no_secret' }), { status: 200 })
  }
  
  // TOTP verification (RFC 6238)
  const { createTOTP } = await import('https://esm.sh/otpauth@9.1.4')
  const totp = new createTOTP({ secret: secret.secret, algorithm: 'SHA1', digits: 6, period: 30 })
  const delta = totp.validate({ token: code, window: 2 })
  
  return new Response(JSON.stringify({ valid: delta !== null }), { status: 200 })
})
