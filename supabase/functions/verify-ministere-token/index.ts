import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  const { token } = await req.json()
  const SECRET = Deno.env.get('MINISTERE_TOKEN_SECRET') || ''
  
  if (!SECRET || !token) {
    return new Response(JSON.stringify({ valid: false }), { status: 200 })
  }

  // HMAC-SHA256 verification
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('ministere-access'))
  const expected = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  return new Response(JSON.stringify({ valid: token === expected }), { status: 200 })
})
