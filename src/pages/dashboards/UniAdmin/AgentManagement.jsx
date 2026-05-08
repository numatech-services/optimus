import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { uploadUserPhoto } from '../../../utils/storageService'
import { exportCSV } from '../../../hooks/useExportData'

const AGENT_ROLES = [
  { id: 'scolarite', label: 'Scolarité', icon: '📝', color: '#14b8a6', desc: 'Inscriptions, notes, EDT, documents' },
  { id: 'enseignant', label: 'Enseignant', icon: '👨‍🏫', color: '#18753C', desc: 'Cours, notes, étudiants' },
  { id: 'surveillant', label: 'Surveillant', icon: '🛡️', color: '#E10600', desc: 'Scanner, monitoring, incidents' },
  { id: 'bibliotheque', label: 'Bibliothèque', icon: '📚', color: '#F3812B', desc: 'Catalogue, emprunts, lecteurs' },
  { id: 'comptabilite', label: 'Comptabilité', icon: '💰', color: '#6E445A', desc: 'Recettes, dépenses, impayés' },
]

const EMPTY_FORM = { name: '', email: '', role: 'scolarite', telephone: '' }

export default function AgentManagement() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || 'univ-niamey'
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, photo: null, photoFile: null, photoPreview: null })
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => { loadAgents() }, [tenantId])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('users')
        .select('*').limit(500)
        .eq('tenant_id', tenantId)
        .in('role', AGENT_ROLES.map(r => r.id))
        .order('name')
        .limit(500)
      if (data) setAgents(data)
    } catch (err) {
      console.error('[Agents]', err.message)
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!form.name || !form.email) return showToast('Nom et email requis', 'error')
    if (!form.email.includes('@') || !form.email.includes('.')) return showToast('Email invalide', 'error')
    if (form.name.length < 3) return showToast('Nom trop court (min 3 caractères)', 'error')
    try {
      const { error } = await supabase.from('users').insert([{
        name: form.name, email: form.email.toLowerCase().trim(),
        role: form.role, tenant_id: tenantId,
      }])
      if (error) throw error
      showToast(`Agent ${form.name} créé`)
      setModal(null)
      setForm(EMPTY_FORM)
      loadAgents()
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error')
    }
  }

  const handleDelete = async (agent) => {
    if (!confirm(`Supprimer ${agent.name} ?`)) return
    try {
      const { error } = await supabase.from('users').delete().eq('id', agent.id)
      if (error) throw error
      showToast('Agent supprimé')
      loadAgents()
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error')
    }
  }

  const filtered = filter === 'all' ? agents : agents.filter(a => a.role === filter)
  const roleCounts = AGENT_ROLES.map(r => ({ ...r, count: agents.filter(a => a.role === r.id).length }))

  if (loading) return <DashLayout title="Agents"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Gestion des agents">
      {toast && /* role=status for screen readers */ (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#FEE8E7' : '#E6F0E9', color: toast.type === 'error' ? '#E10600' : '#18753C', padding: '14px 22px', borderRadius: 14, fontWeight: 600, fontSize: '.85rem', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <div className="dash-page-title">Gestion des agents & profils</div>
      <div className="dash-page-sub">Créez et gérez les comptes du personnel de votre établissement</div>

      {/* Role cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {roleCounts.map(r => (
          <div key={r.id} onClick={() => setFilter(filter === r.id ? 'all' : r.id)}
            style={{
              ...( filter === r.id ? { borderTop: `3px solid ${r.color}` } : { borderTop: '3px solid transparent' }),
              background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px',
              cursor: 'pointer', transition: 'all .15s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.2rem' }}>{r.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--ink)' }}>{r.label}</span>
            </div>
            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: r.color }}>{r.count}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--slate)', marginTop: 2 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">
            {filter === 'all' ? `Tous les agents (${agents.length})` : `${AGENT_ROLES.find(r => r.id === filter)?.label} (${filtered.length})`}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>+ Créer un agent</button>
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(agents, [{key:'name',label:'Nom'},{key:'email',label:'Email'},{key:'role',label:'Rôle'}], 'agents')}>📥 Exporter</button>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Agent</th><th>Email</th><th>Rôle</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Aucun agent trouvé</td></tr>
              ) : filtered.map((a, i) => {
                const role = AGENT_ROLES.find(r => r.id === a.role)
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: (role?.color || '#000091') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem' }}>{role?.icon || '👤'}</div>
                        {a.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--slate)', fontSize: '.85rem' }}>{a.email}</td>
                    <td><span style={{ padding: '4px 10px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700, background: (role?.color || '#666666') + '15', color: role?.color || '#666666' }}>{role?.label || a.role}</span></td>
                    <td>
                      <button className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontWeight: 600, fontSize: '.75rem' }} onClick={() => handleDelete(a)}>🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {modal === 'add' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} role="dialog">
          <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 16, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1rem' }}>Créer un agent</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--slate)' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nom et prénom" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="agent@univ-niamey.ne" />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {AGENT_ROLES.map(r => (
                    <button key={r.id} onClick={() => setForm(p => ({ ...p, role: r.id }))}
                      style={{
                        padding: '12px 14px', borderRadius: 10, border: form.role === r.id ? `2px solid ${r.color}` : '1px solid var(--border)',
                        background: form.role === r.id ? r.color + '10' : '#fff', cursor: 'pointer', textAlign: 'left',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.1rem' }}>{r.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: '.82rem', color: form.role === r.id ? r.color : 'var(--ink)' }}>{r.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1 }}>Créer le compte</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
