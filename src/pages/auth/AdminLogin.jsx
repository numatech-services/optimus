import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

/**
 * AdminLogin — Connexion Super Admin / Admin Université avec 2FA
 * 
 * Deux méthodes 2FA au choix :
 *   1. Code par email (6 chiffres) — recommandé, pas besoin d'application
 *   2. TOTP (Google Authenticator) — pour ceux qui l'ont configuré
 * 
 * Flux :
 *   Étape 1 : Email + Mot de passe (Supabase Auth)
 *   Étape 2 : Choix méthode 2FA
 *   Étape 3 : Saisie du code → vérification → redirection
 */

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=credentials, 2=choose method, 3=enter code
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [method, setMethod] = useState(null) // 'email' | 'totp'
  const [code, setCode] = useState('')
  const [codeId, setCodeId] = useState(null) // Server-side code reference
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginResult, setLoginResult] = useState(null)

  // Étape 1 : Vérifier email + password
  const handleStep1 = async () => {
    if (!email || !password) return setError('Email et mot de passe requis')
    setError('')
    setLoading(true)

    const result = await login(email, password)
    setLoading(false)

    if (!result.success) return setError(result.error)

    // Vérifier que c'est un admin
    if (!['super_admin', 'admin_universite'].includes(result.user?.role)) {
      return setError('Ce portail est réservé aux administrateurs')
    }

    setLoginResult(result)
    setStep(2) // Passer au choix 2FA
  }

  // Étape 2 : Choisir la méthode et envoyer le code
  const handleChooseMethod = async (m) => {
    setMethod(m)
    setError('')
    setCode('')

    if (m === 'email') {
      // Générer un code 6 chiffres et l'envoyer par email
      try {
        // Générer et envoyer le code côté SERVEUR (jamais visible côté client)
        const { data, error: sendError } = await supabase.functions.invoke('send-2fa-code', {
          body: { email, action: 'generate' },
        })
        if (sendError) throw sendError
        setCodeId(data?.codeId || email) // Référence serveur, PAS le code lui-même
      } catch (err) {
        console.error('[2FA] Code generation failed:', err.message)
        setError('Impossible d\'envoyer le code. Réessayez.')
        return
      }

      setStep(3)
    } else if (m === 'totp') {
      // Vérifier côté serveur si TOTP est configuré (sans exposer le secret)
      try {
        const { data } = await supabase.functions.invoke('verify-totp', {
          body: { email, action: 'check' },
        })
        if (!data?.configured) {
          return setError("Aucun TOTP configuré pour ce compte. Utilisez le code par email.")
        }
      } catch {
        return setError("Vérification impossible. Utilisez le code par email.")
      }

      setStep(3)
    }
  }

  // Étape 3 : Vérifier le code
  const handleVerifyCode = async () => {
    if (code.length !== 6) return setError('Le code doit contenir 6 chiffres')
    setError('')
    setLoading(true)

    if (method === 'email') {
      // Vérification côté SERVEUR (le code n'est jamais sur le client)
      try {
        const { data, error: verifyError } = await supabase.functions.invoke('send-2fa-code', {
          body: { email, code, action: 'verify' },
        })
        if (verifyError || !data?.valid) {
          setError('Code incorrect ou expiré')
          setLoading(false)
          return
        }
        navigate(loginResult.redirect)
      } catch {
        setError('Erreur de vérification')
        setLoading(false)
      }
    } else if (method === 'totp') {
      // Vérification TOTP côté SERVEUR (le secret ne transite jamais côté client)
      try {
        const { data, error: verifyError } = await supabase.functions.invoke('verify-totp', {
          body: { email, code },
        })
        if (verifyError || !data?.valid) {
          setError('Code TOTP incorrect')
          setLoading(false)
          return
        }
        navigate(loginResult.redirect)
      } catch (err) {
        setError('Erreur de vérification TOTP')
        setLoading(false)
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5', fontFamily: "'Marianne', 'Roboto', sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: 40, width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#000091', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff' }}>OC</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#1E1E1E' }}>Administration</div>
            <div style={{ fontSize: 14, color: '#666' }}>
              {step === 1 && 'Connexion sécurisée'}
              {step === 2 && 'Choisissez votre méthode 2FA'}
              {step === 3 && `Vérification — ${method === 'email' ? 'Code par email' : 'Code TOTP'}`}
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: step >= s ? '#000091' : '#E5E5E5', transition: 'background .3s' }} />
          ))}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEE8E7', color: '#E10600', borderRadius: 8, fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* ÉTAPE 1 : Credentials */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStep1()}
                placeholder="admin@optimus-campus.ne"
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 16, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStep1()}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 16, outline: 'none' }} />
            </div>
            <button onClick={handleStep1} disabled={loading}
              style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#000091', color: '#fff', fontSize: 16, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Vérification...' : 'Continuer →'}
            </button>
          </div>
        )}

        {/* ÉTAPE 2 : Choix méthode 2FA */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
              Pour sécuriser votre accès, choisissez comment recevoir votre code de vérification :
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => handleChooseMethod('email')}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 18px', borderRadius: 12, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#E3E3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📧</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1E1E1E' }}>Code par email</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Recevez un code à 6 chiffres sur {email}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 14, color: '#000091', fontWeight: 600 }}>Recommandé</span>
              </button>

              <button onClick={() => handleChooseMethod('totp')}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 18px', borderRadius: 12, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔐</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1E1E1E' }}>Application TOTP</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Google Authenticator, Authy...</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Saisie du code */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
              {method === 'email'
                ? `Un code à 6 chiffres a été envoyé à ${email}. Vérifiez votre boîte de réception (et les spams).`
                : 'Ouvrez votre application d\'authentification et saisissez le code affiché.'
              }
            </p>

            <div style={{ marginBottom: 24 }}>
              <input type="text" value={code} maxLength={6}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                placeholder="000000"
                autoFocus
                style={{
                  width: '100%', padding: '16px', border: '2px solid #000091', borderRadius: 12,
                  fontSize: 32, fontWeight: 700, textAlign: 'center', letterSpacing: 12,
                  color: '#000091', outline: 'none', fontFamily: 'monospace',
                }} />
            </div>

            <button onClick={handleVerifyCode} disabled={loading || code.length !== 6}
              style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#000091', color: '#fff', fontSize: 16, fontWeight: 600, cursor: code.length === 6 ? 'pointer' : 'not-allowed', opacity: code.length === 6 ? 1 : 0.5 }}>
              {loading ? 'Vérification...' : 'Valider le code'}
            </button>

            {method === 'email' && (
              <button onClick={() => handleChooseMethod('email')}
                style={{ width: '100%', marginTop: 12, padding: 10, background: 'transparent', border: 'none', color: '#000091', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}>
                Renvoyer le code
              </button>
            )}
          </div>
        )}

        {/* Back links */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          {step > 1 && (
            <button onClick={() => { setStep(step - 1); setError(''); setCode('') }}
              style={{ background: 'none', border: 'none', color: '#000091', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}>
              ← Retour
            </button>
          )}
          <a href="/login" style={{ color: '#666', textDecoration: 'underline', textUnderlineOffset: 4 }}>
            Connexion standard
          </a>
        </div>
      </div>
    </div>
  )
}
