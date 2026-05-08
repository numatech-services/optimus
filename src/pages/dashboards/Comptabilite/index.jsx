import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import useDebounce from '../../../hooks/useDebounce'

// --- Icônes ---
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconEdit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>

export default function ComptabiliteDirecte() {
  const { user } = useAuth()
  const tid = user?.tenant_id

  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [paiements, setPaiements] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({ totalEncaisse: 0, totalAttente: 0, nbEtudiants: 0, nbPaiements: 0 })

  // Filtres Tableau Principal
  const [filterStatut, setFilterStatut] = useState('ALL')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // Filtres Modal Recherche Étudiants (Segmentation)
  const [modalStudentYear, setModalStudentYear] = useState('2025-2026')
  const [modalStudentFiliere, setModalStudentFiliere] = useState('ALL')
  const [studentSearchText, setStudentSearchText] = useState('')
  const debouncedStudentSearch = useDebounce(studentSearchText, 300)

  const [modal, setModal] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ student_id: '', description: 'Frais d\'inscription', montant: '', methode: 'ESPÈCES', statut: 'EN ATTENTE' })

  // --- RECHERCHE ÉTUDIANTS FILTRÉE (POUR LE MODAL) ---
  useEffect(() => {
    async function searchStudents() {
      if (!tid || modal !== 'add') return
      setLoadingStudents(true)
      try {
        let query = supabase
          .from('students')
          .select('id, nom, prenom, matricule, filiere, annee_inscription')
          .eq('tenant_id', tid)

        if (modalStudentYear !== 'ALL') query = query.eq('annee_inscription', modalStudentYear)
        if (modalStudentFiliere !== 'ALL') query = query.eq('filiere', modalStudentFiliere)
        
        if (debouncedStudentSearch) {
          query = query.or(`nom.ilike.%${debouncedStudentSearch}%,prenom.ilike.%${debouncedStudentSearch}%,matricule.ilike.%${debouncedStudentSearch}%`)
        }

        const { data } = await query.order('nom').limit(50)
        setStudents(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingStudents(false)
      }
    }
    searchStudents()
  }, [tid, modalStudentYear, modalStudentFiliere, debouncedStudentSearch, modal])

  // --- CHARGEMENT PAIEMENTS ---
  const loadPaiements = async () => {
    setLoading(true)
    try {
      let query = supabase.from('paiements').select('*').eq('tenant_id', tid)
      if (filterStatut !== 'ALL') query = query.eq('statut', filterStatut)
      if (debouncedSearch) {
        query = query.or(`student_name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`)
      }
      const { data } = await query.order('date', { ascending: false })
      setPaiements(data || [])
      
      const totalEncaisse = (data || []).filter(p => p.statut === 'PAYÉ').reduce((sum, p) => sum + (p.montant || 0), 0)
      const totalAttente = (data || []).filter(p => p.statut === 'EN ATTENTE').reduce((sum, p) => sum + (p.montant || 0), 0)
      setStats({
        totalEncaisse,
        totalAttente,
        nbEtudiants: new Set((data || []).map(p => p.student_id)).size,
        nbPaiements: data?.length || 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (tid) loadPaiements() }, [tid, filterStatut, debouncedSearch])

  // --- ACTIONS ---
  const handleUpdateStatut = async (id, newStatut) => {
    try {
      const { error } = await supabase
        .from('paiements')
        .update({ statut: newStatut })
        .eq('id', id)

      if (error) throw error
      loadPaiements()
    } catch (err) {
      alert("Erreur lors de la mise à jour : " + err.message)
    }
  }

  const handleSave = async () => {
    if (!form.student_id || !form.montant) return alert("Étudiant et Montant obligatoires")
    const student = students.find(s => s.id === form.student_id)
    
    const payload = {
      student_id: form.student_id,
      student_name: student ? `${student.prenom} ${student.nom}` : (form.student_name || ''),
      filiere: student?.filiere || (form.filiere || ''),
      description: form.description,
      montant: parseInt(form.montant),
      methode: form.methode,
      statut: form.statut,
      tenant_id: tid
    }

    const { error } = editingId 
      ? await supabase.from('paiements').update(payload).eq('id', editingId)
      : await supabase.from('paiements').insert([{ ...payload, date: new Date().toISOString().split('T')[0] }])

    if (error) alert(error.message)
    else {
      setModal(null)
      setEditingId(null)
      loadPaiements()
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Supprimer ce paiement ?')) {
      await supabase.from('paiements').delete().eq('id', id)
      loadPaiements()
    }
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Étudiant', 'Filière', 'Description', 'Montant', 'Méthode', 'Statut']
    const rows = paiements.map(p => [p.date, p.student_name, p.filiere, p.description, p.montant, p.methode, p.statut])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finance_${new Date().toLocaleDateString()}.csv`
    link.click()
  }

  return (
    <DashLayout title="Gestion Financière & Caisse">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2>Comptabilité Directe</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}><IconDownload /> Exporter</button>
          <button className="btn btn-primary" onClick={() => { 
            setEditingId(null)
            setForm({ student_id: '', description: 'Frais d\'inscription', montant: '', methode: 'ESPÈCES', statut: 'EN ATTENTE' })
            setModal('add') 
          }}><IconPlus /> Nouveau Paiement</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-stat green"><span>Encaissé</span><strong>{stats.totalEncaisse.toLocaleString()} F</strong></div>
        <div className="card-stat orange"><span>Attente</span><strong>{stats.totalAttente.toLocaleString()} F</strong></div>
        <div className="card-stat blue"><span>Étudiants</span><strong>{stats.nbEtudiants}</strong></div>
        <div className="card-stat purple"><span>Transactions</span><strong>{stats.nbPaiements}</strong></div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12 }}>
        <input className="form-input" placeholder="Rechercher un paiement..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="ALL">Tous les statuts</option>
          <option value="PAYÉ">Payé</option>
          <option value="EN ATTENTE">En attente</option>
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Étudiant</th><th>Filière</th><th>Montant</th><th>Statut</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6}><SkeletonLoader /></td></tr> : paiements.map(p => (
              <tr key={p.id}>
                <td><strong>{p.student_name}</strong></td>
                <td>{p.filiere}</td>
                <td>{p.montant?.toLocaleString()} F</td>
                <td><span className={`badge ${p.statut === 'PAYÉ' ? 'badge-green' : 'badge-orange'}`}>{p.statut}</span></td>
                <td>{p.date}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {p.statut === 'EN ATTENTE' && (
                      <button className="btn-icon success" title="Valider le paiement" onClick={() => handleUpdateStatut(p.id, 'PAYÉ')}><IconCheck /></button>
                    )}
                    <button className="btn-icon" onClick={() => { setEditingId(p.id); setForm(p); setModal('add'); }}><IconEdit /></button>
                    <button className="btn-icon danger" onClick={() => handleDelete(p.id)}><IconTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'add' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingId ? 'Modifier' : 'Nouveau Paiement'}</h3>
            
            <div className="segmentation-box">
              <label>1. Filtrer la liste des étudiants</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <select className="form-input" value={modalStudentYear} onChange={e => setModalStudentYear(e.target.value)}>
                  <option value="2025-2026">Année 2025-2026</option>
                  <option value="2024-2025">Année 2024-2025</option>
                  <option value="ALL">Toutes les années</option>
                </select>
                <select className="form-input" value={modalStudentFiliere} onChange={e => setModalStudentFiliere(e.target.value)}>
                  <option value="ALL">Toutes les filières</option>
                  <option value="Genie Logiciel">Génie Logiciel</option>
                  <option value="Réseau">Réseau & Télécom</option>
                  <option value="Gestion">Gestion</option>
                </select>
              </div>
              <input 
                className="form-input" 
                style={{ marginTop: 10 }}
                placeholder="Tapez le nom de l'étudiant..." 
                value={studentSearchText} 
                onChange={e => setStudentSearchText(e.target.value)}
              />
              
              <label style={{ marginTop: 15, display: 'block' }}>2. Sélectionner l'étudiant ciblé</label>
              <select 
                className="form-input select-highlight" 
                value={form.student_id} 
                onChange={e => setForm({...form, student_id: e.target.value})}
              >
                <option value="">{loadingStudents ? 'Chargement...' : `-- ${students.length} résultats trouvés --`}</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.nom} {s.prenom} ({s.matricule})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description & Montant</label>
              <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <input type="number" className="form-input" style={{ marginTop: 10 }} placeholder="Montant" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} />
              
              <label style={{ marginTop: 15, display: 'block' }}>Statut du paiement</label>
              <select className="form-input" value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}>
                <option value="EN ATTENTE">EN ATTENTE</option>
                <option value="PAYÉ">PAYÉ</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { background: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .segmentation-box { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
        .segmentation-box label { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }
        .select-highlight { border: 2px solid var(--primary, #3b82f6); background: #fff; }
        .card-stat { padding: 16px; border-radius: 10px; color: white; display: flex; flex-direction: column; }
        .card-stat span { font-size: 12px; opacity: 0.8; }
        .card-stat strong { font-size: 20px; }
        .green { background: #10b981; } .orange { background: #f59e0b; } .blue { background: #3b82f6; } .purple { background: #8b5cf6; }
        .form-group { margin-bottom: 15px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 5px; }
        .form-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; }
        .form-input:focus { border-color: #3b82f6; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-orange { background: #fef3c7; color: #92400e; }
        .btn-icon { background: none; border: none; cursor: pointer; color: #64748b; padding: 5px; transition: color 0.2s; }
        .btn-icon:hover { color: #3b82f6; }
        .btn-icon.success { color: #10b981; }
        .btn-icon.danger { color: #ef4444; }
        .btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; border: none; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #f1f5f9; color: #475569; }
      `}</style>
    </DashLayout>
  )
}