import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import useDebounce from '../../../hooks/useDebounce'

// ── Constantes de Design ──────────
const STATUT_BADGE = { ACTIVE: 'badge-green', BLOCKED: 'badge-red' }
const STATUT_PAY = { 'À JOUR': 'badge-green', 'EN RETARD': 'badge-red', 'EN ATTENTE': 'badge-gold' }
const STATUT_PAY_LABEL = { 'À JOUR': 'À jour ✓', 'EN RETARD': 'Retard ⚠️', 'EN ATTENTE': 'En attente' }

export default function ImpayesAccesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── États des données ──
  const [dbData, setDbData] = useState({ students: [], badges: [], paiements: [] })
  const [loading, setLoading] = useState(true)

  // ── États UI ──
  const [search, setSearch] = useState('')
  const [filterPay, setFilterPay] = useState('ALL')
  const [filterAcces, setFilterAcces] = useState('ALL')
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [tab, setTab] = useState('impayés')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resStudents, resBadges, resPaiements] = await Promise.all([
        supabase.from('students').select('*').limit(500),
        supabase.from('badges').select('*').limit(500),
        supabase.from('paiements').select('*').limit(500)
      ])
      setDbData({
        students: resStudents.data || [],
        badges: resBadges.data || [],
        paiements: resPaiements.data || []
      })
    } catch (err) {
      console.error("Erreur Supabase:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── LOGIQUE DE FUSION ──
  const merged = useMemo(() => {
    return dbData.students.map(s => {
      const badge = dbData.badges.find(b => b.student_id === s.id)
      const pays = dbData.paiements.filter(p => p.student_id === s.id)
      const impayes = pays.filter(p => p.statut === 'EN RETARD')
      const montantDu = pays.filter(p => p.statut !== 'PAYÉ').reduce((acc, p) => acc + (p.montant || 0), 0)
      const maxRetard = Math.max(0, ...impayes.map(p => p.delai_retard || 0))
      
      return {
        ...s,
        badge,
        pays,
        impayes,
        montantDu,
        maxRetard,
        payStatut: badge?.paiement_statut || 'À JOUR',
        bloqué: badge?.status === 'BLOCKED'
      }
    })
  }, [dbData])

  const filtered = merged.filter(s => {
    const q = search.toLowerCase()
    const matchQ = !q || `${s.nom} ${s.prenom} ${s.id}`.toLowerCase().includes(q)
    const matchP = filterPay === 'ALL' || s.payStatut === filterPay
    const matchA = filterAcces === 'ALL' || (filterAcces === 'AUTORISÉ' && !s.bloqué) || (filterAcces === 'BLOQUÉ' && s.bloqué)
    return matchQ && matchP && matchA
  })

  // Statistiques
  const nbImpayés = merged.filter(s => s.payStatut === 'EN RETARD').length
  const nbAttente = merged.filter(s => s.payStatut === 'EN ATTENTE').length
  const nbBloqués = merged.filter(s => s.bloqué).length
  const totalDu = merged.reduce((a, s) => a + s.montantDu, 0)
  const nbAutoBloqués = merged.filter(s => s.bloqué && s.maxRetard > 60).length

  // ── ACTIONS ──
  const bloquerBadge = async (matricule, raison) => {
    try {
      const { error } = await supabase
        .from('badges')
        .update({ status: 'BLOCKED', blocked_reason: raison, blocage_impayes: true })
        .eq('student_id', matricule)
      if (!error) { showToast(`Accès bloqué`); fetchData(); setModal(null); }
    } catch (err) { console.error(err) }
  }

  const débloquerBadge = async (matricule) => {
    try {
      const { error } = await supabase
        .from('badges')
        .update({ status: 'ACTIVE', blocked_reason: null, blocage_impayes: false })
        .eq('student_id', matricule)
      if (!error) { showToast(`Accès rétabli ✓`); fetchData(); setModal(null); }
    } catch (err) { console.error(err) }
  }

  const exportCSV = () => {
    const rows = [['Matricule','Nom','Filière','Statut','Montant dû']]
    filtered.forEach(s => rows.push([s.id, `${s.prenom} ${s.nom}`, s.filiere, s.payStatut, s.montantDu]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'impayes.csv'; a.click()
  }

  if (loading) return <DashLayout title="Impayés"><div>Chargement...</div></DashLayout>

  return (
    <DashLayout title="Impayés & Accès portique" requiredRole="admin_universite">
      
      {toast && (
        <div className="fade-in" style={{ position:'fixed',top:72,right:24,zIndex:9999, background: toast.type==='error'?'var(--red)':'var(--green)', color:'#fff',padding:'12px 20px',borderRadius:10,fontWeight:700,boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          {toast.type==='error'?'❌':'✅'} {toast.msg}
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24, gap:16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>💳 Impayés & Contrôle d'accès</h1>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem', marginTop: 4 }}>Gestion des suspensions d'accès pour défaut de paiement</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 Export CSV</button>
          <button className="btn btn-danger btn-sm" disabled={selected.size === 0}>🚫 Bloquer la sélection ({selected.size})</button>
        </div>
      </div>

      {/* STATS HORIZONTALES AVEC ICÔNES */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {[
          { label:'Retards actifs', value: nbImpayés, icon: '⚠️', color: '#e74c3c', bg: '#fdf2f2' },
          { label:'En attente', value: nbAttente, icon: '⏳', color: '#f1c40f', bg: '#fef9e7' },
          { label:'Portique Bloqué', value: nbBloqués, icon: '🚫', color: '#c0392b', bg: '#f9ebeb' },
          { label:'Total dû', value: `${totalDu.toLocaleString()} XOF`, icon: '💰', color: '#2c3e50', bg: '#f4f6f7' },
        ].map((stat, i) => (
          <div key={i} style={{ 
            background: '#fff', 
            padding: '16px', 
            borderRadius: '12px', 
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '10px', 
              background: stat.bg, color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--ink)' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTRES & TABLEAU */}
      <div className="card">
        <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'center', background: 'var(--mist)' }}>
          <input className="form-input" placeholder="Rechercher un étudiant..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex: 1, maxWidth: 300 }} />
          <select className="form-input" value={filterPay} onChange={e=>setFilterPay(e.target.value)} style={{ width: 180 }}>
            <option value="ALL">Tous les paiements</option>
            <option value="EN RETARD">En retard</option>
            <option value="EN ATTENTE">En attente</option>
          </select>
          <select className="form-input" value={filterAcces} onChange={e=>setFilterAcces(e.target.value)} style={{ width: 180 }}>
            <option value="ALL">Tous les accès</option>
            <option value="BLOQUÉ">Bloqués uniquement</option>
          </select>
        </div>

        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th style={{ width:40 }}><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map(s=>s.id)) : new Set())} /></th>
                <th>Étudiant</th>
                <th>Situation</th>
                <th>Retard</th>
                <th>Montant Dû</th>
                <th>Accès Portique</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td><input type="checkbox" checked={selected.has(s.id)} onChange={() => {
                    const next = new Set(selected);
                    next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                    setSelected(next);
                  }} /></td>
                  <td>
                    <div style={{ fontWeight:700 }}>{s.prenom} {s.nom}</div>
                    <div style={{ fontSize:'.7rem', color:'var(--slate)' }}>{s.id} • {s.filiere}</div>
                  </td>
                  <td><span className={`badge ${STATUT_PAY[s.payStatut]}`}>{STATUT_PAY_LABEL[s.payStatut]}</span></td>
                  <td style={{ fontWeight: 700, color: s.maxRetard > 45 ? 'var(--red)' : 'inherit' }}>
                    {s.maxRetard > 0 ? `+${s.maxRetard}j` : '—'}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--red)' }}>{s.montantDu.toLocaleString()} XOF</td>
                  <td>
                    <span className={`badge badge-${s.bloqué ? 'red' : 'green'}`}>
                      {s.bloqué ? '🚫 Bloqué' : '✅ Autorisé'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setModal(s)}>Détails</button>
                      {s.bloqué ? 
                        <button className="btn btn-sm" style={{background:'#e8f5e9', color:'#2e7d32'}} onClick={() => débloquerBadge(s.id)}>Débloquer</button> :
                        <button className="btn btn-sm" style={{background:'#ffebee', color:'#c62828'}} onClick={() => bloquerBadge(s.id, 'Impayé')}>Suspendre</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Stat rapide */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', fontSize: '0.85rem', color: 'var(--slate)' }}>
        Affichage de {filtered.length} étudiants sur {merged.length} au total
      </div>
    </DashLayout>
  )
}