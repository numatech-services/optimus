import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── 1. COMPOSANT DE CHAMP SÉCURISÉ ──
const F = ({ label, name, form, setForm, type = 'text', options, required = false, disabled = false }) => {
  const val = form[name] || ''
  return (
    <div className="form-group">
      <label className="form-label">{label} {required && '*'}</label>
      {options ? (
        <select 
          className="form-input form-select" 
          value={val} 
          disabled={disabled}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        >
          {options.map((o, index) => {
            const optionValue = o?.value !== undefined ? o.value : o;
            const optionLabel = o?.label || o || 'Selectionner';
            return <option key={index} value={optionValue}>{optionLabel}</option>;
          })}
        </select>
      ) : (
        <input 
          className="form-input" 
          type={type} 
          value={val} 
          disabled={disabled}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} 
          placeholder={label} 
          required={required}
        />
      )}
    </div>
  )
}

// ── CONSTANTES ──
const SALLES = ['Amphi A (300p)', 'Amphi B (200p)', 'Salle B12 (40p)', 'Salle C4 (60p)', 'Labo Info (30p)', 'Salle C3 (50p)']
const SEMESTRES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
const HEURES = ['07h00', '08h00', '09h00', '10h00', '11h00', '14h00', '15h00', '16h00']

const EMPTY = {
  matiere: '',
  matiere_id: '',
  filiere: '',
  semestre: SEMESTRES[0],
  code: '',
  prof: '',
  coef: 1,
  date_examen: '',
  heure: '08h00',
  salle: '',
  duree: '2h',
  annee: '',
  statut: 'NON PLANIFIE'
}

export default function ScolariteExamens() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.id

  const [examens, setExamens] = useState([])
  const [filieres, setFilieres] = useState([])
  const [allMatieres, setAllMatieres] = useState([])
  const [annees, setAnnees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { if (tenantId) fetchAll() }, [tenantId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [resEx, resFil, resAnn, resMat] = await Promise.all([
        supabase.from('examens').select('*').eq('tenant_id', tenantId).order('date_examen', { ascending: false }),
        supabase.from('filieres').select('id,nom').eq('tenant_id', tenantId).order('nom'),
        supabase.from('academic_years').select('id,label,is_current').eq('tenant_id', tenantId),
        supabase.from('matieres').select('id,nom,filiere,code,enseignant_nom').eq('tenant_id', tenantId)
      ])
      setExamens(resEx.data || [])
      setFilieres(resFil.data || [])
      setAnnees(resAnn.data || [])
      setAllMatieres(resMat.data || [])
      
      const current = (resAnn.data || []).find(a => a.is_current)
      setForm(f => ({ ...f, annee: current?.label || '' }))
    } catch (err) { showToast('Erreur de chargement', 'error') }
    finally { setLoading(false) }
  }

  const matieresOptions = useMemo(() => {
    if (!form.filiere) return [{ value: '', label: 'Choisissez une filiere' }]
    const filtered = allMatieres.filter(m => m.filiere === form.filiere)
    return [
      { value: '', label: 'Choisir la matiere' },
      ...filtered.map(m => ({ value: m.id, label: `${m.nom} (${m.code || 'S/C'})` }))
    ]
  }, [allMatieres, form.filiere])

  useEffect(() => {
    if (form.matiere_id) {
      const matObj = allMatieres.find(m => m.id === form.matiere_id)
      if (matObj) {
        setForm(p => ({ 
          ...p, 
          matiere: matObj.nom, 
          code: matObj.code || p.code,
          prof: matObj.enseignant_nom || p.prof 
        }))
      }
    }
  }, [form.matiere_id, allMatieres])

  const handleSave = async () => {
    if (!form.matiere_id || !form.date_examen) {
      showToast('Matiere et date obligatoires', 'error'); return
    }

    const sqlData = {
      tenant_id: tenantId,
      matiere: form.matiere,
      matiere_id: form.matiere_id,
      filiere: form.filiere,
      semestre: form.semestre,
      code: form.code,
      prof: form.prof,
      coef: Number(form.coef) || 1,
      date_examen: form.date_examen,
      heure: form.heure,
      salle: form.salle,
      duree: form.duree,
      annee: form.annee,
      statut: (form.salle && form.prof) ? 'PLANIFIE' : 'NON PLANIFIE'
    }

    try {
      if (modal === 'add') {
        await supabase.from('examens').insert([sqlData])
        showToast('Examen ajoute')
      } else {
        await supabase.from('examens').update(sqlData).eq('id', selected.id)
        showToast('Mise a jour effectuee')
      }
      setModal(null); setForm(EMPTY); fetchAll()
    } catch (err) { showToast('Erreur de sauvegarde', 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet examen ?')) return
    await supabase.from('examens').delete().eq('id', id)
    fetchAll()
  }

  if (loading) return <DashLayout title="Examens"><div style={{ padding: 60, textAlign: 'center' }}>Chargement...</div></DashLayout>

  return (
    <DashLayout title="Examens" requiredRole="scolarite">
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontWeight: 700 }}>{toast.msg}</div>}

      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 14, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'var(--ink)', color: '#fff', borderRadius: '14px 14px 0 0' }}>
              <strong>{modal === 'add' ? 'Programmer un examen' : 'Modifier l examen'}</strong>
              <button onClick={() => setModal(null)} style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}>X</button>
            </div>
            <div style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Filiere" name="filiere" options={[{ value: '', label: 'Selectionner' }, ...filieres.map(f => f.nom)]} form={form} setForm={setForm} required />
                <F label="Annee Academique" name="annee" options={annees.map(a => a.label)} form={form} setForm={setForm} />
              </div>

              <F label="Matiere" name="matiere_id" options={matieresOptions} form={form} setForm={setForm} disabled={!form.filiere} required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Semestre" name="semestre" options={SEMESTRES} form={form} setForm={setForm} />
                <F label="Surveillant / Prof" name="prof" form={form} setForm={setForm} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Date" name="date_examen" type="date" form={form} setForm={setForm} required />
                <F label="Heure" name="heure" options={HEURES} form={form} setForm={setForm} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Salle" name="salle" options={['', ...SALLES]} form={form} setForm={setForm} />
                <F label="Duree" name="duree" form={form} setForm={setForm} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 25 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dash-page-title">Service Scolarite - Examens</div>

      <div className="card">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Calendrier des epreuves</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setModal('add') }}>Ajouter</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date & Heure</th><th>Matiere / Filiere</th><th>Salle</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {examens.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.date_examen}</strong><br/><small>{e.heure}</small></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.matiere}</div>
                    <span className="badge badge-blue" style={{ fontSize: '10px' }}>{e.filiere}</span>
                  </td>
                  <td>{e.salle || 'A definir'}</td>
                  <td><span className={`badge ${e.statut === 'PLANIFIE' ? 'badge-green' : 'badge-red'}`}>{e.statut}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-sm" onClick={() => { setForm(e); setSelected(e); setModal('edit') }}>Modifier</button>
                      <button className="btn btn-sm" onClick={() => handleDelete(e.id)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}