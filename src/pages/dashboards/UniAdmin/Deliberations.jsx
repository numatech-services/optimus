import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { exportCSV } from '../../../hooks/useExportData'

export default function Deliberations() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  const [deliberations, setDeliberations] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('sessions')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ label: '', date_deliberation: '', president_jury: '', membres_jury: '' })

  const load = async () => {
    setLoading(true)
    const [rD, rA] = await Promise.all([
      supabase.from('deliberations').select('*, semestres(label, niveau), filieres(label)').eq('tenant_id', tid).order('date_deliberation', { ascending: false }).limit(500),
      supabase.from('notes_audit_log').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(500),
    ])
    if (rD.data) setDeliberations(rD.data)
    if (rA.data) setAuditLogs(rA.data)
    setLoading(false)
  }

  useEffect(() => { if (tid) load() }, [tid])

  const handleCreate = async () => {
    if (!form.label || !form.date_deliberation) return
    const membres = form.membres_jury.split(',').map(m => m.trim()).filter(Boolean)
    try {
      await supabase.from('deliberations').insert([{
        label: form.label, date_deliberation: form.date_deliberation,
        president_jury: form.president_jury, membres_jury: membres,
        statut: 'PRÉPARATION', tenant_id: tid,
      }])
    } catch (err) {
      console.error("[Error]", err.message)
    }
    setModal(null)
    setForm({ label: '', date_deliberation: '', president_jury: '', membres_jury: '' })
    load()
  }

  const handleUpdateStatus = async (id, newStatut) => {
    try {
      await supabase.from('deliberations').update({ statut: newStatut }).eq('id', id)
    } catch (err) {
      console.error("[Error]", err.message)
    }

    // Si publiée → envoyer notifications aux étudiants
    if (newStatut === 'PUBLIÉE') {
      try {
        await supabase.from('notifications').insert([{
          type: 'results_published', role: 'etudiant',
          titre: 'Résultats publiés', detail: 'Les résultats des délibérations sont disponibles.',
          tenant_id: tid, canal: 'email',
        }])
      } catch (err) {
        console.error("[Error]", err.message)
      }
    }
    load()
  }

  const stats = {
    total: deliberations.length,
    preparation: deliberations.filter(d => d.statut === 'PRÉPARATION').length,
    validees: deliberations.filter(d => d.statut === 'VALIDÉE').length,
    publiees: deliberations.filter(d => d.statut === 'PUBLIÉE').length,
    modifications: auditLogs.length,
  }

  if (loading) return <DashLayout title="Délibérations"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Délibérations">
      <div className="dash-page-title">Délibérations & Validation des notes</div>
      <div className="dash-page-sub">Sessions de jury, publication des résultats et journal de modifications</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card"><div className="kpi-label">Sessions</div><div className="kpi-value">{stats.total}</div></div>
        <div className="kpi-card"><div className="kpi-label">En préparation</div><div className="kpi-value" style={{ color: '#F3812B' }}>{stats.preparation}</div></div>
        <div className="kpi-card"><div className="kpi-label">Publiées</div><div className="kpi-value" style={{ color: '#18753C' }}>{stats.publiees}</div></div>
        <div className="kpi-card"><div className="kpi-label">Modifications de notes</div><div className="kpi-value" style={{ color: '#E10600' }}>{stats.modifications}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('sessions')} className={`btn btn-sm ${tab === 'sessions' ? 'btn-primary' : 'btn-secondary'}`}>📋 Sessions de jury ({deliberations.length})</button>
        <button onClick={() => setTab('audit')} className={`btn btn-sm ${tab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}>🔍 Journal de modifications ({auditLogs.length})</button>
        {tab === 'sessions' && <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setModal('create')}>+ Nouvelle session</button>}
        {tab === 'audit' && <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => exportCSV(auditLogs.map(l => ({
          date: new Date(l.created_at).toLocaleDateString('fr-FR'), matiere: l.matiere, etudiant: l.student_id,
          champ: l.champ_modifie, ancienne: l.ancienne_valeur, nouvelle: l.nouvelle_valeur, raison: l.raison, par: l.modifie_par,
        })), [{ key: 'date', label: 'Date' }, { key: 'matiere', label: 'Matière' }, { key: 'champ', label: 'Champ' }, { key: 'ancienne', label: 'Ancienne' }, { key: 'nouvelle', label: 'Nouvelle' }, { key: 'raison', label: 'Raison' }, { key: 'par', label: 'Par' }], 'audit_notes')}>📥 Exporter</button>}
      </div>

      {tab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {deliberations.length === 0 ? (
            <div className="card card-p" style={{ textAlign: 'center', color: 'var(--slate)', padding: 48 }}>Aucune session de délibération</div>
          ) : deliberations.map((d, i) => (
            <div key={i} className="card card-p" style={{ borderLeft: `3px solid ${d.statut === 'PUBLIÉE' ? '#18753C' : d.statut === 'VALIDÉE' ? 'var(--primary)' : '#F3812B'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{d.label}</div>
                  <div style={{ fontSize: 14, color: 'var(--slate)', marginTop: 2 }}>
                    {d.date_deliberation ? new Date(d.date_deliberation).toLocaleDateString('fr-FR') : '—'}
                    {d.president_jury && ` · Président : ${d.president_jury}`}
                  </div>
                  {d.membres_jury?.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>
                      Jury : {d.membres_jury.join(', ')}
                    </div>
                  )}
                </div>
                <span className={`badge ${d.statut === 'PUBLIÉE' ? 'badge-green' : d.statut === 'VALIDÉE' ? 'badge-blue' : d.statut === 'EN_COURS' ? 'badge-amber' : 'badge-slate'}`}>{d.statut}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {d.statut === 'PRÉPARATION' && <button className="btn btn-sm btn-secondary" onClick={() => handleUpdateStatus(d.id, 'EN_COURS')}>▶ Démarrer</button>}
                {d.statut === 'EN_COURS' && <button className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(d.id, 'VALIDÉE')}>✓ Valider le PV</button>}
                {d.statut === 'VALIDÉE' && <button className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(d.id, 'PUBLIÉE')}>📢 Publier les résultats</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table role="table">
              <thead><tr><th>Date</th><th>Matière</th><th>Champ</th><th>Avant</th><th>Après</th><th>Raison</th><th>Par</th></tr></thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Aucune modification enregistrée</td></tr>
                ) : auditLogs.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '.82rem' }}>{new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
                    <td style={{ fontWeight: 600 }}>{l.matiere || '—'}</td>
                    <td><span className="badge badge-blue">{l.champ_modifie}</span></td>
                    <td style={{ color: '#E10600', fontWeight: 600 }}>{l.ancienne_valeur}/20</td>
                    <td style={{ color: '#18753C', fontWeight: 600 }}>{l.nouvelle_valeur}/20</td>
                    <td style={{ fontSize: '.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.raison}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--slate)' }}>{l.modifie_par} ({l.modifie_par_role})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'create' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 16, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="section-title">Nouvelle session de délibération</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="form-group"><label className="form-label">Intitulé *</label><input className="form-input" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Délibération S2 L3 Informatique" /></div>
              <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date_deliberation} onChange={e => setForm(p => ({ ...p, date_deliberation: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Président du jury</label><input className="form-input" value={form.president_jury} onChange={e => setForm(p => ({ ...p, president_jury: e.target.value }))} placeholder="Pr. Abdou Moussa" /></div>
              <div className="form-group"><label className="form-label">Membres du jury (séparés par des virgules)</label><textarea className="form-input" rows={2} value={form.membres_jury} onChange={e => setForm(p => ({ ...p, membres_jury: e.target.value }))} placeholder="Pr. Ibrahim, Dr. Aïssa, Pr. Moussa" style={{ resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1 }}>Créer la session</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
