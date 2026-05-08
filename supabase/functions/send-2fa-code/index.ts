import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// In-memory store (production: use Redis or a DB table)
const codes = new Map<string, { code: string; expires: number }>()

serve(async (req) => {
  const { email, code, action } = await req.json()
  
  if (action === 'generate') {
    const generated = String(Math.floor(100000 + Math.random() * 900000))
    codes.set(email, { code: generated, expires: Date.now() + 10 * 60 * 1000 }) // 10 min
    
    // Send email via Resend
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Optimus Campus <noreply@optimus-campus.ne>',
          to: [email],
          subject: 'Code de vérification — Optimus Campus',
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:#000091">Code de vérification</h2>
            <div style="background:#F5F5F5;border:2px solid #000091;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
              <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#000091">${generated}</span>
            </div>
            <p style="color:#666;font-size:14px">Ce code expire dans 10 minutes.</p>
          </div>`,
        }),
      })
    }
    
    return new Response(JSON.stringify({ ok: true, codeId: email }), { status: 200 })
  }
  
  if (action === 'verify') {
    const stored = codes.get(email)
    if (!stored || stored.expires < Date.now()) {
      codes.delete(email)
      return new Response(JSON.stringify({ valid: false, reason: 'expired' }), { status: 200 })
    }
    if (stored.code !== code) {
      return new Response(JSON.stringify({ valid: false, reason: 'wrong' }), { status: 200 })
    }
    codes.delete(email) // One-time use
    return new Response(JSON.stringify({ valid: true }), { status: 200 })
  }
  
  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
})
