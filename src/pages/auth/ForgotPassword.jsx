import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordReset } from '../../utils/notificationService'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('form') // form | sending | sent | error
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      return setError('Veuillez saisir une adresse email valide.')
    }
    setStep('sending')
    setError('')

    const result = await sendPasswordReset(email.trim().toLowerCase())

    if (result.success) {
      setStep('sent')
    } else {
      setError(result.error || 'Erreur lors de l\'envoi. Vérifiez votre email.')
      setStep('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(165deg, #F5F5F5, #E3E3FF 50%, #f0f9ff)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 44,
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,.06)',
        border: '1px solid #E5E5E5'
      }} className="fade-in">

        <Link to="/login" style={{ fontSize: '.82rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          ← Retour à la connexion
        </Link>

        {step === 'sent' ? (
          /* ── SUCCÈS ── */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'var(--green-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 20px'
            }}>📧</div>
            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', marginBottom: 8 }}>
              Email envoyé !
            </div>
            <p style={{ fontSize: '.9rem', color: 'var(--slate)', lineHeight: 1.6, marginBottom: 24 }}>
              Un lien de réinitialisation a été envoyé à <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
              Vérifiez votre boîte de réception et vos spams.
            </p>
            <div style={{
              padding: '14px 18px', background: 'var(--primary-light)',
              borderRadius: 12, fontSize: '.82rem', color: 'var(--primary)',
              lineHeight: 1.6, marginBottom: 24, textAlign: 'left'
            }}>
              <strong>⏰ Le lien est valide pendant 1 heure.</strong><br />
              Si vous ne recevez rien, vérifiez que l'adresse email est bien celle utilisée lors de votre inscription.
            </div>
            <button onClick={() => { setStep('form'); setEmail('') }} className="btn btn-secondary btn-full">
              Renvoyer un email
            </button>
          </div>
        ) : (
          /* ── FORMULAIRE ── */
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'var(--primary-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', marginBottom: 20
            }}>🔑</div>

            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', marginBottom: 6 }}>
              Mot de passe oublié
            </div>
            <div style={{ fontSize: '.88rem', color: 'var(--slate)', marginBottom: 24, lineHeight: 1.5 }}>
              Saisissez votre email pour recevoir un lien de réinitialisation sécurisé.
            </div>

            {(error || step === 'error') && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                ⚠️ {error || 'Une erreur est survenue. Réessayez.'}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Adresse email</label>
              <input
                className="form-input"
                type="email"
                aria-label="Email"
                placeholder="vous@etablissement.ne"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                autoFocus
              />
            </div>

            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-full"
              style={{ padding: 13 }}
              disabled={step === 'sending'}
            >
              {step === 'sending' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} /> Envoi en cours…
                </span>
              ) : 'Envoyer le lien de réinitialisation'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
