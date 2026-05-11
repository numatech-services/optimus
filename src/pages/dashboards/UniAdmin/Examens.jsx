import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── 1. COMPOSANT DE CHAMP MIS À JOUR ──
const F = ({ label, name, form, setForm, type = 'text', options, disabled }) => {
  const val = form[name] || '';
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {options ? (
        <select 
          className="form-input form-select" 
          value={val} 
          disabled={disabled}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        >
          {options.map((o, index) => {
  // On sécurise les valeurs pour éviter le crash
  const val = o?.value !== undefined ? o.value : o;
  const label = o?.label || o || '— Sélectionner —';

  return (
    <option key={index} value={val}>
      {label}
    </option>
  );
})}
        </select>
      ) : (
        <input 
          className="form-input" 
          type={type} 
          value={val} 
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} 
          placeholder={label} 
        />
      )}
    </div>
  );
};

const SALLES = ['Amphi A (300p)','Amphi B (200p)','Salle B12 (40p)','Salle C4 (60p)','Labo Info (30p)','Salle C3 (50p)']

const EMPTY = { 
  date: '', 
  heure: '08h00', 
  matiere_id: '', // On stocke l'ID
  matiere: '',    // On stocke le nom pour l'affichage rapide
  filiere: '', 
  salle: '', 
  surveillant: '', 
  etudiants: 0, 
  statut: 'NON PLANIFIÉ' 
}

export default function UniAdminExamens() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.id

  const [examens, setExamens] = useState([])
  const [allMatieres, setAllMatieres] = useState([]) // Toutes les matières du tenant
  const [filieres, setFilieres] = useState([])     // Liste des filières réelles
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000)
  }

  // ── 2. CHARGEMENT DES DONNÉES ──
  useEffect(() => {
    if (tenantId) loadInitialData()
  }, [tenantId])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [resEx, resMat, resFil] = await Promise.all([
        supabase.from('examens').select('*').eq('tenant_id', tenantId).order('date_examen'),
        supabase.from('matieres').select('id, nom, filiere, code, enseignant_nom').eq('tenant_id', tenantId),
        supabase.from('filieres').select('nom').eq('tenant_id', tenantId)
      ])

      setExamens(resEx.data || [])
      setAllMatieres(resMat.data || [])
      setFilieres(resFil.data || [])
    } catch (err) {
      console.error("Erreur:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 3. LOGIQUE DE FILTRAGE DES MATIÈRES ──
  // On ne montre que les matières de la filière sélectionnée dans le formulaire
  const matieresOptions = useMemo(() => {
    const filtered = allMatieres.filter(m => m.filiere === form.filiere)
    return [
      { value: '', label: '— Choisir une matière —' },
      ...filtered.map(m => ({ value: m.id, label: `${m.nom} (${m.code || 'S/C'})` }))
    ]
  }, [allMatieres, form.filiere])

  // Quand on change de matière dans le select, on met à jour le nom et le prof automatiquement
  useEffect(() => {
    if (form.matiere_id) {
      const matObj = allMatieres.find(m => m.id === form.matiere_id)
      if (matObj) {
        setForm(p => ({ 
          ...p, 
          matiere: matObj.nom, 
          surveillant: matObj.enseignant_nom || p.surveillant 
        }))
      }
    }
  }, [form.matiere_id, allMatieres])

  // ── 4. ACTIONS CRUD ──
  const handleSave = async () => {
    if (!form.matiere_id || !form.date || !form.filiere) {
      showToast('Veuillez remplir les champs obligatoires', 'error')
      return
    }

    const sqlData = {
      tenant_id: tenantId,
      filiere: form.filiere,
      matiere: form.matiere,
      matiere_id: form.matiere_id,
      date_examen: form.date,
      heure: form.heure,
      salle: form.salle,
      surveillant: form.surveillant,
      statut: form.salle && form.surveillant ? 'PLANIFIÉ' : 'NON PLANIFIÉ'
    }

    try {
      if (modal === 'add') {
        const { error } = await supabase.from('examens').insert([sqlData])
        if (error) throw error
        showToast('Examen créé')
      } else {
        const { error } = await supabase.from('examens').update(sqlData).eq('id', selected.id)
        if (error) throw error
        showToast('Examen mis à jour')
      }
      setModal(null)
      loadInitialData()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <DashLayout title="Examens" requiredRole="admin_universite">
      {toast && (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontWeight: 700, fontSize: '.88rem' }}>
          {toast.msg}
        </div>
      )}

      {/* MODAL */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 14, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', borderRadius: '14px 14px 0 0' }}>
              <div style={{ fontWeight: 800, color: '#fff' }}>{modal === 'add' ? '➕ Nouvelle session' : '✏️ Modifier'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#fff' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              
              {/* 1. Sélection de la Filière */}
              <F 
                label="Filière" 
                name="filiere" 
                options={[{value: '', label: '— Sélectionner filière —'}, ...filieres.map(f => f.nom)]} 
                form={form} 
                setForm={setForm} 
              />

              {/* 2. Sélection de la Matière (Filtrée par filière) */}
              <F 
                label="Matière / Épreuve *" 
                name="matiere_id" 
                options={matieresOptions} 
                form={form} 
                setForm={setForm} 
                disabled={!form.filiere} 
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Date *" name="date" type="date" form={form} setForm={setForm} />
                <F label="Heure" name="heure" options={['07h00', '08h00', '09h00', '10h00', '14h00', '15h00']} form={form} setForm={setForm} />
              </div>

              <F label="Salle" name="salle" options={['', ...SALLES]} form={form} setForm={setForm} />
              <F label="Surveillant (Enseignant)" name="surveillant" form={form} setForm={setForm} />

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reste du tableau (inchangé mais utilise les nouvelles données) */}
      <div className="dash-page-title">Planning des examens</div>
      <div className="card">
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between' }}>
          <div className="section-title">Sessions</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setModal('add') }}>+ Ajouter</button>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Matière</th>
                <th>Filière</th>
                <th>Salle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {examens.map(e => (
                <tr key={e.id}>
                  <td>{e.date_examen} à {e.heure}</td>
                  <td style={{fontWeight: 700}}>{e.matiere}</td>
                  <td>{e.filiere}</td>
                  <td>{e.salle || '—'}</td>
                  <td><span className={`badge ${e.statut === 'PLANIFIÉ' ? 'badge-green' : 'badge-red'}`}>{e.statut}</span></td>
                  <td>
                    <button className="btn btn-sm" onClick={() => { 
                      setSelected(e); 
                      setForm({ ...e, date: e.date_examen }); 
                      setModal('edit') 
                    }}>✏️</button>
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