import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { exportCSV } from '../../../hooks/useExportData'

const AGENT_ROLES = [
  { id: 'scolarite',    label: 'Scolarité',     color: '#14b8a6', desc: 'Inscriptions, notes, EDT, documents' },
  { id: 'enseignant',   label: 'Enseignant',    color: '#18753C', desc: 'Cours, notes, étudiants' },
  { id: 'surveillant',  label: 'Surveillant',   color: '#E10600', desc: 'Scanner, monitoring, incidents' },
  { id: 'bibliotheque', label: 'Bibliothèque',  color: '#F3812B', desc: 'Catalogue, emprunts, lecteurs' },
  { id: 'comptabilite', label: 'Comptabilité',  color: '#6E445A', desc: 'Recettes, dépenses, impayés' },
]

const EMPTY_FORM = { name: '', email: '', role: 'scolarite', telephone: '', password: '', confirmPassword: '' }

function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const levels = [
    { label: 'Très faible', color: '#ef4444' },
    { label: 'Faible',      color: '#f97316' },
    { label: 'Moyen',       color: '#eab308' },
    { label: 'Fort',        color: '#22c55e' },
    { label: 'Très fort',   color: '#16a34a' },
  ]
  const level = levels[score] || levels[0]
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? level.color : 'var(--border)', transition: 'background .2s' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: level.color, fontWeight: 600 }}>{level.label}</div>
    </div>
  )
}

export default function AgentManagement() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || 'univ-niamey'

  const [agents, setAgents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState({ ...EMPTY_FORM })
  const [filter, setFilter]   = useState('all')
  const [toast, setToast]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const pf = (key, val) => setForm(p => ({ ...p, [key]: val }))

  useEffect(() => { loadAgents() }, [tenantId])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('users').select('*').limit(500)
        .eq('tenant_id', tenantId)
        .in('role', AGENT_ROLES.map(r => r.id))
        .order('name')
      if (data) setAgents(data)
    } catch (err) { console.error('[Agents]', err.message) }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!form.name || !form.email)            return showToast('Nom et email requis', 'error')
    if (!form.email.includes('@'))            return showToast('Email invalide', 'error')
    if (form.name.length < 3)                return showToast('Nom trop court (min 3 caractères)', 'error')
    if (!form.password)                       return showToast('Mot de passe requis', 'error')
    if (form.password.length < 8)            return showToast('Mot de passe trop court (min 8 caractères)', 'error')
    if (form.password !== form.confirmPassword) return showToast('Les mots de passe ne correspondent pas', 'error')

    setSaving(true)
    try {
      const email = form.email.toLowerCase().trim()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const serviceKey  = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

      // ── Étape 1 : créer le compte Auth via l'API Admin ──
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          email,
          password: form.password,
          email_confirm: true,
          user_metadata: { name: form.name, role: form.role, tenant_id: tenantId },
        }),
      })

      const authData = await authRes.json()
      if (!authRes.ok) throw new Error(authData.message || authData.msg || 'Erreur création Auth')

      // ── Étape 2 : insérer dans public.users ──
      const { error: dbError } = await supabase.from('users').insert([{
        id: authData.id,
        email,
        name: form.name,
        role: form.role,
        tenant_id: tenantId,
      }])

      if (dbError) {
        // Rollback : supprimer le compte Auth si l'insert échoue
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.id}`, {
          method: 'DELETE',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
        })
        throw new Error(dbError.message)
      }

      showToast(`Compte de ${form.name} créé avec succès`)
      setModal(null)
      setForm({ ...EMPTY_FORM })
      loadAgents()
    } catch (err) {
      showToast('Erreur : ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (agent) => {
    if (!confirm(`Supprimer ${agent.name} ? Cette action est irréversible.`)) return
    try {
      const { error } = await supabase.from('users').delete().eq('id', agent.id)
      if (error) throw error
      showToast('Agent supprimé')
      loadAgents()
    } catch (err) { showToast('Erreur : ' + err.message, 'error') }
  }

  const filtered    = filter === 'all' ? agents : agents.filter(a => a.role === filter)
  const roleCounts  = AGENT_ROLES.map(r => ({ ...r, count: agents.filter(a => a.role === r.id).length }))

  if (loading) return <DashLayout title="Agents"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Gestion des agents">

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#FEE8E7' : '#E6F0E9', color: toast.type === 'error' ? '#E10600' : '#18753C', padding: '14px 22px', borderRadius: 14, fontWeight: 600, fontSize: '.85rem', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <div className="dash-page-title">Gestion des agents & profils</div>
      <div className="dash-page-sub">Créez et gérez les comptes du personnel de votre établissement</div>

      {/* Cartes par rôle */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {roleCounts.map(r => (
          <div key={r.id} onClick={() => setFilter(filter === r.id ? 'all' : r.id)}
            style={{ borderTop: `3px solid ${filter === r.id ? r.color : 'transparent'}`, background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--ink)' }}>{r.label}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: r.color }}>{r.count}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--slate)', marginTop: 2 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div className="section-title">
            {filter === 'all' ? `Tous les agents (${agents.length})` : `${AGENT_ROLES.find(r => r.id === filter)?.label} (${filtered.length})`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm"
              onClick={() => exportCSV(agents, [{ key:'name', label:'Nom' }, { key:'email', label:'Email' }, { key:'role', label:'Rôle' }], 'agents')}>
              Exporter CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm({ ...EMPTY_FORM }); setModal('add') }}>
              + Créer un agent
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr><th>Agent</th><th>Email</th><th>Rôle</th><th>Créé le</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Aucun agent trouvé</td></tr>
              ) : filtered.map((a, i) => {
                const role = AGENT_ROLES.find(r => r.id === a.role)
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: (role?.color || '#000') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: role?.color || '#666' }}>
                          {a.name?.slice(0, 2).toUpperCase()}
                        </div>
                        {a.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--slate)', fontSize: '.85rem' }}>{a.email}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700, background: (role?.color || '#666') + '15', color: role?.color || '#666' }}>
                        {role?.label || a.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '.78rem', color: 'var(--slate)' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td>
                      <button
                        style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '.75rem' }}
                        onClick={() => handleDelete(a)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal création */}
      {modal === 'add' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} role="dialog">
          <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 16, padding: 0, maxHeight: '90vh', overflow: 'auto' }}>

            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>Créer un agent</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--slate)' }}>×</button>
            </div>

            <div style={{ padding: 24 }}>

              {/* Identité */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Identité</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nom complet *</label>
                  <input className="form-input" value={form.name} onChange={e => pf('name', e.target.value)} placeholder="Prénom Nom" />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input className="form-input" value={form.telephone} onChange={e => pf('telephone', e.target.value)} placeholder="+227 90 00 00 00" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => pf('email', e.target.value)} placeholder="agent@universite.ne" />
              </div>

              {/* Mot de passe */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Mot de passe</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Mot de passe *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => pf('password', e.target.value)}
                      placeholder="Min. 8 caractères"
                      style={{ paddingRight: 36 }}
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: 13 }}>
                      {showPwd ? 'Cacher' : 'Voir'}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmer *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={e => pf('confirmPassword', e.target.value)}
                      placeholder="Répéter le mot de passe"
                      style={{ paddingRight: 36, borderColor: form.confirmPassword && form.confirmPassword !== form.password ? 'var(--red)' : undefined }}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: 13 }}>
                      {showConfirm ? 'Cacher' : 'Voir'}
                    </button>
                  </div>
                  {form.confirmPassword && form.confirmPassword !== form.password && (
                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontWeight: 600 }}>Les mots de passe ne correspondent pas</div>
                  )}
                  {form.confirmPassword && form.confirmPassword === form.password && (
                    <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>Correspond</div>
                  )}
                </div>
              </div>

              {/* Rôle */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Rôle *</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {AGENT_ROLES.map(r => (
                  <button key={r.id} onClick={() => pf('role', r.id)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: form.role === r.id ? `2px solid ${r.color}` : '1px solid var(--border)', background: form.role === r.id ? r.color + '12' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '.82rem', color: form.role === r.id ? r.color : 'var(--ink)' }}>{r.label}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--slate)', marginTop: 2 }}>{r.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>Annuler</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Création en cours…' : 'Créer le compte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}