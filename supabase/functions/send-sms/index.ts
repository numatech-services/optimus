// supabase/functions/send-sms/index.ts
// Deploy: supabase functions deploy send-sms
// Secrets: SMS_API_KEY, SMS_SENDER

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SMS_API_KEY = Deno.env.get('SMS_API_KEY')
const SMS_SENDER = Deno.env.get('SMS_SENDER') || 'OptimusCampus'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { to, message } = await req.json()

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'to and message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── OPTION A : Africa's Talking (recommandé pour le Niger) ──
    // const response = await fetch('https://api.africastalking.com/version1/messaging', {
    //   method: 'POST',
    //   headers: {
    //     'apiKey': SMS_API_KEY,
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: new URLSearchParams({
    //     username: 'sandbox', // ou votre username production
    //     to: to,
    //     message: message,
    //     from: SMS_SENDER,
    //   }),
    // })

    // ── OPTION B : Twilio ──
    // const TWILIO_SID = Deno.env.get('TWILIO_SID')
    // const TWILIO_AUTH = Deno.env.get('TWILIO_AUTH')
    // const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_AUTH}`),
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: new URLSearchParams({ From: SMS_SENDER, To: to, Body: message }),
    // })

    // Pour le moment, on log simplement (activer un provider ci-dessus en production)
    console.log(`[SMS] To: ${to} | Message: ${message.slice(0, 80)}...`)

    return new Response(JSON.stringify({ success: true, provider: 'log-only', to }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    console.error('SMS edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
