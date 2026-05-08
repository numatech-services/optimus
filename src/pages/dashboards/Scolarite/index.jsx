import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { supabase } from '../../../lib/supabase'
// Optionnel : import { CheckCircle, XCircle, Clock, Calendar, GraduationCap, Search, Send } from 'lucide-react'

export default function ScolariteDash() {
  const [dossiers, setDossiers] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [salleEdit, setSalleEdit] = useState({})
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchScolariteData()
  }, [])

  const fetchScolariteData = async () => {
    setLoading(true)
    try {
      const [resStudents, resExamens] = await Promise.all([
        supabase.from('students').select('*').order('id', { ascending: false }),
        supabase.from('examens').select('*').order('date_examen', { ascending: true })
      ])

      if (resStudents.data) {
        const mappedDossiers = resStudents.data.map(s => ({
          id: s.id,
          nom: `${s.prenom || ''} ${s.nom || ''}`,
          filiere: s.filiere || 'Général',
          date: s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '--/--/--',
          status: s.status === 'ACTIF' ? 'VALIDATED' : (s.status === 'REFUSÉ' ? 'REJECTED' : 'PENDING'),
          docs: ['Bac', 'CNI', 'Photo']
        }))
        setDossiers(mappedDossiers)
      }

      if (resExamens.data) {
        const mappedExams = resExamens.data.map(e => ({
          id: e.id,
          date: e.date_examen ? e.date_examen.substring(8, 10) + '/' + e.date_examen.substring(5, 7) : '—',
          name: `${e.filiere} — ${e.matiere}`,
          salle: e.salle || '',
          ok: !!e.salle
        }))
        setExams(mappedExams)
      }
    } catch (err) {
      console.error("Erreur Scolarité:", err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // --- CRUD HANDLERS (Identiques à ta logique mais avec feedback amélioré) ---
  const handleValidate = async (id) => {
    const { error } = await supabase.from('students').update({ status: 'ACTIF' }).eq('id', id)
    if (!error) {
      setDossiers(prev => prev.map(d => d.id === id ? { ...d, status: 'VALIDATED' } : d))
      showToast('Dossier approuvé avec succès')
    }
  }

  const handleReject = async (id) => {
    const { error } = await supabase.from('students').update({ status: 'REFUSÉ' }).eq('id', id)
    if (!error) {
      setDossiers(prev => prev.map(d => d.id === id ? { ...d, status: 'REJECTED' } : d))
      showToast('Dossier refusé', 'error')
    }
  }

  const handleAssignSalle = async (id) => {
    const val = (salleEdit[id] || '').trim()
    if (!val) return
    const { error } = await supabase.from('examens').update({ salle: val, statut: 'PLANIFIÉ' }).eq('id', id)
    if (!error) {
      setExams(prev => prev.map(e => e.id === id ? { ...e, salle: val, ok: true } : e))
      showToast(`Salle ${val} assignée`)
    }
  }

  const filtered = dossiers.filter(d => !search || d.nom.toLowerCase().includes(search.toLowerCase()))
  const pending = dossiers.filter(d => d.status === 'PENDING')

  if (loading) return <DashLayout title="Chargement..."><SkeletonLoader type="dashboard" /></DashLayout>

  return (
    <DashLayout title="Espace Scolarité">
      {/* TOAST MODERNE */}
      {toast && (
        <div className={`toast-modern ${toast.type}`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <header className="dash-header">
        <div>
          <h1 className="dash-title">Gestion Académique</h1>
          <p className="dash-subtitle">Suivi en temps réel des inscriptions et examens</p>
        </div>
        <div className="header-actions">
           <button className="btn-refresh" onClick={fetchScolariteData}>↻ Actualiser</button>
        </div>
      </header>

      {/* STATS HORIZONTALES MODERNES */}
      <div className="stats-horizontal-container">
        {[
          { label: 'En attente', value: pending.length, icon: '⏳', color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Validés', value: dossiers.filter(d => d.status === 'VALIDATED').length, icon: '🛡️', color: '#10b981', bg: '#ecfdf5' },
          { label: 'Salles à fixer', value: exams.filter(e => !e.ok).length, icon: '📍', color: '#ef4444', bg: '#fef2f2' },
          { label: 'Examens total', value: exams.length, icon: '🎓', color: '#3b82f6', bg: '#eff6ff' },
        ].map((stat, i) => (
          <div className="stat-card-mini" key={i} style={{ '--accent': stat.color, '--bg-accent': stat.bg }}>
            <div className="stat-icon-wrapper">{stat.icon}</div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        {/* SECTION DOSSIERS */}
        <section className="glass-card table-section">
          <div className="card-header">
            <h3>Dossiers récents</h3>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Rechercher un étudiant..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="modern-table-container">
            <table>
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>Filière</th>
                  <th>Date</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className={d.status !== 'PENDING' ? 'row-muted' : ''}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar-mini">{d.nom.charAt(0)}</div>
                        <span>{d.nom}</span>
                      </div>
                    </td>
                    <td><span className="text-tag">{d.filiere}</span></td>
                    <td><span className="text-date">{d.date}</span></td>
                    <td>
                      <div className="docs-group">
                        {d.docs.map(doc => <span key={doc} className="doc-dot">{doc}</span>)}
                      </div>
                    </td>
                    <td>
                      {d.status === 'PENDING' ? (
                        <div className="action-buttons">
                          <button className="btn-icon check" onClick={() => handleValidate(d.id)}>✓</button>
                          <button className="btn-icon cancel" onClick={() => handleReject(d.id)}>✕</button>
                        </div>
                      ) : (
                        <span className={`status-pill ${d.status.toLowerCase()}`}>
                          {d.status === 'VALIDATED' ? 'Approuvé' : 'Refusé'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION EXAMENS - DESIGN COMPACT */}
        <aside className="glass-card schedule-section">
          <h3>Salles à assigner</h3>
          <div className="exam-list">
            {exams.filter(e => !e.ok).map(e => (
              <div className="exam-item-modern" key={e.id}>
                <div className="exam-date-badge">
                  <span>{e.date.split('/')[0]}</span>
                  <small>{e.date.split('/')[1]}</small>
                </div>
                <div className="exam-content">
                  <h4>{e.name}</h4>
                  <div className="exam-input-group">
                    <input 
                      placeholder="Salle ex: A102"
                      value={salleEdit[e.id] || ''}
                      onChange={ev => setSalleEdit(p => ({ ...p, [e.id]: ev.target.value }))}
                    />
                    <button onClick={() => handleAssignSalle(e.id)}>Fixer</button>
                  </div>
                </div>
              </div>
            ))}
            {exams.filter(e => !e.ok).length === 0 && (
              <div className="empty-state">Toutes les salles sont assignées ✨</div>
            )}
          </div>
        </aside>
      </div>

      <style jsx>{`
        /* CSS MODERNE */
        .stats-horizontal-container {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .stat-card-mini {
          flex: 1;
          min-width: 200px;
          background: white;
          padding: 1.25rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          border: 1px solid var(--border);
          transition: transform 0.2s;
        }

        .stat-card-mini:hover { transform: translateY(-3px); }

        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          background: var(--bg-accent);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .stat-info { display: flex; flex-direction: column; }
        .stat-value { font-size: 1.5rem; font-weight: 800; color: var(--ink); line-height: 1; }
        .stat-label { font-size: 0.85rem; color: var(--slate); margin-top: 4px; }

        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(230, 230, 230, 1);
          border-radius: 20px;
          padding: 1.5rem;
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        .modern-table-container table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        .modern-table-container th {
          padding: 1rem;
          text-align: left;
          color: var(--slate);
          font-weight: 600;
          font-size: 0.85rem;
        }

        .modern-table-container tr td {
          padding: 1rem;
          background: white;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
        }

        .modern-table-container tr td:first-child { border-left: 1px solid #f1f5f9; border-radius: 12px 0 0 12px; }
        .modern-table-container tr td:last-child { border-right: 1px solid #f1f5f9; border-radius: 0 12px 12px 0; }

        .status-pill {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-pill.validated { background: #dcfce7; color: #166534; }
        .status-pill.rejected { background: #fee2e2; color: #991b1b; }

        .exam-item-modern {
          display: flex;
          gap: 1rem;
          background: white;
          padding: 1rem;
          border-radius: 14px;
          margin-bottom: 1rem;
          border: 1px solid #f1f5f9;
        }

        .exam-date-badge {
          background: var(--ink);
          color: white;
          width: 45px;
          height: 45px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .exam-input-group {
          display: flex;
          gap: 5px;
          margin-top: 8px;
        }

        .exam-input-group input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.8rem;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          transition: 0.2s;
        }
        .btn-icon.check { background: #10b981; color: white; }
        .btn-icon.cancel { background: #ef4444; color: white; }

        .toast-modern {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          background: #1f2937;
          color: white;
          z-index: 1000;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </DashLayout>
  )
}