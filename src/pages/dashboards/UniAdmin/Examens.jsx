import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── 1. COMPOSANT DE CHAMP (EXTÉRIEUR POUR ÉVITER LA PERTE DE FOCUS) ──
const F = ({ label, name, form, setForm, type = 'text', options }) => {
  const val = form[name] || ''; // Garantit que l'input n'est jamais "uncontrolled"

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {options ? (
        <select 
          className="form-input form-select" 
          value={val} 
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        >
          {options.map(o => <option key={o} value={o}>{o || '— Aucune —'}</option>)}
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

// ── CONSTANTES DE DESIGN NIGER ──
const SALLES = ['Amphi A (300p)','Amphi B (200p)','Salle B12 (40p)','Salle C4 (60p)','Labo Info (30p)','Salle C3 (50p)']
const FILIERES = ['L1 Informatique','L2 Informatique','L3 Informatique','M1 Gestion','M2 Finance','L2 Droit','L3 Droit']
const EMPTY = { 
  date: '', 
  heure: '08h00', 
  matiere: '', 
  filiere: FILIERES[0], 
  salle: '', 
  surveillant: '', 
  etudiants: 0, 
  statut: 'NON PLANIFIÉ' 
}

// ── COMPOSANT PRINCIPAL ──
export default function UniAdminExamens() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.tenant

  // États des données
  const [examens, setExamens] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000)
  }

  // ── 2. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchExamens()
  }, [tenantId])

  const fetchExamens = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('examens')
        .select('*').limit(500)
        .eq('tenant_id', tenantId)
        .order('date_examen', { ascending: true })

      if (data) {
        // Mappage -> JS (Zéro changement de logique UI)
        const mappedData = data.map(e => ({
          id: e.id,
          date: e.date_examen || '',
          heure: e.heure || '08h00',
          matiere: e.matiere || '',
          filiere: e.filiere || '',
          salle: e.salle || '',
          surveillant: e.surveillant || '',
          etudiants: e.etudiants_count || 0,
          statut: e.statut || 'NON PLANIFIÉ'
        }))
        setExamens(mappedData)
      }
    } catch (err) {
      console.error("Erreur de chargement:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 3. ACTIONS CRUD RÉELLES ──
  const handleSave = async () => {
    if (!form.matiere || !form.date) return

    const newStatut = form.salle && form.surveillant ? 'PLANIFIÉ' : 'NON PLANIFIÉ'
    
    // Mapping JS ->
    const sqlData = {
      tenant_id: tenantId,
      filiere: form.filiere,
      matiere: form.matiere,
      date_examen: form.date,
      heure: form.heure,
      salle: form.salle,
      surveillant: form.surveillant,
      etudiants_count: Number(form.etudiants),
      statut: newStatut
    }

    try {
      if (modal === 'add') {
        const newId = 'EXM-' + Math.floor(Math.random() * 9000 + 1000)
        const { error } = await supabase.from('examens').insert([{ id: newId, ...sqlData }])
        if (error) throw error
        showToast('Session ajoutée dans la base')
      } else {
        const { error } = await supabase.from('examens').update(sqlData).eq('id', selected.id)
        if (error) throw error
        showToast('Session mise à jour')
      }
      setModal(null)
      fetchExamens()
    } catch (err) {
      showToast('Erreur lors de l\'enregistrement', 'error')
    }
  }

  const nonPlanifies = useMemo(() => examens.filter(e => e.statut === 'NON PLANIFIÉ').length, [examens])

  if (loading) return <DashLayout title="Examens"><div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700}}>Mise à jour du calendrier des épreuves...</div></DashLayout>

  return (
    <DashLayout title="Examens" requiredRole="admin_universite">
      
      {/* Toast Design Niger */}
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* MODAL AJOUT / MODIF (Restauré à l'identique) */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 14, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', borderRadius: '14px 14px 0 0' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{modal === 'add' ? '➕ Nouvelle session' : '✏️ Modifier la session'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#fff' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <F label="Matière / Épreuve *" name="matiere" form={form} setForm={setForm} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Filière" name="filiere" options={FILIERES} form={form} setForm={setForm} />
                <F label="Nbre d'étudiants" name="etudiants" type="number" form={form} setForm={setForm} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Date *" name="date" type="date" form={form} setForm={setForm} />
                <F label="Heure" name="heure" options={['07h00', '08h00', '09h00', '10h00', '11h00', '14h00', '15h00', '16h00']} form={form} setForm={setForm} />
              </div>
              <F label="Salle" name="salle" options={['', '...'].concat(SALLES)} form={form} setForm={setForm} />
              <F label="Surveillant principal" name="surveillant" form={form} setForm={setForm} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Créer' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dash-page-title">Planning des examens</div>
      <div className="dash-page-sub">{examens.length} sessions programmées · {nonPlanifies} à finaliser</div>

      {/* Alerte - Design d'origine */}
      {nonPlanifies > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ {nonPlanifies} session{nonPlanifies > 1 ? 's' : ''} sans salle ou surveillant assigné
        </div>
      )}

      {/* TABLEAU DES EXAMENS */}
      <div className="card">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Sessions d'examens </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setModal('add') }}>+ Ajouter une session</button>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>Matière</th>
                <th>Filière</th>
                <th>Salle</th>
                <th>Surveillant</th>
                <th>Étudiants</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {examens.map((e, i) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, color: 'var(--gold)', fontSize: '.85rem' }}>{e.date}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--slate)' }}>{e.heure}</div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.9rem' }}>{e.matiere}</td>
                  <td><span className="badge badge-blue" style={{ fontSize: '.72rem' }}>{e.filiere}</span></td>
                  <td style={{ fontSize: '.82rem', color: e.salle ? 'var(--ink)' : 'var(--red)' }}>{e.salle || '⚠️ Non assignée'}</td>
                  <td style={{ fontSize: '.82rem', color: e.surveillant ? 'var(--ink)' : 'var(--red)' }}>{e.surveillant || '⚠️ Non assigné'}</td>
                  <td style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700 }}>{e.etudiants}</td>
                  <td><span className={`badge ${e.statut === 'PLANIFIÉ' ? 'badge-green' : 'badge-red'}`}>{e.statut}</span></td>
                  <td>
                    <button className="btn btn-sm" style={{ background: 'var(--blue-light)', color: 'var(--blue)', border: 'none', borderRadius: 6, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', fontSize: '.75rem' }} 
                      onClick={() => { setSelected(e); setForm({ ...e }); setModal('edit') }}>✏️ Modifier</button>
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