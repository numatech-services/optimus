import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// Password strength checker
function getStrength(pwd) {
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score // 0–4
}

const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Bon', 'Fort']
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

export default function ResetPassword() {
  const navigate = useNavigate()
  const [step, setStep]         = useState('loading') // loading | form | success | invalid
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [showCfm, setShowCfm]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const strength = getStrength(password)

  // ── 1. Verify that Supabase gave us a valid recovery session ──
  useEffect(() => {
    let mounted = true

    // Supabase injects the access_token into the URL hash when the user
    // clicks the magic link: /reset-password#access_token=...&type=recovery
    const checkSession = async () => {
      // Give Supabase a moment to process the hash params
      await new Promise(r => setTimeout(r, 300))
      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      if (session) {
        setStep('form')
      } else {
        // No session — link is expired / invalid
        setStep('invalid')
      }
    }

    checkSession()
    return () => { mounted = false }
  }, [])

  // ── 2. Submit new password ──
  const handleSubmit = async () => {
    setError('')

    if (password.length < 8) {
      return setError('Le mot de passe doit contenir au moins 8 caractères.')
    }
    if (strength < 2) {
      return setError('Mot de passe trop faible. Ajoutez des chiffres ou des majuscules.')
    }
    if (password !== confirm) {
      return setError('Les mots de passe ne correspondent pas.')
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setStep('success')
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // ── UI ──
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(165deg, #F5F5F5, #E3E3FF 50%, #f0f9ff)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 44,
        width: '100%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,.06)',
        border: '1px solid #E5E5E5',
      }} className="fade-in">

        {/* ── LOADING ── */}
        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 40, height: 40,
              border: '3px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin .7s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: 'var(--slate)', fontSize: '.9rem' }}>Vérification du lien…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* ── INVALID LINK ── */}
        {step === 'invalid' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: '#FEF2F2', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 20px',
            }}>⚠️</div>
            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', marginBottom: 8 }}>
              Lien invalide ou expiré
            </div>
            <p style={{ fontSize: '.9rem', color: 'var(--slate)', lineHeight: 1.6, marginBottom: 24 }}>
              Ce lien de réinitialisation est invalide ou a expiré (validité&nbsp;: 1&nbsp;heure).
              Veuillez recommencer la procédure.
            </p>
            <Link to="/forgot-password" className="btn btn-primary btn-full" style={{ display: 'block', textAlign: 'center', padding: 13 }}>
              Demander un nouveau lien
            </Link>
            <Link to="/login" style={{ display: 'block', marginTop: 12, fontSize: '.82rem', color: 'var(--slate)' }}>
              ← Retour à la connexion
            </Link>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'var(--green-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 20px',
            }}>✅</div>
            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', marginBottom: 8 }}>
              Mot de passe mis à jour !
            </div>
            <p style={{ fontSize: '.9rem', color: 'var(--slate)', lineHeight: 1.6, marginBottom: 28 }}>
              Votre nouveau mot de passe a été enregistré avec succès.
              Vous pouvez maintenant vous connecter.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-full"
              style={{ padding: 13 }}
            >
              Se connecter →
            </button>
          </div>
        )}

        {/* ── FORM ── */}
        {step === 'form' && (
          <div>
            <Link to="/login" style={{ fontSize: '.82rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
              ← Retour à la connexion
            </Link>

            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'var(--primary-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', marginBottom: 20,
            }}>🔐</div>

            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', marginBottom: 6 }}>
              Nouveau mot de passe
            </div>
            <div style={{ fontSize: '.88rem', color: 'var(--slate)', marginBottom: 24, lineHeight: 1.5 }}>
              Choisissez un mot de passe fort d'au moins 8 caractères.
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16, fontSize: '.85rem' }}>
                ⚠️ {error}
              </div>
            )}

            {/* New password */}
            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  id="new-password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--slate)', padding: 4 }}
                  title={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 99,
                        background: i <= strength ? STRENGTH_COLORS[strength] : '#e5e7eb',
                        transition: 'background .25s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '.75rem', color: STRENGTH_COLORS[strength], fontWeight: 600 }}>
                    {STRENGTH_LABELS[strength]}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  id="confirm-password"
                  type={showCfm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                  autoComplete="new-password"
                  style={{
                    paddingRight: 44,
                    borderColor: confirm.length > 0
                      ? password === confirm ? '#22c55e' : '#ef4444'
                      : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCfm(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--slate)', padding: 4 }}
                  title={showCfm ? 'Masquer' : 'Afficher'}
                >
                  {showCfm ? '🙈' : '👁️'}
                </button>
              </div>
              {confirm.length > 0 && password !== confirm && (
                <div style={{ fontSize: '.78rem', color: '#ef4444', marginTop: 4 }}>
                  Les mots de passe ne correspondent pas.
                </div>
              )}
              {confirm.length > 0 && password === confirm && (
                <div style={{ fontSize: '.78rem', color: '#22c55e', marginTop: 4 }}>
                  ✓ Les mots de passe correspondent.
                </div>
              )}
            </div>

            {/* Tips box */}
            <div style={{
              padding: '12px 16px', background: 'var(--primary-light)',
              borderRadius: 10, fontSize: '.78rem', color: 'var(--primary)',
              lineHeight: 1.7, marginBottom: 20,
            }}>
              <strong>Conseils :</strong> Utilisez au moins 8 caractères, une majuscule, un chiffre et un symbole.
            </div>

            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-full"
              style={{ padding: 13 }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} /> Mise à jour…
                </span>
              ) : 'Enregistrer le nouveau mot de passe'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
