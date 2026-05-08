import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, BookOpen, GraduationCap, Dna, Plus, Edit, Trash2, Settings, Check, XCircle, Search } from 'lucide-react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import useEscapeKey from '../../../hooks/useEscapeKey'
import { supabase } from '../../../lib/supabase'

const TABS_CONFIG = {
  years: { label: 'Années Académiques', table: 'academic_years', field: 'Libellé de l\'année', placeholder: 'Ex: 2025-2026', icon: Calendar, dbField: 'label' },
  filieres: { label: 'Filières', table: 'filieres', field: 'Nom de la filière', placeholder: 'Ex: L3 Informatique', icon: BookOpen, dbField: 'nom' },
  grades: { label: 'Grades (Profs)', table: 'teacher_grades', field: 'Intitulé du grade', placeholder: 'Ex: Professeur Titulaire', icon: GraduationCap, dbField: 'label' },
  specs: { label: 'Spécialités (Profs)', table: 'teacher_specialities', field: 'Nom de la spécialité', placeholder: 'Ex: Intelligence Artificielle', icon: Dna, dbField: 'label' }
}

function Modal({ title, onClose, children, icon: Icon }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 450, borderRadius: 14, padding: 0, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', color: '#fff' }}>
          <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>{Icon && <Icon size={20} />}{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export default function AcademicData() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const tenantId = user?.tenant_id || user?.tenant

  const [activeTab, setActiveTab] = useState('years')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ years: [], filieres: [], grades: [], specs: [] })
  
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ label: '' })
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  useEscapeKey(() => setModal(null))

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    if (tenantId) fetchAllAcademicData()
  }, [tenantId])

  const fetchAllAcademicData = async () => {
    setLoading(true)
    try {
      const [resYears, resFil, resGrades, resSpecs] = await Promise.all([
        supabase.from('academic_years').select('*').eq('tenant_id', tenantId).order('label', { ascending: false }),
        supabase.from('filieres').select('*').eq('tenant_id', tenantId).order('nom'),
        supabase.from('teacher_grades').select('*').eq('tenant_id', tenantId).order('label'),
        supabase.from('teacher_specialities').select('*').eq('tenant_id', tenantId).order('label')
      ])
      setData({
        years: resYears.data || [],
        filieres: resFil.data || [],
        grades: resGrades.data || [],
        specs: resSpecs.data || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.label.trim()) return showToast("Champ obligatoire", "error")
    const config = TABS_CONFIG[activeTab]
    const dbField = config.dbField || 'label'
    const payload = { [dbField]: form.label.trim(), tenant_id: tenantId }

    try {
      if (modal === 'add') {
        const { error } = await supabase.from(config.table).insert([payload])
        if (error) throw error
        showToast("Élément ajouté")
      } else {
        const { error } = await supabase.from(config.table).update(payload).eq('id', selected.id)
        if (error) throw error
        showToast("Mise à jour réussie")
      }
      setModal(null); setForm({ label: '' }); fetchAllAcademicData()
    } catch (err) {
      showToast(err.code === '23505' ? "Doublon détecté" : err.message, "error")
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from(TABS_CONFIG[activeTab].table).delete().eq('id', selected.id)
      if (error) throw error
      showToast("Suppression effectuée")
      setModal(null); fetchAllAcademicData()
    } catch (err) {
      showToast("Impossible : Données liées", "error")
    }
  }

  const filtered = (data[activeTab] || []).filter(item => 
    (item.label || item.nom || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <DashLayout title="Configuration"><div style={{ padding: 60, textAlign: 'center', fontWeight: 700 }}>Synchronisation...</div></DashLayout>

  return (
    <DashLayout title="Configuration Académique" requiredRole="admin_universite">
      
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <XCircle size={16} /> : <Check size={16} />} {toast.msg}
        </div>
      )}

      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Ajout' : 'Édition'} onClose={() => setModal(null)} icon={modal === 'add' ? Plus : Edit}>
          <div className="form-group">
            <label className="form-label">{TABS_CONFIG[activeTab].field}</label>
            <input className="form-input" value={form.label} onChange={e => setForm({ label: e.target.value })} placeholder={TABS_CONFIG[activeTab].placeholder} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Enregistrer</button>
          </div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Suppression" onClose={() => setModal(null)} icon={Trash2}>
          <p style={{ fontSize: '.9rem', color: 'var(--slate)' }}>Supprimer <strong>{selected.label || selected.nom}</strong> ?</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Confirmer</button>
          </div>
        </Modal>
      )}

      <div className="dash-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Settings size={24} /> Configuration Académique</div>
      
      {/* STATS HORIZONTALES */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginTop: 20, 
        marginBottom: 24, 
        overflowX: 'auto', 
        paddingBottom: 4 
      }}>
        {[
          { key: 'years', label: 'Cycles', value: data.years.length, color: 'var(--blue)', Icon: Calendar },
          { key: 'filieres', label: 'Filières', value: data.filieres.length, color: 'var(--teal)', Icon: BookOpen },
          { key: 'grades', label: 'Grades', value: data.grades.length, color: 'var(--gold)', Icon: GraduationCap },
          { key: 'specs', label: 'Spécialités', value: data.specs.length, color: 'var(--purple)', Icon: Dna }
        ].map((k) => (
          <div key={k.key} onClick={() => setActiveTab(k.key)} style={{
            flex: 1, minWidth: 160, background: '#fff', border: activeTab === k.key ? `2px solid ${k.color}` : '1px solid var(--border)',
            borderRadius: 12, padding: '12px 16px', cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ background: k.color + '15', padding: 8, borderRadius: 8 }}><k.Icon size={18} color={k.color} /></div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)' }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--mist)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {Object.entries(TABS_CONFIG).map(([id, config]) => (
          <button key={id} onClick={() => { setActiveTab(id); setSearch('') }} 
            style={{ 
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem',
              background: activeTab === id ? '#fff' : 'transparent', color: activeTab === id ? 'var(--ink)' : 'var(--slate)',
              boxShadow: activeTab === id ? '0 2px 6px rgba(0,0,0,.05)' : 'none', display: 'flex', alignItems: 'center', gap: 6
            }}>
            <config.icon size={14} />{config.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div className="section-title" style={{ fontSize: '.95rem' }}>Référentiel : {TABS_CONFIG[activeTab].label}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, color: 'var(--slate)' }} />
              <input className="form-input" placeholder="Filtrer..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 180, paddingLeft: 34, height: 36, fontSize: '.85rem' }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm({ label: '' }); setModal('add') }} style={{ height: 36 }}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>ID</th>
                <th>Désignation</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--slate)', fontSize: '.7rem' }}>#{item.id.toString().slice(-4)}</td>
                  <td style={{ fontWeight: 600 }}>{item.label || item.nom}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-secondary" style={{ padding: '4px 8px' }} onClick={() => { setSelected(item); setForm({ label: item.label || item.nom || '' }); setModal('edit') }}><Edit size={14} /></button>
                      <button className="btn btn-sm btn-danger" style={{ padding: '4px 8px' }} onClick={() => { setSelected(item); setModal('delete') }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={() => navigate('/dashboard/uni-admin')} style={{ background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', fontWeight: 600, fontSize: '.8rem', marginTop: 24 }}>
        ← Retour administration
      </button>
    </DashLayout>
  )
}