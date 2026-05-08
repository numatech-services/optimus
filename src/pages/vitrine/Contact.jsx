import Navbar from './Navbar'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Contact() {
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', etablissement: '', message: '', type: 'demo' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.nom.trim()) return setError('Votre nom est requis')
    if (!form.email.trim() || !form.email.includes('@')) return setError('Email invalide')
    if (!form.message.trim()) return setError('Veuillez écrire un message')
    
    try {
      const { error: dbError } = await supabase.from('contact_requests').insert([{
        nom: form.nom.trim(),
        email: form.email.trim().toLowerCase(),
        telephone: form.telephone.trim() || null,
        etablissement: form.etablissement.trim() || null,
        message: form.message.trim(),
        type: form.type,
      }])
      if (dbError) console.error('[Contact] Save error:', dbError.message)
    } catch (err) {
      console.error('[Contact] Error:', err.message)
    }
    setError('')
    setSending(true)

    setSending(false)
    setSent(true)
  }

  const Field = ({ label, name, type = 'text', required, placeholder, textarea }) => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, color: '#1E1E1E', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#E10600' }}> *</span>}
      </label>
      {textarea ? (
        <textarea
          value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          placeholder={placeholder} rows={5}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E5E5E5', fontSize: '.9rem', fontFamily: 'Marianne, Roboto, sans-serif', resize: 'vertical', outline: 'none', transition: 'border .2s' }}
          onFocus={e => e.target.style.borderColor = '#000091'}
          onBlur={e => e.target.style.borderColor = '#E5E5E5'}
        />
      ) : (
        <input
          type={type} value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          placeholder={placeholder}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E5E5E5', fontSize: '.9rem', fontFamily: 'Marianne, Roboto, sans-serif', outline: 'none', transition: 'border .2s' }}
          onFocus={e => e.target.style.borderColor = '#000091'}
          onBlur={e => e.target.style.borderColor = '#E5E5E5'}
        />
      )}
    </div>
  )

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 64 }}>
        <section style={{ padding: '80px 5%', background: 'linear-gradient(165deg, #F5F5F5, #E3E3FF 50%)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60, alignItems: 'start' }}>

            {/* Left — Info */}
            <div>
              <div style={{ display: 'inline-flex', background: '#E3E3FF', border: '1px solid rgba(99,102,241,.15)', padding: '6px 16px', borderRadius: 100, fontSize: '.75rem', fontWeight: 700, color: '#000091', marginBottom: 20, letterSpacing: '.06em', textTransform: 'uppercase' }}>✦ Contactez-nous</div>
              <h1 style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '2rem', color: '#1E1E1E', marginBottom: 16 }}>Parlons de votre projet</h1>
              <p style={{ fontSize: '.95rem', color: '#666666', lineHeight: 1.7, marginBottom: 40 }}>
                Que vous soyez une université publique ou privée, nous adaptons Optimus Campus à vos besoins spécifiques. Démo gratuite, déploiement en 30 jours.
              </p>

              {/* Contact cards */}
              {[
                { icon: '📍', label: 'Adresse', value: 'Niamey, Niger', sub: 'Quartier Plateau' },
                { icon: '📞', label: 'Téléphone', value: '+227 XX XX XX XX', sub: 'Lun-Ven, 8h-18h' },
                { icon: '📧', label: 'Email', value: 'contact@optimus-campus.ne', sub: 'Réponse sous 24h' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: '#E3E3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#666666', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: '.95rem', fontWeight: 600, color: '#1E1E1E' }}>{c.value}</div>
                    <div style={{ fontSize: '.82rem', color: '#666666' }}>{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right — Form */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 36, border: '1px solid #E5E5E5', boxShadow: '0 8px 32px rgba(0,0,0,.04)' }}>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#1E1E1E', marginBottom: 8 }}>Message envoyé !</div>
                  <p style={{ fontSize: '.9rem', color: '#666666', lineHeight: 1.6 }}>Merci {form.nom}. Notre équipe vous répondra sous 24 heures.</p>
                  <button onClick={() => { setSent(false); setForm({ nom: '', email: '', telephone: '', etablissement: '', message: '', type: 'demo' }) }}
                    style={{ marginTop: 20, background: '#E3E3FF', color: '#000091', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#1E1E1E', marginBottom: 4 }}>Demande de démo</div>
                  <div style={{ fontSize: '.85rem', color: '#666666', marginBottom: 24 }}>Remplissez le formulaire, nous vous recontactons</div>

                  {/* Type selector */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[{ id: 'demo', label: '🎓 Démo gratuite' }, { id: 'devis', label: '💰 Devis' }, { id: 'question', label: '❓ Question' }].map(t => (
                      <button key={t.id} onClick={() => setForm(p => ({ ...p, type: t.id }))}
                        style={{
                          padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          fontSize: '.82rem', fontWeight: form.type === t.id ? 700 : 500,
                          background: form.type === t.id ? '#E3E3FF' : '#F0F0F0',
                          color: form.type === t.id ? '#000091' : '#666666',
                        }}>{t.label}</button>
                    ))}
                  </div>

                  {error && <div style={{ padding: '10px 14px', background: '#FEE8E7', color: '#E10600', borderRadius: 10, fontSize: '.85rem', fontWeight: 600, marginBottom: 16 }}>⚠️ {error}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Nom complet" name="nom" required placeholder="Votre nom" />
                    <Field label="Email" name="email" type="email" required placeholder="vous@univ.ne" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Téléphone" name="telephone" type="tel" placeholder="+227 XX XX XX XX" />
                    <Field label="Établissement" name="etablissement" placeholder="Nom de votre université" />
                  </div>
                  <Field label="Message" name="message" required placeholder="Décrivez votre besoin..." textarea />

                  <button onClick={handleSubmit} disabled={sending}
                    style={{
                      width: '100%', padding: 14, borderRadius: 12, border: 'none',
                      background: '#000091', color: '#fff', fontSize: '1rem', fontWeight: 700,
                      cursor: sending ? 'wait' : 'pointer',
                      boxShadow: '0 2px 8px rgba(99,102,241,.3)',
                      opacity: sending ? 0.7 : 1
                    }}>
                    {sending ? '⏳ Envoi en cours...' : 'Envoyer le message →'}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <footer style={{ padding: '36px 5%', borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', color: '#666666', fontSize: '.82rem' }}>
          <span>© 2026 Optimus Campus — Numatech Services</span>
          <span>Conçu au Niger 🇳🇪</span>
        </footer>
      </div>
    </>
  )
}
