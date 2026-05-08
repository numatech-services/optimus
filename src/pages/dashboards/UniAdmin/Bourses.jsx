import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { exportCSV } from '../../../hooks/useExportData'

const STATUTS = ['SOUMIS', 'EN_COURS', 'ATTRIBUÉ', 'REFUSÉ', 'SUSPENDU']
const TYPES = ["Bourse d'État", "Bourse ANAB", "Bourse d'excellence", "Exonéré"]

export default function Bourses() {
  const { user } = useAuth()
  const tid = user?.tenant_id || user?.tenant
  const [dossiers, setDossiers] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  
  // Ajout de annee_academique_id pour respecter ton index unique SQL
  const [form, setForm] = useState({ 
    student_id: '', 
    type_bourse: 'Bourse ANAB', 
    reference_anab: '', 
    montant_mensuel: 0, 
    commentaire: '',
    annee_academique_id: '' 
  })
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    if (!tid) return
    setLoading(true)
    try {
      // Correction de la jointure : on utilise student_id(colonnes)
      const [rD, rS] = await Promise.all([
        supabase.from('dossiers_bourse')
          .select('*, students:student_id(nom, prenom, matricule, filiere, niveau)')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false }),
        supabase.from('students')
          .select('id, nom, prenom, matricule')
          .eq('tenant_id', tid)
          .limit(1000),
      ])
      
      if (rD.data) setDossiers(rD.data)
      if (rS.data) setStudents(rS.data)
    } catch (err) {
      console.error("Erreur chargement:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tid])

  const filtered = filter === 'all' ? dossiers : dossiers.filter(d => d.statut === filter)

  const handleCreate = async () => {
    if (!form.student_id || !form.annee_academique_id) {
      return showToast("L'étudiant et l'année académique sont obligatoires", "error")
    }

    try {
      const { data, error } = await supabase
        .from('dossiers_bourse')
        .insert([{ ...form, tenant_id: tid, statut: 'SOUMIS' }])
        .select('*, students:student_id(nom, prenom, matricule, filiere, niveau)')
        .single()

      if (error) {
        if (error.code === '23505') throw new Error("Cet étudiant a déjà un dossier pour cette année.")
        throw error
      }

      setDossiers([data, ...dossiers])
      showToast('Dossier créé avec succès')
      setModal(null)
      setForm({ student_id: '', type_bourse: 'Bourse ANAB', reference_anab: '', montant_mensuel: 0, commentaire: '', annee_academique_id: '' })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleUpdateStatus = async (id, newStatut) => {
    const updates = { statut: newStatut, traite_par: user?.user_metadata?.full_name || user?.email }
    if (newStatut === 'ATTRIBUÉ') updates.date_attribution = new Date().toISOString().split('T')[0]
    
    try {
      const { error } = await supabase.from('dossiers_bourse').update(updates).eq('id', id)
      if (error) throw error

      setDossiers(dossiers.map(d => d.id === id ? { ...d, ...updates } : d))
      showToast(`Dossier ${newStatut.toLowerCase()}`)
    } catch (err) {
      showToast("Erreur de mise à jour", "error")
    }
  }

  const stats = {
    total: dossiers.length,
    soumis: dossiers.filter(d => d.statut === 'SOUMIS').length,
    encours: dossiers.filter(d => d.statut === 'EN_COURS').length,
    attribues: dossiers.filter(d => d.statut === 'ATTRIBUÉ').length,
    refuses: dossiers.filter(d => d.statut === 'REFUSÉ').length,
  }

  if (loading) return <DashLayout title="Bourses"><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Dossiers de bourse">
      {toast && (
        <div className="fade-in" style={{ position:'fixed', top:24, right:24, zIndex:2000, padding:'12px 20px', borderRadius:10, background:toast.type === 'error' ? 'var(--red)' : 'var(--green)', color:'#fff', fontWeight:700, boxShadow:'0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      <div className="dash-page-title">🎓 Gestion des bourses</div>
      
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        {[
          { l: 'Total', v: stats.total },
          { l: 'Soumis', v: stats.soumis },
          { l: 'En cours', v: stats.encours },
          { l: 'Attribués', v: stats.attribues },
          { l: 'Refusés', v: stats.refuses },
        ].map((k, i) => <div key={i} className="kpi-card"><div className="kpi-label">{k.l}</div><div className="kpi-value">{k.v}</div></div>)}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', ...STATUTS].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}>
            {s === 'all' ? 'Tous' : s}
          </button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setModal('create')}>+ Nouveau dossier</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Matricule</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>Aucun dossier trouvé</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{d.students ? `${d.students.prenom} ${d.students.nom}` : 'Étudiant inconnu'}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--slate)' }}>Niveau: {d.students?.niveau}</div>
                  </td>
                  <td><code>{d.students?.matricule}</code></td>
                  <td>{d.type_bourse}</td>
                  <td>
                    <span className={`badge ${d.statut === 'ATTRIBUÉ' ? 'badge-green' : d.statut === 'REFUSÉ' ? 'badge-red' : 'badge-amber'}`}>
                      {d.statut}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {d.statut === 'SOUMIS' && <button className="btn btn-sm btn-secondary" onClick={() => handleUpdateStatus(d.id, 'EN_COURS')}>Étudier</button>}
                      {d.statut === 'EN_COURS' && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(d.id, 'ATTRIBUÉ')}>Valider</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleUpdateStatus(d.id, 'REFUSÉ')}>Refuser</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'create' && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24 }}>
            <h3 style={{ marginBottom: 20 }}>Nouveau Dossier</h3>
            
            <div className="form-group">
              <label className="form-label">Étudiant *</label>
              <select className="form-input" value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})}>
                <option value="">Sélectionner un étudiant...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.nom} {s.prenom} ({s.matricule})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Année Académique ID *</label>
              <input className="form-input" placeholder="Ex: 2023-2024" value={form.annee_academique_id} onChange={e => setForm({...form, annee_academique_id: e.target.value})} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Type de Bourse</label>
                <select className="form-input" value={form.type_bourse} onChange={e => setForm({...form, type_bourse: e.target.value})}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Montant Mensuel</label>
                <input className="form-input" type="number" value={form.montant_mensuel} onChange={e => setForm({...form, montant_mensuel: parseInt(e.target.value)})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary w-full" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn-primary w-full" onClick={handleCreate}>Créer le dossier</button>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}