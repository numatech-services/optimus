import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' 
import DashLayout from '../../../components/Layout/DashLayout'

export default function SurveillantMonitor() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // ── États des données Supabase ──
  const [loading, setLoading] = useState(true)
  const [devices, setDevices] = useState([])
  const [dbStudents, setDbStudents] = useState([])
  const [dbReaders, setDbReaders] = useState([])
  
  // ── États UI (Design 100% Intact) ──
  const [events, setEvents] = useState([])
  const [readerStats, setReaderStats] = useState({})
  const [live, setLive] = useState(true)
  const [filter, setFilter] = useState('ALL')
  
  const timerRef = useRef(null)
  const poolIdxRef = useRef(0)

  // ── 1. CHARGEMENT DES DONNÉES RÉELLES DEPUIS LA BD ──
  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [resDev, resEvents, resStudents, resBadges, resReaders] = await Promise.all([
        supabase.from('devices').select('*').limit(500),
        supabase.from('access_events').select('*').order('timestamp', { ascending: false }).limit(20),
        supabase.from('students').select('id, nom, prenom, filiere'),
        supabase.from('badges').select('student_id, status'),
        supabase.from('readers').select('*').limit(500)
      ])

      if (resDev.data) setDevices(resDev.data)
      if (resReaders.data) setDbReaders(resReaders.data)
      
      // Préparation du pool d'étudiants réels basés sur la BD
      if (resStudents.data && resBadges.data) {
        const pool = resStudents.data.map(s => {
          const b = resBadges.data.find(badge => badge.student_id === s.id)
          return {
            name: `${s.prenom} ${s.nom}`,
            mat: s.id,
            filiere: s.filiere,
            ok: b?.status === 'ACTIVE',
            reason: b?.status === 'BLOCKED' ? 'Badge suspendu' : (b ? '' : 'Sans badge')
          }
        })
        setDbStudents(pool)
      }

      // Initialisation des stats par lecteur dynamiquement
      if (resReaders.data) {
        const initialStats = {}
        resReaders.data.forEach(r => {
          initialStats[r.id] = { granted: 0, denied: 0 }
        })
        setReaderStats(initialStats)
      }

      // Mapping de l'historique vers le format JS de l'UI
      if (resEvents.data) {
        const mapped = resEvents.data.map(e => {
          const rInfo = resReaders.data?.find(rd => rd.id === e.reader_id)
          return {
            id: e.id,
            time: new Date(e.timestamp).toLocaleTimeString('fr-FR'),
            room: rInfo ? rInfo.room : 'Zone Inconnue',
            reader: e.reader_id,
            name: e.student_name,
            mat: e.matricule,
            method: 'RFID/QR',
            ok: e.type === 'GRANTED',
            reason: e.reason
          }
        })
        setEvents(mapped)
      }
    } catch (err) {
      console.error("Erreur Monitor Supabase:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // ── 2. LOGIQUE DE SIMULATION LIVE (Utilise les vrais lecteurs et étudiants de la BD) ──
  const generateEvent = () => {
    if (dbStudents.length === 0 || dbReaders.length === 0) return

    // On pioche un lecteur et un étudiant au hasard dans la BD
    const reader = dbReaders[Math.floor(Math.random() * dbReaders.length)]
    const student = dbStudents[Math.floor(Math.random() * dbStudents.length)]

    const now = new Date()
    const t = now.toLocaleTimeString('fr-FR')
    
    const ev = { 
      id: `EVT-LIVE-${Date.now()}`, 
      time: t, 
      room: reader.room, 
      reader: reader.id, 
      name: student.name, 
      mat: student.mat, 
      method: Math.random() > 0.5 ? 'QR' : 'RFID', 
      ok: student.ok, 
      reason: student.reason,
      isLive: true
    }

    setEvents(prev => [ev, ...prev.slice(0, 49)])
    
    // Mise à jour des stats du lecteur en question
    setReaderStats(prev => ({
      ...prev,
      [reader.id]: { 
        granted: (prev[reader.id]?.granted || 0) + (student.ok ? 1 : 0), 
        denied: (prev[reader.id]?.denied || 0) + (student.ok ? 0 : 1) 
      }
    }))
  }

  useEffect(() => {
    if (live && !loading) { 
      timerRef.current = setInterval(generateEvent, 2500) 
    } else { 
      clearInterval(timerRef.current) 
    }
    return () => clearInterval(timerRef.current)
  }, [live, dbStudents, dbReaders, loading])

  // ── 3. FILTRAGE & STATS ──
  const filtered = filter === 'ALL' ? events : filter === 'GRANTED' ? events.filter(e=>e.ok) : events.filter(e=>!e.ok)
  const totalGranted = events.filter(e=>e.ok).length
  const totalDenied = events.filter(e=>!e.ok).length

  if (loading) return <DashLayout title="Monitoring"><div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)'}}>Initialisation du monitoring...</div></DashLayout>

  return (
    <DashLayout title="Monitoring Multi-Lecteurs" requiredRole="surveillant">
      
      {/* Header - Design d'origine 100% préservé */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.3rem', color:'var(--ink)' }}>📡 Flux temps réel — Tous lecteurs</div>
          <div style={{ fontSize:'.83rem', color:'var(--slate)', marginTop:2 }}>
            {devices.filter(d=>d.status==='ONLINE').length} contrôleur(s) actif(s) · {events.length} événements chargés
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ 
              width:8, height:8, borderRadius:'50%', 
              background:live ? 'var(--green)' : 'var(--slate)', 
              animation:live ? 'pulse 1.5s infinite' : undefined 
            }}/>
            <span style={{ fontSize:'.83rem', color:live?'var(--green)':'var(--slate)', fontWeight:600 }}>{live?'LIVE':'PAUSÉ'}</span>
          </div>
          <button className="btn btn-sm" onClick={() => setLive(l=>!l)} style={{
            padding:'8px 16px', borderRadius:8, border:'2px solid var(--teal)',
            background:live?'var(--teal)':'transparent', color:live?'#fff':'var(--teal)',
            fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.83rem', cursor:'pointer'
          }}>{live?'⏸ Pause':'▶ Reprendre'}</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard/surveillant')}>← Retour</button>
        </div>
      </div>

      {/* Cartes lecteurs (Dynamiques basées sur la BD) */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12, marginBottom:20 }}>
        {dbReaders.map(r => {
          const st = readerStats[r.id] || { granted:0, denied:0 }
          const ctrlStatus = devices.find(d => d.id === r.controller_id)?.status
          return (
            <div key={r.id} className="card card-p" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.82rem', color:'var(--ink)', lineHeight:1.3 }}>{r.name}</div>
                <div style={{ width:8, height:8, borderRadius:'50%', background:ctrlStatus==='ONLINE'?'var(--green)':'var(--red)', flexShrink:0, marginTop:3 }}/>
              </div>
              <div style={{ fontSize:'.72rem', color:'var(--slate)', marginBottom:10 }}>{r.id} · {r.room}</div>
              <div style={{ display:'flex', gap:8 }}>
                <span className="badge badge-green" style={{ fontSize:'.68rem' }}>✓ {st.granted}</span>
                <span className="badge badge-red" style={{ fontSize:'.68rem' }}>✕ {st.denied}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Statistiques globales - Design Intact */}
      <div className="kpi-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Événements total', value:events.length,  color:'var(--ink)',   icon:'📊' },
          { label:'Accès autorisés',  value:totalGranted,   color:'var(--green)', icon:'✅' },
          { label:'Accès refusés',    value:totalDenied,    color:'var(--red)',   icon:'🚫' },
        ].map((s,i) => (
          <div key={i} className="kpi-card" style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:'1.8rem' }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.6rem', color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'.75rem', color:'var(--slate)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Flux d'événements - Design Intact */}
      <div className="card">
        <div style={{ padding:'14px 24px', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.9rem', color:'var(--ink)', marginRight:8 }}>Journal des accès (Base)</span>
          {['ALL','GRANTED','DENIED'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'4px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:'.78rem', fontWeight:600,
              background: filter===f ? (f==='GRANTED'?'var(--green)':f==='DENIED'?'var(--red)':'var(--ink)') : 'var(--mist)',
              color: filter===f ? '#fff' : 'var(--slate)'
            }}>
              {f==='ALL'?'Tous':f==='GRANTED'?'Autorisés':'Refusés'}
            </button>
          ))}
        </div>
        <div className="table-wrap" style={{ maxHeight:450, overflowY:'auto' }}>
          <table role="table">
            <thead>
              <tr><th>Heure</th><th>Zone / Lecteur</th><th>Étudiant</th><th>Matricule</th><th>Méthode</th><th>Résultat</th></tr>
            </thead>
            <tbody>
              {filtered.map((ev,i) => (
                <tr key={ev.id} className={ev.isLive?'fade-in':''} style={{ background:ev.isLive?(ev.ok?'rgba(30,132,73,.04)':'rgba(192,57,43,.04)'):'transparent' }}>
                  <td style={{ fontFamily:'monospace', fontSize:'.77rem' }}>{ev.time}</td>
                  <td>
                    <div style={{ fontSize:'.78rem', fontWeight:600, color:'var(--ink)' }}>{ev.room}</div>
                    <div style={{ fontSize:'.68rem', color:'var(--slate)' }}>{ev.reader}</div>
                  </td>
                  <td><strong style={{ color:'var(--ink)' }}>{ev.name}</strong></td>
                  <td style={{ fontFamily:'monospace', fontSize:'.75rem' }}>{ev.mat}</td>
                  <td><span className="badge badge-slate" style={{ fontSize:'.65rem' }}>{ev.method}</span></td>
                  <td>
                    <span className={`badge badge-${ev.ok?'green':'red'}`}>{ev.ok?'AUTORISÉ':'REFUSÉ'}</span>
                    {ev.reason && <div style={{ fontSize:'.65rem', color:'var(--red)', marginTop:2, fontWeight:700 }}>⚠️ {ev.reason}</div>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--slate)' }}>Aucun événement en base de données</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0% { opacity:1; } 50% { opacity:0.3; } 100% { opacity:1; } }
        .fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </DashLayout>
  )
}