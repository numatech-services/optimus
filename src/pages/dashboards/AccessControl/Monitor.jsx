import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── Constantes de Style (Design 100% Intact) ───────────────
const TYPE_STYLE = {
  GRANTED:  { bg:'var(--green-light)', color:'var(--green)', icon:'✅', label:'Autorisé'    },
  DENIED:   { bg:'var(--red-light)',   color:'var(--red)',   icon:'🚫', label:'Refusé'      },
  UNKNOWN:  { bg:'var(--amber-light)', color:'var(--amber)', icon:'❓', label:'Inconnu'     },
}
const DIR_LABEL = { ENTRY:'→ Entrée', EXIT:'← Sortie' }

// ── Fonction de simulation d'événements (Mappage) ──────
function generateLiveEvent(dbBadges) {
  if (!dbBadges || dbBadges.length === 0) return null

  const active = dbBadges.filter(b => b.status === 'ACTIVE')
  const blocked = dbBadges.filter(b => b.status === 'BLOCKED')
  const allAvailable = [...active, ...blocked]
  
  const roll = Math.random()
  let type = 'GRANTED'
  let badge = active[Math.floor(Math.random() * active.length)]
  
  if (roll > 0.80) { 
    type = 'DENIED'
    badge = allAvailable[Math.floor(Math.random() * allAvailable.length)] 
  }
  if (roll > 0.94) { 
    type = 'UNKNOWN'
    badge = { card_number: '??' + Math.floor(Math.random() * 9999) + '??', studentName: 'Inconnu', matricule: '—', filiere: '—' } 
  }

  const now = new Date()
  const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  return {
    id: `AEV-LIVE-${Date.now()}`,
    timestamp: now.toISOString(),
    time: timeString,
    type,
    cardNumber: badge?.card_number || '—',
    matricule: badge?.student_id || badge?.matricule || '—',
    studentName: badge?.studentName || 'Inconnu',
    filiere: badge?.filiere || '—',
    direction: Math.random() > 0.5 ? 'ENTRY' : 'EXIT',
    reader: Math.random() > 0.5 ? 'RDR-PORTIQUE-ENT' : 'RDR-PORTIQUE-SOR',
    reason: type === 'DENIED' ? 'Badge bloqué — impayé' : type === 'UNKNOWN' ? 'Badge non reconnu' : '',
    isLive: true,
  }
}

export default function AccessControlMonitor() {
  const { user } = useAuth()
  
  // États de données
  const [events, setEvents] = useState([])
  const [dbBadges, setDbBadges] = useState([])
  
  // États UI
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [tick, setTick] = useState(0)

  // ── 1. CHARGEMENT INITIAL DEPUIS ──
  const loadSupabaseData = async () => {
    setLoading(true)
    try {
      const [resEvents, resBadges, resStudents] = await Promise.all([
        supabase.from('access_events').select('*').order('timestamp', { ascending: false }).limit(50),
        supabase.from('badges').select('*').limit(500),
        supabase.from('students').select('id, nom, prenom, filiere')
      ])

      // Mapping des badges pour la simulation live
      const enriched = (resBadges.data || []).map(b => {
        const s = resStudents.data?.find(st => st.id === b.student_id)
        return { 
          ...b, 
          studentName: s ? `${s.prenom} ${s.nom}` : 'Inconnu',
          filiere: s?.filiere || '—'
        }
      })
      setDbBadges(enriched)

      // Mapping des événements historiques
      if (resEvents.data) {
        const mapped = resEvents.data.map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          time: new Date(e.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: e.type, // GRANTED, DENIED, UNKNOWN
          cardNumber: e.card_number || '—',
          matricule: e.matricule || '—',
          studentName: e.student_name || 'Inconnu',
          filiere: e.filiere || '—',
          direction: e.direction || 'ENTRY',
          reader: e.reader_id,
          reason: e.reason,
          isLive: false
        }))
        setEvents(mapped)
      }
    } catch (err) {
      console.error("Erreur Sync Monitor:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSupabaseData()
  }, [])

  // ── 2. LOGIQUE DE SIMULATION LIVE (Zéro Omission) ── supprimer une fois en production
  useEffect(() => {
    if (!running || loading || dbBadges.length === 0) return
    
    const intervalId = setInterval(() => {
      const newEv = generateLiveEvent(dbBadges)
      if (newEv) {
        setEvents(prev => [newEv, ...prev].slice(0, 100))
        setTick(t => t + 1)
      }
    }, 4000)
    
    return () => clearInterval(intervalId)
  }, [running, dbBadges, loading])

  // ── 3. FILTRAGE & KPIs ──
  const filtered = useMemo(() => events.filter(e => {
    const q = search.toLowerCase()
    const matchQ = !q || `${e.studentName} ${e.matricule} ${e.cardNumber}`.toLowerCase().includes(q)
    const matchF = filter === 'ALL' || e.type === filter
    return matchQ && matchF
  }), [events, filter, search])

  const nbGranted = events.filter(e => e.type === 'GRANTED').length
  const nbDenied  = events.filter(e => e.type === 'DENIED').length
  const nbUnknown = events.filter(e => e.type === 'UNKNOWN').length

  if (loading) return <DashLayout title="Monitoring">
    <div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)'}}>
      Connexion en cours...
    </div>
  </DashLayout>

  return (
    <DashLayout title="Monitoring portique" requiredRole="admin_universite">
      
      {/* Header - Design Intact */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:8 }}>
        <div>
          <div className="dash-page-title">📡 Monitoring temps réel</div>
          <div className="dash-page-sub">Portique DS-S-V1-2302 · {events.length} événements synchronisés</div>
        </div>
        <div style={{ display:'flex',gap:10,alignItems:'center' }}>
          <span style={{ display:'flex',alignItems:'center',gap:6,fontSize:'.82rem',color:running?'var(--green)':'var(--slate)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700 }}>
            <span style={{ width:8,height:8,borderRadius:'50%',background:running?'var(--green)':'var(--slate)',animation:running?'pulse 1.5s infinite':'' }}/>
            {running?'LIVE':'PAUSE'}
          </span>
          <button className="btn btn-sm" onClick={() => setRunning(r=>!r)}
            style={{ background:running?'var(--amber-light)':'var(--green-light)',color:running?'var(--amber)':'var(--green)',border:'none',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700 }}>
            {running?'⏸ Pause':'▶ Reprendre'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadSupabaseData}>
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* KPI Grid - Design Intact */}
      <div className="kpi-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Autorisés',  value:nbGranted, icon:'✅', color:'var(--green)' },
          { label:'Refusés',    value:nbDenied,  icon:'🚫', color:'var(--red)'   },
          { label:'Inconnus',   value:nbUnknown, icon:'❓', color:'var(--amber)' },
          { label:'Taux accès', value:`${events.length>0?Math.round(nbGranted/events.length*100):0}%`, icon:'📊', color:'var(--blue)' },
        ].map((k,i) => (
          <div className="kpi-card" key={i} style={{ borderLeft:`4px solid ${k.color}` }}>
            <div style={{ display:'flex',justifyContent:'space-between' }}>
              <div className="kpi-label">{k.label}</div>
              <span style={{ fontSize:'1.2rem' }}>{k.icon}</span>
            </div>
            <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Alertes d'origine */}
      {nbDenied > 0 && (
        <div style={{ background:'var(--red-light)',border:'1px solid rgba(192,57,43,.2)',borderLeft:'5px solid var(--red)',borderRadius:10,padding:'12px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:12 }}>
          <span style={{ fontSize:'1.5rem' }}>🚨</span>
          <div>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'var(--red)',fontSize:'.9rem' }}>
              {nbDenied} accès refusé{nbDenied>1?'s':''} détecté{nbDenied>1?'s':''}
            </div>
            <div style={{ fontSize:'.8rem',color:'var(--ink-60)',marginTop:2 }}>
              Vérifiez le statut des paiements
            </div>
          </div>
        </div>
      )}

      {/* Filtres & Table - Design Intact */}
      <div className="card">
        <div style={{ padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
          <input className="form-input" placeholder="🔍 Rechercher étudiant, matricule…"
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:220,padding:'7px 12px',fontSize:'.82rem' }}/>
          {['ALL','GRANTED','DENIED','UNKNOWN'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.75rem',
                background: filter===f ? 'var(--ink)' : 'var(--mist)',
                color: filter===f ? '#fff' : 'var(--slate)' }}>
              {f==='ALL'?'Tous':f==='GRANTED'?'✅ Autorisés':f==='DENIED'?'🚫 Refusés':'❓ Inconnus'}
            </button>
          ))}
          <span style={{ marginLeft:'auto',fontSize:'.8rem',color:'var(--slate)' }}>{filtered.length} événements affichés</span>
        </div>

        <div style={{ maxHeight:520,overflowY:'auto' }}>
          <table role="table" style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead style={{ position:'sticky',top:0,zIndex:2 }}>
              <tr style={{ background:'var(--ink)' }}>
                <th style={{ padding:'10px 16px',color:'rgba(255,255,255,.7)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.72rem',textAlign:'left' }}>Heure</th>
                <th style={{ padding:'10px 12px',color:'rgba(255,255,255,.7)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.72rem',textAlign:'left' }}>Statut</th>
                <th style={{ padding:'10px 12px',color:'rgba(255,255,255,.7)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.72rem',textAlign:'left' }}>Étudiant</th>
                <th style={{ padding:'10px 12px',color:'rgba(255,255,255,.7)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.72rem',textAlign:'left' }}>N° Badge</th>
                <th style={{ padding:'10px 12px',color:'rgba(255,255,255,.7)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.72rem',textAlign:'left' }}>Direction</th>
                <th style={{ padding:'10px 12px',color:'rgba(255,255,255,.7)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.72rem',textAlign:'left' }}>Lecteur</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e,i) => {
                const s = TYPE_STYLE[e.type] || TYPE_STYLE.UNKNOWN
                return (
                  <tr key={e.id} style={{
                    borderBottom:'1px solid var(--border-light)',
                    background: e.isLive ? `${s.bg}` : (i%2===0?'#fff':'#fafbfc'),
                    animation: e.isLive ? 'fadeIn .4s ease' : '',
                  }}>
                    <td style={{ padding:'8px 16px',fontFamily:'monospace',fontSize:'.8rem',fontWeight:700,color:'var(--slate)' }}>
                      {e.time}
                      {e.isLive && <span style={{ marginLeft:6,fontSize:'.6rem',background:'var(--green)',color:'#fff',padding:'1px 4px',borderRadius:3,fontWeight:700 }}>LIVE</span>}
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <span style={{ display:'inline-flex',alignItems:'center',gap: 4,background:s.bg,color:s.color,padding: '4px 10px',borderRadius:20,fontSize:'.72rem',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800 }}>
                        {s.icon} {s.label}
                      </span>
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <div style={{ fontWeight:600,fontSize:'.85rem',color:'var(--ink)' }}>{e.studentName}</div>
                      <div style={{ fontFamily:'monospace',fontSize:'.68rem',color:'var(--slate)' }}>{e.matricule}</div>
                    </td>
                    <td style={{ padding:'8px 12px',fontFamily:'monospace',fontSize:'.8rem',color:'var(--slate)' }}>{e.cardNumber}</td>
                    <td style={{ padding:'8px 12px',fontSize:'.8rem',fontWeight:600,color:e.direction==='ENTRY'?'var(--green)':'var(--blue)' }}>
                      {DIR_LABEL[e.direction]||e.direction}
                    </td>
                    <td style={{ padding:'8px 12px',fontSize:'.75rem',color:'var(--slate)' }}>
                      {e.reader === 'RDR-PORTIQUE-ENT' ? '🚪 Entrée' : '🚪 Sortie'}
                      {e.reason && <div style={{ fontSize:'.65rem',color:'var(--red)',marginTop:2 }}>{e.reason}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}