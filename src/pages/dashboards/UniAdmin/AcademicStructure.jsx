import { useState, useEffect, useMemo } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

const TABS = [
  { id: 'facultes', label: '🏛️ Facultés / Instituts', table: 'facultes' },
  { id: 'departements', label: '🏢 Départements', table: 'departements' },
  { id: 'filieres', label: '📚 Filières', table: 'filieres' },
  { id: 'sections', label: '📋 Sections', table: 'sections' },
  { id: 'groupes', label: '👥 Groupes TD/TP/Stage', table: 'groupes' },
]

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3']
const TYPES_GROUPE = ['TD', 'TP', 'STAGE', 'COURS']

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} role="dialog" aria-modal="true">
      <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 16, padding: 0 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1rem' }}>{title}</div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--slate)' }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', options, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: 'var(--ink-60)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {options ? (
        <select className="form-input form-select" value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Sélectionner...</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input className="form-input" type={type} value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
}

export default function AcademicStructure() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || 'univ-niamey'
  const [tab, setTab] = useState('facultes')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | 'edit'
  const [form, setForm] = useState({})
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)

  // Data
  const [facultes, setFacultes] = useState([])
  const [departements, setDepartements] = useState([])
  const [filieres, setFilieres] = useState([])
  const [sections, setSections] = useState([])
  const [groupes, setGroupes] = useState([])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => { if (tenantId) loadAll() }, [tenantId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [rF, rD, rFil, rS, rG] = await Promise.all([
        supabase.from('facultes').select('*').eq('tenant_id', tenantId).order('nom').limit(500),
        supabase.from('departements').select('*, facultes(nom)').eq('tenant_id', tenantId).order('nom').limit(500),
        supabase.from('filieres').select('*, departements(nom)').eq('tenant_id', tenantId).order('nom').limit(500),
        supabase.from('sections').select('*, filieres(nom)').eq('tenant_id', tenantId).order('nom').limit(500),
        supabase.from('groupes').select('*, sections(nom), teachers(nom, prenom)').eq('tenant_id', tenantId).order('nom').limit(500),
      ])
      if (rF.data) setFacultes(rF.data)
      if (rD.data) setDepartements(rD.data)
      if (rFil.data) setFilieres(rFil.data)
      if (rS.data) setSections(rS.data)
      if (rG.data) setGroupes(rG.data)
    } catch (err) {
      console.error('[AcademicStructure]', err.message)
    }
    setLoading(false)
  }

  const currentTab = TABS.find(t => t.id === tab)
  const currentData = { facultes, departements, filieres, sections, groupes }[tab] || []
const handleSave = async () => {
  // 1. On s'assure d'avoir au moins un nom (clé utilisée en DB)
  if (!form.nom && !form.label) return

  try {
    // 2. Préparation du payload
    // On uniformise : si le form a un 'label', on le met dans 'nom' pour la DB
    const payload = { 
      ...form, 
      nom: form.nom || form.label,
      tenant_id: tenantId 
    }

    // 3. NETTOYAGE CRITIQUE : Supabase rejette les colonnes inconnues ou les objets joints
    // On supprime les clés qui ne sont pas des colonnes réelles dans tes tables
    delete payload.label      // On utilise 'nom' à la place
    delete payload.facultes   // Supprime l'objet joint chargé par .select('*, facultes(nom)')
    delete payload.departements
    delete payload.filieres
    delete payload.sections
    delete payload.teachers

    let error;

    if (modal === 'add') {
      const { error: insertError } = await supabase
        .from(currentTab.table)
        .insert([payload])
      error = insertError
      if (!error) showToast(`${currentTab.label.split(' ').pop()} ajouté(e)`)
    } else {
      // Pour l'update, on retire l'ID du corps de la mise à jour
      const id = selected.id
      delete payload.id 
      
      const { error: updateError } = await supabase
        .from(currentTab.table)
        .update(payload)
        .eq('id', id)
      error = updateError
      if (!error) showToast('Modification enregistrée')
    }

    if (error) throw error

    setModal(null)
    loadAll()
  } catch (err) {
    console.error('Save Error:', err)
    showToast('Erreur: ' + err.message, 'error')
  }
}

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet élément ?')) return
    try {
      const { error } = await supabase.from(currentTab.table).delete().eq('id', id)
      if (error) throw error
      showToast('Supprimé')
      loadAll()
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error')
    }
  }

  const openAdd = () => { setForm({}); setModal('add') }
  const openEdit = (item) => { setSelected(item); setForm({ ...item }); setModal('edit') }

  // Stats
  const stats = useMemo(() => ({
    facultes: facultes.length,
    departements: departements.length,
    filieres: filieres.length,
    sections: sections.length,
    groupes: groupes.length,
  }), [facultes, departements, filieres, sections, groupes])

  if (loading) return <DashLayout title="Structure académique"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Structure académique">
      {toast && /* role=status for screen readers */ (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#FEE8E7' : '#E6F0E9', color: toast.type === 'error' ? '#E10600' : '#18753C', padding: '14px 22px', borderRadius: 14, fontWeight: 600, fontSize: '.85rem', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <div className="dash-page-title">Structure académique</div>
      <div className="dash-page-sub">Facultés, départements, filières, sections et groupes</div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        {[
          { l: 'Facultés', v: stats.facultes, i: '🏛️', c: '#000091' },
          { l: 'Départements', v: stats.departements, i: '🏢', c: '#3b82f6' },
          { l: 'Filières', v: stats.filieres, i: '📚', c: '#18753C' },
          { l: 'Sections', v: stats.sections, i: '📋', c: '#F3812B' },
          { l: 'Groupes', v: stats.groupes, i: '👥', c: '#6E445A' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" onClick={() => setTab(TABS[i].id)} style={{ cursor: 'pointer', borderTop: tab === TABS[i].id ? `3px solid ${k.c}` : '3px solid transparent' }}>
            <div className="kpi-label">{k.l}</div>
            <div className="kpi-value" style={{ color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: '.82rem', fontWeight: tab === t.id ? 700 : 500,
            background: tab === t.id ? 'var(--primary-light)' : 'var(--mist)',
            color: tab === t.id ? 'var(--primary)' : 'var(--ink-60)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">{currentTab.label} ({currentData.length})</div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Ajouter</button>
        </div>

        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Nom</th>
                {tab === 'departements' && <th>Faculté</th>}
                {tab === 'filieres' && <th>Département</th>}
                {tab === 'sections' && <th>Filière</th>}
                {tab === 'sections' && <th>Niveau</th>}
                {tab === 'groupes' && <th>Type</th>}
                {tab === 'groupes' && <th>Section</th>}
                {tab === 'facultes' && <th>Doyen</th>}
                {(tab === 'sections' || tab === 'groupes') && <th>Capacité</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Aucune donnée. Cliquez sur "+ Ajouter" pour commencer.</td></tr>
              ) : currentData.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{item.nom || item.label || '—'}</td>
                  {tab === 'departements' && <td>{item.facultes?.nom || '—'}</td>}
                  {tab === 'filieres' && <td>{item.departements?.nom || '—'}</td>}
                  {tab === 'sections' && <td>{item.filieres?.nom || item.filieres?.label || '—'}</td>}
                  {tab === 'sections' && <td><span className="badge badge-blue">{item.niveau}</span></td>}
                  {tab === 'groupes' && <td><span className={`badge ${item.type === 'TD' ? 'badge-blue' : item.type === 'TP' ? 'badge-green' : 'badge-purple'}`}>{item.type}</span></td>}
                  {tab === 'groupes' && <td>{item.sections?.nom || '—'}</td>}
                  {tab === 'facultes' && <td>{item.doyen || '—'}</td>}
                  {(tab === 'sections' || tab === 'groupes') && <td>{item.capacite || '—'}</td>}
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>✏️</button>
                      <button className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleDelete(item.id)}>🗑️</button>
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
        <Modal title={`${modal === 'add' ? 'Ajouter' : 'Modifier'} — ${currentTab.label}`} onClose={() => setModal(null)}>
          {tab === 'facultes' && <>
            <Field label="Nom de la faculté / institut" value={form.nom} onChange={v => setForm(p => ({ ...p, nom: v }))} required />
            <Field label="Code" value={form.code} onChange={v => setForm(p => ({ ...p, code: v }))} />
            <Field label="Doyen / Directeur" value={form.doyen} onChange={v => setForm(p => ({ ...p, doyen: v }))} />
            <Field label="Email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} type="email" />
          </>}

          {tab === 'departements' && <>
            <Field label="Nom du département" value={form.nom} onChange={v => setForm(p => ({ ...p, nom: v }))} required />
            <Field label="Code" value={form.code} onChange={v => setForm(p => ({ ...p, code: v }))} />
            <Field label="Faculté" value={form.faculte_id} onChange={v => setForm(p => ({ ...p, faculte_id: v }))} options={facultes.map(f => ({ value: f.id, label: f.nom }))} required />
            <Field label="Chef de département" value={form.chef} onChange={v => setForm(p => ({ ...p, chef: v }))} />
          </>}

          {tab === 'filieres' && <>
            <Field label="Nom de la filière" value={form.nom} onChange={v => setForm(p => ({ ...p, nom: v }))} required />            <Field label="Code" value={form.code} onChange={v => setForm(p => ({ ...p, code: v }))} />
            <Field label="Département" value={form.departement_id} onChange={v => setForm(p => ({ ...p, departement_id: v }))} options={departements.map(d => ({ value: d.id, label: d.nom }))} />
            <Field label="Niveau" value={form.niveau} onChange={v => setForm(p => ({ ...p, niveau: v }))} options={NIVEAUX.map(n => ({ value: n, label: n }))} />
          </>}

          {tab === 'sections' && <>
            <Field label="Nom de la section" value={form.nom} onChange={v => setForm(p => ({ ...p, nom: v }))} required />
            <Field label="Filière" value={form.filiere_id} onChange={v => setForm(p => ({ ...p, filiere_id: v }))} options={filieres.map(f => ({ value: f.id, label: f.nom || f.label }))} required />
            <Field label="Niveau" value={form.niveau} onChange={v => setForm(p => ({ ...p, niveau: v }))} options={NIVEAUX.map(n => ({ value: n, label: n }))} />
            <Field label="Capacité" value={form.capacite} onChange={v => setForm(p => ({ ...p, capacite: parseInt(v) || 0 }))} type="number" />
          </>}

          {tab === 'groupes' && <>
            <Field label="Nom du groupe" value={form.nom} onChange={v => setForm(p => ({ ...p, nom: v }))} required />
            <Field label="Type" value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={TYPES_GROUPE.map(t => ({ value: t, label: t }))} required />
            <Field label="Section" value={form.section_id} onChange={v => setForm(p => ({ ...p, section_id: v }))} options={sections.map(s => ({ value: s.id, label: s.nom }))} required />
            <Field label="Salle" value={form.salle} onChange={v => setForm(p => ({ ...p, salle: v }))} />
            <Field label="Capacité" value={form.capacite} onChange={v => setForm(p => ({ ...p, capacite: parseInt(v) || 0 }))} type="number" />
          </>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
              {modal === 'add' ? '+ Créer' : '💾 Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </DashLayout>
  )
}
