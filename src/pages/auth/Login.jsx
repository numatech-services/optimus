import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRateLimit from '../../hooks/useRateLimit'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { isLimited, checkLimit } = useRateLimit(5, 60000)
  const [showCreds, setShowCreds] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) return setError('Email et mot de passe requis')
    if (!checkLimit()) return setError('Trop de tentatives. Réessayez dans 1 minute.')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate(result.redirect)
    } else {
      setError(result.error)
    }
  }

  const quickLogin = (cred) => {
    setEmail(cred.email)
    setPassword(cred.password)
    setShowCreds(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F5F5F5' }} className="login-split">

      {/* ── Left panel ── */}
      <div className="login-left" style={{ width: '44%', background: 'linear-gradient(155deg,#070c1a 0%,#0d1a30 60%,#0b2040 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '-20%', right: '-20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 65%)' }} />

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--ink)' }}>OC</div>
          <span style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>Optimus Campus</span>
        </Link>

        {/* Pitch */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.9rem', color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>
            Gérez votre université.<br />En toute sécurité.
          </h2>
          <p style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.5)', lineHeight: 1.6, marginBottom: 32 }}>
            Plateforme SaaS de gestion universitaire — scolarité, finances, examens et contrôle d'accès.
          </p>
          {[
            { icon: '🔒', text: "Contrôle d'accès QR-code aux examens" },
            { icon: '📊', text: 'Pilotage multi-campus en temps réel' },
            { icon: '💳', text: 'Paiements mobile-money intégrés' },
            { icon: '🎓', text: 'Portails étudiants, enseignants & admin' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', flexShrink: 0 }}>{f.icon}</div>
              <span style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.65)' }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* URL note */}
        <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '14px 18px', border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.3)', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Architecture multi-tenant</div>
          <div style={{ fontFamily: 'monospace', fontSize: '.78rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'rgba(255,255,255,.5)' }}>🔗 etablissement.optimuscampus.com</span>
            <span style={{ color: 'rgba(255,255,255,.5)' }}>⚙️ etablissement.optimuscampus.com/admin</span>
            <span style={{ color: 'var(--primary)' }}>🌐 optimuscampus.com/login (général)</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="login-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 44, width: '100%', maxWidth: 420, boxShadow: '0 8px 48px rgba(0,0,0,.06)' }} className="fade-in">

          <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: 4 }}>Connexion</div>
          <div style={{ fontSize: '.88rem', color: 'var(--slate)', marginBottom: 24 }}>Accédez à votre espace Optimus Campus</div>

          {/* Error message */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          <div>
            <div className="form-group">
              <label className="form-label">Adresse email</label>
              <input
                className={`form-input${error ? ' error' : ''}`}
                type="email"
                placeholder="vous@etablissement.edu"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <div style={{ position:'relative' }}>
                <input
                  className={`form-input${error ? ' error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight:44 }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'var(--slate)', padding:4 }}
                  title={showPassword ? 'Masquer' : 'Afficher'}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <Link to="/forgot-password" style={{ display: 'block', textAlign: 'right', fontSize: '.78rem', color: 'var(--primary)', marginTop: 6 }}>
                Mot de passe oublié ?
              </Link>
            </div>
            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-full"
              style={{ padding: 13, fontSize: '.95rem', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter →'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0', color: 'var(--slate)', fontSize: '.8rem' }}>
            <div style={{ flex: 1, height: 1, background: '#e0e5ef' }} />
            ou
            <div style={{ flex: 1, height: 1, background: '#e0e5ef' }} />
          </div>

          {/* Test credentials — visible en dev uniquement */}
          {import.meta.env.DEV && (
            <>
              <button
                onClick={() => setShowCreds(!showCreds)}
                style={{ width: '100%', background: 'var(--mist)', border: 'none', borderRadius: 8, padding: 11, fontSize: '.85rem', color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 500 }}
              >
                🔑 Comptes de test {showCreds ? '▲' : '▼'}
              </button>

              {showCreds && (
                <div style={{ marginTop: 10, border: '1px solid #e0e8f4', borderRadius: 10, overflow: 'hidden' }}>
                  {seedData.credentials.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => quickLogin(c)}
                      style={{ padding: '10px 14px', borderBottom: i < seedData.credentials.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.82rem', background: '#fff', transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{c.role}</div>
                        <div style={{ color: 'var(--slate)', fontSize: '.73rem' }}>{c.email}</div>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '.73rem', background: 'var(--mist)', padding: '4px 8px', borderRadius: 4, color: 'var(--ink)', flexShrink: 0 }}>
                        {c.password}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Admin link */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Link to="/login/admin" style={{ fontSize: '.8rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              ⚙️ Accès Administrateur système
            </Link>
          </div>

          {/* Back to site */}
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Link to="/" style={{ fontSize: '.78rem', color: 'var(--slate)' }}>
              ← Retour au site
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
