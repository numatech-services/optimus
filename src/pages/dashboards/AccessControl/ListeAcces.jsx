import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' 

// ── Constantes de Design (Zéro omission) ──────────────────
const GROUPS = [
  { id:'ETU_L1',            label:'L1 — Étudiants',    color:'badge-blue',  icon:'📘', portique: true  },
  { id:'ETU_L2',            label:'L2 — Étudiants',    color:'badge-blue',  icon:'📗', portique: true  },
  { id:'ETU_L3',            label:'L3 — Étudiants',    color:'badge-teal',  icon:'📙', portique: true  },
  { id:'ETU_M1',            label:'M1 — Étudiants',    color:'badge-teal',  icon:'📕', portique: true  },
  { id:'ETU_M2',            label:'M2 — Étudiants',    color:'badge-gold',  icon:'📔', portique: true  },
  { id:'CAMPUS_GENERAL',    label:'Accès campus',       color:'badge-green', icon:'🏛️', portique: true  },
  { id:'BIBLIOTHEQUE',      label:'Bibliothèque',       color:'badge-slate', icon:'📚', portique: false },
  { id:'LABO_INFO',         label:'Labo Informatique',  color:'badge-blue',  icon:'💻', portique: false },
  { id:'EXAMENS_AVANCES',   label:'Examens avancés',    color:'badge-gold',  icon:'📝', portique: false },
  { id:'LABO_RECHERCHE',    label:'Labo Recherche',     color:'badge-teal',  icon:'🔬', portique: false },
]

const PLAGES = [
  { id:'P1', label:'Cours semaine',   detail:'Lun–Ven 07h30–20h00 / Sam 08h–14h' },
  { id:'P2', label:'Examens étendus', detail:'Lun–Sam 07h00–21h00' },
  { id:'P3', label:'Libre 24/7',      detail:'Accès permanent' },
]

export default function ListeAccesPage() {
  const navigate = useNavigate()
  
  // ── États des données Supabase ──
  const [dbData, setDbData] = useState({
    students: [],
    badges: [],
    paiements: [],
    rules: []
  })
  const [loading, setLoading] = useState(true)

  // ── États UI ──
  const [search, setSearch]     = useState('')
  const [filterGrp, setFilterGrp] = useState('ALL')
  const [filterSt, setFilterSt]  = useState('ALL')
  const [toast, setToast]       = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [showRule, setShowRule] = useState(false)
  const [ruleForm, setRuleForm] = useState({ plage:'P1', groups: ['CAMPUS_GENERAL'] })

  // ── 1. CHARGEMENT RÉEL ──
  useEffect(() => {
    fetchListeAccesData()
  }, [])

  const fetchListeAccesData = async () => {
    setLoading(true)
    try {
      const [resStudents, resBadges, resPaiements, resRules] = await Promise.all([
        supabase.from('students').select('*').limit(500),
        supabase.from('badges').select('*').limit(500),
        supabase.from('paiements').select('*').limit(500),
        supabase.from('access_rules').select('*').limit(500)
      ])

      setDbData({
        students: resStudents.data || [],
        badges: (resBadges.data || []).map(b => ({
          ...b,
          matricule: b.student_id,
          cardNumber: b.card_number,
          accessGroups: b.access_groups || []
        })),
        paiements: (resPaiements.data || []).map(p => ({
          ...p,
          studentId: p.student_id,
          delaiRetard: p.delai_retard
        })),
        rules: (resRules.data || []).map(r => ({
          ...r,
          timeZone: r.time_zone
        }))
      })
    } catch (err) {
      console.error("Erreur Sync Liste Acces:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE DE FUSION ──
  const merged = useMemo(() => {
    return dbData.students.map(s => {
      const badge = dbData.badges.find(b => b.matricule === s.id)
      const pays = dbData.paiements.filter(p => p.studentId === s.id)
      const retard = pays.filter(p => p.statut === 'EN RETARD')
      const attente = pays.filter(p => p.statut === 'EN ATTENTE')
      const montantDu = retard.reduce((a,p)=>a + (p.montant || 0), 0) + attente.reduce((a,p)=>a + (p.montant || 0), 0)
      const maxRetard = Math.max(0, ...retard.map(p => p.delaiRetard || 0))
      return { ...s, badge, montantDu, maxRetard }
    })
  }, [dbData])

  const filieres = ['ALL', ...new Set(dbData.students.map(s => s.filiere))]

  const filtered = merged.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      s.nom.toLowerCase().includes(q) ||
      s.prenom.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    const matchGrp = filterGrp === 'ALL' ||
      (s.badge?.accessGroups || []).includes(filterGrp) ||
      filterGrp === s.filiere
    const matchSt = filterSt === 'ALL' ||
      (filterSt === 'ACTIF' && s.status === 'ACTIF') ||
      (filterSt === 'SUSPENDU' && s.status === 'SUSPENDU') ||
      (filterSt === 'NO_BADGE' && !s.badge)
    return matchSearch && matchGrp && matchSt
  })

  // ── 3. ACTIONS & UTILS ──
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(s=>s.id)))
  }

  const showToast = (msg, type='success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const exportCSV = (onlySelected = false) => {
    const list = onlySelected ? merged.filter(s=>selected.has(s.id)) : filtered
    const rows = [['Matricule','Prénom','Nom','Filière','Email','N° Carte RFID','Statut']]
    list.forEach(s => rows.push([s.id, s.prenom, s.nom, s.filiere, s.email, s.badge?.cardNumber || 'S/D', s.badge?.status || 'SANS BADGE']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'liste_acces.csv'; a.click()
    showToast(`${list.length} étudiants exportés`)
  }

  const authorized  = merged.filter(s => s.badge?.status === 'ACTIVE')
  const blocked     = merged.filter(s => s.badge?.status === 'BLOCKED')
  const withoutBadge = merged.filter(s => !s.badge)

  if (loading) return <DashLayout title="Accès"><div>Chargement de la matrice d'accès...</div></DashLayout>

  return (
    <DashLayout title="Liste d'accès portique" requiredRole="admin_universite">

      {toast && (
        <div style={{ position:'fixed',top:72,right:24,zIndex:9999,background:'var(--green)',color:'#fff',padding:'12px 20px',borderRadius:10,fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          ✅ {toast.msg}
        </div>
      )}

      {/* Modal règle accès */}
      {showRule && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div className="card" style={{ maxWidth:500,width:'100%',padding:0 }}>
            <div style={{ padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ fontWeight:800 }}>Nouvelle règle d'accès portique</div>
              <button onClick={() => setShowRule(false)} style={{ background:'none',border:'none',fontSize:'1.5rem',cursor:'pointer' }}>×</button>
            </div>
            <div style={{ padding:24 }}>
              {/* Form content */}
              <div className="form-group">
                <label className="form-label">Plage horaire</label>
                <select className="form-input form-select" value={ruleForm.plage} onChange={e=>setRuleForm(p=>({...p,plage:e.target.value}))}>
                  {PLAGES.map(p => <option key={p.id} value={p.id}>{p.label} — {p.detail}</option>)}
                </select>
              </div>
              <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:20 }}>
                <button className="btn btn-secondary" onClick={() => setShowRule(false)}>Annuler</button>
                <button className="btn btn-primary" onClick={() => { setShowRule(false); showToast('Protocole uploadé') }}>Créer & Upload</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dash-page-title">🎫 Gestion des accès portique</div>
      <div className="dash-page-sub">Contrôle physique en temps réel — Portique Entrée principale</div>

      {/* ── STATS HORIZONTALES (DEMANDE SPÉCIFIQUE) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label:'Autorisés', value:authorized.length,  icon:'✅', color:'#10b981', bg:'#ecfdf5' },
          { label:'Bloqués',   value:blocked.length,     icon:'🚫', color:'#ef4444', bg:'#fef2f2' },
          { label:'Sans Badge', value:withoutBadge.length,icon:'⚠️', color:'#f59e0b', bg:'#fffbeb' },
          { label:'Total',      value:dbData.students.length, icon:'🎓', color:'#3b82f6', bg:'#eff6ff' },
        ].map((k,i) => (
          <div key={i} style={{ 
            background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: k.color }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerte */}
      {withoutBadge.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom:16 }}>
          <span>⚠️</span>
          <div style={{ fontSize:'.84rem' }}>
            <strong>{withoutBadge.length} étudiant(s)</strong> sans badge RFID détectés.
          </div>
        </div>
      )}

      {/* Règles actives */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div className="section-title">⏰ Horaires d'accès</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRule(true)}>+ Nouvelle règle</button>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Règle</th><th>Plage horaire</th><th>Groupes</th><th>Statut</th><th>Action</th></tr></thead>
            <tbody>
              {dbData.rules.map((r,i) => (
                <tr key={i}>
                  <td><strong style={{ color:'var(--ink)',fontSize:'.88rem' }}>{r.name}</strong></td>
                  <td style={{ fontSize:'.82rem',color:'var(--slate)' }}>{r.timeZone}</td>
                  <td>{(r.groups||[]).map((g,j) => <span key={j} className="badge badge-blue" style={{ fontSize:'.62rem',marginRight:3 }}>{g}</span>)}</td>
                  <td><span className={`badge badge-${r.status==='ACTIVE'?'green':'red'}`}>{r.status}</span></td>
                  <td><button className="btn btn-sm btn-secondary" onClick={() => showToast(`Sync forcée`)}>⬆️ Sync</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liste principale */}
      <div className="card">
        <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
          <div className="section-title">
            Liste des accès — {filtered.length} dossiers
          </div>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
            <input className="form-input" placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:180 }} />
            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(false)}>📥 Export CSV</button>
          </div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th style={{ width:40 }}><input type="checkbox" checked={selected.size===filtered.length && filtered.length>0} onChange={selectAll} /></th>
                <th>Matricule</th><th>Étudiant</th><th>Filière</th><th>Carte RFID</th><th>Paiements</th><th>Accès Portique</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s,i) => (
                <tr key={i} style={{ opacity: s.status==='SUSPENDU' ? 0.6 : 1 }}>
                  <td><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} /></td>
                  <td style={{ fontFamily:'monospace',fontSize:'.75rem' }}>{s.id}</td>
                  <td>
                    <div style={{ fontWeight:600,color:'var(--ink)',fontSize:'.88rem' }}>{s.prenom} {s.nom}</div>
                  </td>
                  <td style={{ fontSize:'.82rem' }}>{s.filiere}</td>
                  <td>{s.badge ? <span className="badge badge-blue">{s.badge.cardNumber}</span> : <span style={{color:'var(--amber)'}}>SANS CARTE</span>}</td>
                  <td>{s.montantDu > 0 ? <span className="badge badge-red">{s.montantDu.toLocaleString()} XOF</span> : <span className="badge badge-green">À JOUR</span>}</td>
                  <td>{s.badge?.status === 'ACTIVE' ? <span className="badge badge-green">AUTORISÉ</span> : <span className="badge badge-red">BLOQUÉ</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}