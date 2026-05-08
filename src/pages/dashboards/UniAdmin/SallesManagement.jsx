import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { exportCSV } from '../../../hooks/useExportData'

const TYPES = ['COURS','TD','TP','AMPHI','LABO','EXAMEN','REUNION']
const EQUIP = ['Vidéoprojecteur','Climatisation','Wifi','Tableau blanc','Sono','Ordinateurs','Prise électrique']
const EMPTY = { nom:'', code:'', batiment:'', etage:'', capacite:40, type:'COURS', equipements:[], disponible:true }

export default function SallesManagement() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  const [salles, setSalles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('salles').select('*').eq('tenant_id', tid).order('nom').limit(500)
      if (data) setSalles(data)
    } catch (err) {
      console.error("[Error]", err.message)
    }
    setLoading(false)
  }

  useEffect(() => { if (tid) load() }, [tid])

  const handleSave = async () => {
    if (!form.nom) return
    if (form.capacite < 1 || form.capacite > 1000) { alert('Capacité invalide (1-1000)'); return }
    const payload = { ...form, tenant_id: tid, equipements: form.equipements || [] }
    try {
      if (modal === 'add') {
        await supabase.from('salles').insert([payload])
      } else {
        await supabase.from('salles').update(payload).eq('id', selected.id)
      }
      setModal(null); load()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette salle ?')) return
    try {
      await supabase.from('salles').delete().eq('id', id)
    } catch (err) {
      console.error("[Error]", err.message)
    }
    load()
  }

  const filtered = salles.filter(s => {
    if (filter !== 'all' && s.type !== filter) return false
    if (search && !s.nom.toLowerCase().includes(search.toLowerCase()) && !(s.code||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: salles.length,
    dispo: salles.filter(s => s.disponible).length,
    capacite: salles.reduce((s, r) => s + (r.capacite || 0), 0),
    types: [...new Set(salles.map(s => s.type))].length,
  }

  if (loading) return <DashLayout title="Salles"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Gestion des salles">
      <div className="dash-page-title">Gestion des salles</div>
      <div className="dash-page-sub">Salles de cours, amphis, labos et salles d'examen</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { l: 'Total salles', v: stats.total, i: '🏫' },
          { l: 'Disponibles', v: stats.dispo, i: '✅' },
          { l: 'Capacité totale', v: stats.capacite + ' places', i: '💺' },
          { l: 'Types', v: stats.types, i: '📋' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.l}</div>
            <div className="kpi-value">{k.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" placeholder="Rechercher une salle..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        {['all', ...TYPES].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`}>
            {t === 'all' ? 'Toutes' : t}
          </button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setForm(EMPTY); setModal('add') }}>+ Ajouter une salle</button>
        <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(salles, [{key:'nom',label:'Nom'},{key:'batiment',label:'Bâtiment'},{key:'type',label:'Type'},{key:'capacite',label:'Capacité'}], 'salles')}>📥 Exporter</button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr><th>Salle</th><th>Bâtiment</th><th>Type</th><th>Capacité</th><th>Équipements</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Aucune salle trouvée</td></tr>
              ) : filtered.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>
                    <div>{s.nom}</div>
                    {s.code && <div style={{ fontSize: '.72rem', color: 'var(--slate)' }}>{s.code}</div>}
                  </td>
                  <td>{s.batiment || '—'}{s.etage ? ` · ${s.etage}` : ''}</td>
                  <td><span className="badge badge-blue">{s.type}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.capacite} places</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(s.equipements || []).slice(0, 3).map((e, j) => (
                        <span key={j} className="badge badge-slate" style={{ fontSize: '.65rem' }}>{e}</span>
                      ))}
                      {(s.equipements || []).length > 3 && <span className="badge badge-slate" style={{ fontSize: '.65rem' }}>+{s.equipements.length - 3}</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${s.disponible ? 'badge-green' : 'badge-red'}`}>
                      {s.disponible ? 'Disponible' : 'Occupée'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(s); setForm({ ...s }); setModal('edit') }}>✏️</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, borderRadius: 16, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="section-title">{modal === 'add' ? 'Ajouter une salle' : 'Modifier la salle'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--slate)' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group"><label className="form-label">Nom *</label><input className="form-input" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Salle A1" /></div>
                <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="SA1" /></div>
              </div>
              <div className="grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group"><label className="form-label">Bâtiment</label><input className="form-input" value={form.batiment || ''} onChange={e => setForm(p => ({ ...p, batiment: e.target.value }))} placeholder="Bâtiment C" /></div>
                <div className="form-group"><label className="form-label">Étage</label><input className="form-input" value={form.etage || ''} onChange={e => setForm(p => ({ ...p, etage: e.target.value }))} placeholder="RDC" /></div>
              </div>
              <div className="grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="form-input form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Capacité</label><input className="form-input" type="number" value={form.capacite} onChange={e => setForm(p => ({ ...p, capacite: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Équipements</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EQUIP.map(eq => {
                    const active = (form.equipements || []).includes(eq)
                    return (
                      <button key={eq} onClick={() => setForm(p => ({
                        ...p, equipements: active ? (p.equipements || []).filter(e => e !== eq) : [...(p.equipements || []), eq]
                      }))} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '.78rem' }}>{eq}</button>
                    )
                  })}
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={form.disponible} onChange={e => setForm(p => ({ ...p, disponible: e.target.checked }))} />
                  Salle disponible
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>{modal === 'add' ? '+ Créer' : '💾 Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
