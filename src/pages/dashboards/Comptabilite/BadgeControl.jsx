import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

export default function BadgeControl() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  
  const [students, setStudents] = useState([])
  const [badges, setBadges] = useState([])
  const [echeances, setEcheances] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [raison, setRaison] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [rStu, rBdg, rEch, rLog] = await Promise.all([
        supabase.from('students').select('id, nom, prenom, matricule, filiere').eq('tenant_id', tid).order('nom'),
        supabase.from('badges').select('*').eq('tenant_id', tid),
        supabase.from('echeances').select('*').eq('tenant_id', tid).eq('statut', 'EN_RETARD'),
        supabase.from('badge_actions_log').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(100),
      ])

      setStudents(rStu.data || [])
      setBadges(rBdg.data || [])
      setEcheances(rEch.data || [])
      setLogs(rLog.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (tid) load() }, [tid])

  // Logique de fusion des données
  const merged = students.map(s => {
    const badge = badges.find(b => b.student_id === s.id)
    const overdue = echeances.filter(e => e.student_id === s.id)
    const debt = overdue.reduce((sum, e) => sum + (e.montant || 0), 0)
    
    return {
      ...s,
      badge,
      debt,
      overdueCount: overdue.length,
      // Aligné sur les contraintes SQL: ACTIF, SUSPENDU, EXPIRÉ, PERDU
      isSuspended: badge?.status === 'SUSPENDU' || badge?.blocage_impayes === true
    }
  })

  const filtered = merged.filter(s => {
    const matchesSearch = `${s.nom} ${s.prenom} ${s.matricule}`.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    
    if (filter === 'blocked') return s.isSuspended
    if (filter === 'active') return s.badge && !s.isSuspended
    if (filter === 'debt') return s.debt > 0 && !s.isSuspended // À bloquer en priorité
    return true
  })

  const handleAction = async (type) => {
    if (!raison.trim()) return
    const isBlocking = type === 'BLOCK'

    try {
      // 1. Mise à jour du badge selon les contraintes de votre table SQL
      const { error: bErr } = await supabase.from('badges').update({
        status: isBlocking ? 'SUSPENDU' : 'ACTIF',
        blocage_impayes: isBlocking,
        dernier_controle: new Date().toISOString()
      }).eq('student_id', selected.id)

      if (bErr) throw bErr

      // 2. Journalisation
      await supabase.from('badge_actions_log').insert([{
        badge_id: selected.badge.id,
        student_id: selected.id,
        action: type,
        raison,
        effectue_par: user?.email,
        tenant_id: tid
      }])

      setModal(null)
      setRaison('')
      load()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  return (
    <DashLayout title="Accès & Badges">
      <div className="dash-header">
        <h1>Contrôle des Accès</h1>
        <p>Gérez les suspensions de badges pour raisons comptables</p>
      </div>

      {/* Statistiques rapides */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="label">Total Étudiants</span>
          <span className="value">{students.length}</span>
        </div>
        <div className="kpi-card danger">
          <span className="label">Accès Suspendus</span>
          <span className="value">{merged.filter(s => s.isSuspended).length}</span>
        </div>
        <div className="kpi-card warning">
          <span className="label">Impayés à traiter</span>
          <span className="value">{merged.filter(s => s.debt > 0 && !s.isSuspended).length}</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="filter-bar">
        <input 
          className="search-input"
          placeholder="Nom ou matricule..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        <div className="btn-group">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>Tous</button>
          <button onClick={() => setFilter('debt')} className={filter === 'debt' ? 'active' : ''}>Impayés Actifs</button>
          <button onClick={() => setFilter('blocked')} className={filter === 'blocked' ? 'active' : ''}>Suspendus</button>
        </div>
      </div>

      <div className="table-container card">
        <table>
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>Matricule</th>
              <th>Situation Financière</th>
              <th>Statut Accès</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>{s.prenom} {s.nom}</td>
                <td><code>{s.matricule}</code></td>
                <td>
                  {s.debt > 0 ? (
                    <span className="text-danger">
                      <strong>{s.debt.toLocaleString()} FCFA</strong> ({s.overdueCount} retards)
                    </span>
                  ) : <span className="text-success">À jour</span>}
                </td>
                <td>
                  <span className={`badge ${s.isSuspended ? 'bg-red' : 'bg-green'}`}>
                    {s.isSuspended ? 'SUSPENDU' : 'ACTIF'}
                  </span>
                </td>
                <td>
                  {s.badge ? (
                    <button 
                      className={`btn-action ${s.isSuspended ? 'btn-unblock' : 'btn-block'}`}
                      onClick={() => { setSelected(s); setModal(s.isSuspended ? 'unblock' : 'block') }}
                    >
                      {s.isSuspended ? 'Réactiver' : 'Suspendre'}
                    </button>
                  ) : <small>Aucun badge émis</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmation */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h3>{modal === 'block' ? 'Suspension d\'accès' : 'Réactivation d\'accès'}</h3>
            <p>Étudiant: <strong>{selected?.prenom} {selected?.nom}</strong></p>
            
            <div className="form-group">
              <label>Motif de la décision *</label>
              <textarea 
                value={raison} 
                onChange={e => setRaison(e.target.value)}
                placeholder="Précisez la raison (ex: Solde impayé semestre 1)"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button 
                className={modal === 'block' ? 'btn-danger' : 'btn-primary'}
                onClick={() => handleAction(modal === 'block' ? 'BLOCK' : 'UNBLOCK')}
                disabled={!raison.trim()}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .kpi-card { padding: 20px; border-radius: 12px; background: white; border: 1px solid #eee; display: flex; flex-direction: column; }
        .kpi-card.danger { border-left: 5px solid #ff4d4f; }
        .kpi-card.warning { border-left: 5px solid #faad14; }
        .label { font-size: 0.9rem; color: #666; }
        .value { font-size: 1.8rem; font-weight: bold; }
        
        .filter-bar { display: flex; gap: 15px; margin-bottom: 20px; }
        .search-input { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #ddd; }
        
        .badge { padding: 5px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; }
        .bg-red { background: #fff1f0; color: #cf1322; }
        .bg-green { background: #f6ffed; color: #389e0d; }
        
        .btn-action { padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; }
        .btn-block { background: #fff1f0; color: #cf1322; }
        .btn-unblock { background: #f6ffed; color: #389e0d; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal-content { width: 400px; padding: 25px; }
        .form-group textarea { width: 100%; margin-top: 10px; padding: 10px; border-radius: 6px; min-height: 80px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
        
        .text-danger { color: #cf1322; }
        .text-success { color: #389e0d; }
      `}</style>
    </DashLayout>
  )
}