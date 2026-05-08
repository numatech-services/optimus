import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' 
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'

export default function SurveillantScanner() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // ── États des données ──
  const [session, setSession] = useState({ name: 'Chargement...', room: '—', time_start: '00:00', time_end: '00:00' })
  const [dynamicPool, setDynamicPool] = useState([]) // Remplace le POOL codé en dur
  const [loading, setLoading] = useState(true)
  
  // ── États UI (Design 100% préservé) ──
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [autoMode, setAutoMode] = useState(false)
  const [stats, setStats] = useState({ granted: 0, denied: 0 })
  
  const autoRef = useRef(null)
  const poolIdxRef = useRef(0)

  // ── 1. CHARGEMENT DE LA SOURCE DE DONNÉES DEPUIS SUPABASE ──
  const refreshData = async () => {
    try {
      const [resSession, resStudents, resBadges, resEvents] = await Promise.all([
        supabase.from('access_sessions').select('*').limit(1).single(),
        supabase.from('students').select('*').limit(500),
        supabase.from('badges').select('*').limit(500),
        supabase.from('access_events').select('*').order('timestamp', { ascending: false }).limit(20)
      ])

      if (resSession.data) setSession(resSession.data)

      // Création du POOL dynamique basé sur la base de données
      if (resStudents.data && resBadges.data) {
        const pool = resStudents.data.map(s => {
          const b = resBadges.data.find(badge => badge.student_id === s.id)
          return {
            name: `${s.prenom} ${s.nom}`,
            mat: s.id,
            initials: (s.prenom[0] + s.nom[0]).toUpperCase(),
            filiere: s.filiere,
            // L'accès est OK uniquement si le badge existe et est ACTIVE
            ok: b?.status === 'ACTIVE', 
            method: b?.card_type || 'RFID',
            reader: 'RDR-001A',
            reason: b?.status === 'BLOCKED' ? (b.blocked_reason || 'Badge bloqué') : (b ? '' : 'Badge non émis')
          }
        })
        setDynamicPool(pool)
      }

      if (resEvents.data) {
        const mappedHistory = resEvents.data.map(e => ({
          id: e.id,
          time: new Date(e.timestamp).toLocaleTimeString('fr-FR'),
          name: e.student_name,
          mat: e.matricule,
          initials: e.student_name ? e.student_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?',
          filiere: e.filiere,
          ok: e.type === 'GRANTED',
          method: 'SCANNER',
          reader: e.reader_id,
          reason: e.reason
        }))
        setHistory(mappedHistory)
        setStats({
          granted: mappedHistory.filter(h => h.ok).length,
          denied: mappedHistory.filter(h => !h.ok).length
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  // ── 2. LOGIQUE DE SIMULATION DE SCAN (Utilise le pool dynamique) ──
  const doScan = async () => {
    if (scanning || dynamicPool.length === 0) return
    setScanning(true)
    
    setTimeout(async () => {
      // On pioche dans les vrais étudiants de la base
      const r = dynamicPool[poolIdxRef.current % dynamicPool.length]; 
      poolIdxRef.current++
      
      const now = new Date()
      const timeStr = now.toLocaleTimeString('fr-FR')
      
      const entry = { id: `EVT-${Date.now()}`, time: timeStr, ...r }

      // ENREGISTREMENT RÉEL DU PASSAGE DANS SUPABASE
      try {
        const { error } = await supabase.from('access_events').insert([{
          id: entry.id,
          timestamp: now.toISOString(),
          type: r.ok ? 'GRANTED' : 'DENIED',
          matricule: r.mat,
          student_name: r.name,
          filiere: r.filiere,
          direction: 'ENTRY',
          reader_id: r.reader,
          reason: r.reason || ''
        }])
      } catch (err) {
        console.error("[Error]", err.message)
      }

      if (!error) {
        setResult(entry)
        setHistory(h => [entry, ...h.slice(0, 29)])
        setStats(s => ({ granted: s.granted + (r.ok ? 1 : 0), denied: s.denied + (r.ok ? 0 : 1) }))
      }

      setScanning(false)
      setTimeout(() => setResult(null), 3500)
    }, 600)
  }

  useEffect(() => {
    if (autoMode) { autoRef.current = setInterval(doScan, 3000) }
    else { clearInterval(autoRef.current) }
    return () => clearInterval(autoRef.current)
  }, [autoMode, dynamicPool])

  const total = stats.granted + stats.denied
  const rate = total > 0 ? Math.round(stats.granted / total * 100) : 0

  if (loading) return <DashLayout title="Scanner">
    <div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)'}}>
      Synchronisation avec la base de données étudiants...
    </div>
  </DashLayout>

  return (
    <DashLayout title="Mode Scanner" requiredRole="surveillant">
      {/* Header - Design 100% Identique */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.4rem', color:'var(--ink)' }}>📷 Mode Scanner Plein Écran</div>
          <div style={{ fontSize:'.83rem', color:'var(--slate)', marginTop:2 }}>
            {session.name} · {session.room} · {session.time_start}–{session.time_end}
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setAutoMode(a=>!a)} style={{
            padding:'8px 18px', borderRadius:8, border:'2px solid var(--teal)',
            background:autoMode?'var(--teal)':'transparent', color:autoMode?'#fff':'var(--teal)',
            fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.85rem', cursor:'pointer'
          }}>{autoMode?'⏸ Stop auto':'▶ Mode auto'}</button>
          <button onClick={() => navigate('/dashboard/surveillant')} style={{
            padding:'8px 18px', borderRadius:8, border:'2px solid var(--border)',
            background:'#fff', color:'var(--slate)', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:600, fontSize:'.85rem', cursor:'pointer'
          }}>← Tableau de bord</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, alignItems:'start' }}>
        <div>
          {/* Result panel - Design Intact */}
          <div style={{
            borderRadius:20, minHeight:190, padding:'28px 32px', marginBottom:20, transition:'all .3s',
            display:'flex', alignItems:'center', gap:24,
            background:result?(result.ok?'linear-gradient(135deg,#1e8449,#27ae60)':'linear-gradient(135deg,#c0392b,#e74c3c)'):'linear-gradient(135deg,#f0f3f8,var(--border))',
            boxShadow:result?'0 12px 40px rgba(0,0,0,.18)':'none',
          }}>
            {result ? (
              <>
                <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.4rem', color:'#fff', flexShrink:0 }}>{result.initials}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.8rem', color:'#fff', marginBottom:4 }}>{result.ok?'✅ ACCÈS AUTORISÉ':'🚫 ACCÈS REFUSÉ'}</div>
                  <div style={{ fontSize: '1.1rem', color:'#fff', fontWeight: 600 }}>{result.name}</div>
                  <div style={{ fontSize:'1rem', color:'rgba(255,255,255,.9)', marginBottom:2 }}>Matricule : {result.mat}</div>
                  <div style={{ fontSize:'.83rem', color:'rgba(255,255,255,.7)' }}>{result.filiere} · Lecteur : {result.reader}</div>
                  {result.reason && <div style={{ marginTop:10, background:'rgba(0,0,0,.2)', borderRadius:8, padding:'5px 12px', display:'inline-block', fontSize:'.8rem', color:'#fff', fontWeight: 700 }}>⚠️ {result.reason}</div>}
                </div>
                <div style={{ fontSize:'5rem', opacity:.12, color:'#fff', fontWeight:800 }}>{result.ok?'✓':'✕'}</div>
              </>
            ) : (
              <div style={{ flex:1, textAlign:'center', color:'var(--slate)' }}>
                <div style={{ fontSize:'3rem', marginBottom:8 }}>{scanning?'⏳':'👁️'}</div>
                <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'1.1rem' }}>{scanning?'Lecture du badge...':autoMode?'Mode automatique actif':'En attente d\'un scan (Données)'}</div>
              </div>
            )}
          </div>

          {/* Scan button - Design Intact */}
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <button onClick={doScan} disabled={scanning||autoMode} style={{
              width:172, height:172, borderRadius:'50%',
              background:scanning?'var(--slate)':autoMode?'var(--mist)':'var(--ink)',
              border:`6px solid var(--primary)}`,
              color:autoMode?'var(--slate)':'#fff', fontSize:'2.6rem',
              cursor:(scanning||autoMode)?'default':'pointer',
              display:'inline-flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:8, transition:'all .2s', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,.12)'
            }}
              onMouseEnter={e=>{if(!scanning&&!autoMode){e.currentTarget.style.background='var(--primary)';e.currentTarget.style.color='#fff'}}}
              onMouseLeave={e=>{if(!scanning&&!autoMode){e.currentTarget.style.background='var(--ink)';e.currentTarget.style.color='#fff'}}}>
              <span>{scanning?'⏳':autoMode?'🤖':'📷'}</span>
              <span style={{ fontSize:'.78rem' }}>{scanning?'LECTURE…':autoMode?'AUTO':'SCANNER'}</span>
            </button>
            <div style={{ marginTop:10, fontSize:'.75rem', color:'var(--slate)' }}>Simulation basée sur les {dynamicPool.length} étudiants de la base</div>
          </div>

          {/* Stats - Design Intact */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { label:'Scans total',    value:total,           color:'var(--ink)',   icon:'📊' },
              { label:'Autorisés',      value:stats.granted,   color:'var(--green)', icon:'✅' },
              { label:'Refusés',        value:stats.denied,    color:'var(--red)',   icon:'🚫' },
              { label:"Taux d'accès",   value:`${rate}%`,      color:rate>80?'var(--green)':'var(--amber)', icon:'📈' },
            ].map((s,i) => (
              <div key={i} className="card card-p" style={{ textAlign:'center', padding:'14px' }}>
                <div style={{ fontSize:'1.2rem', marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.5rem', color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'.72rem', color:'var(--slate)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live log - Design Intact & Data */}
        <div className="card" style={{ maxHeight:'72vh', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.9rem', color:'var(--ink)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <span>📋 Journal temps réel</span>
            <span style={{ fontSize:'.75rem', color:'var(--slate)', fontWeight:400 }}>{history.length} entrées</span>
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {history.length === 0
              ? <div style={{ padding:24, textAlign:'center', color:'var(--slate)', fontSize:'.85rem' }}>Aucun scan en base de données</div>
              : history.map((h,i) => (
                <div key={h.id} className={i===0?'fade-in':''} style={{
                  padding:'10px 16px', borderBottom:'1px solid #f0f3f8',
                  display:'flex', alignItems:'center', gap:10,
                  background:i===0?(h.ok?'rgba(30,132,73,.05)':'rgba(192,57,43,.05)'):'transparent'
                }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:h.ok?'var(--green)':'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.65rem', fontWeight:800, flexShrink:0 }}>{h.initials}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'.82rem', color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{h.name}</div>
                    <div style={{ fontSize:'.7rem', color:'var(--slate)' }}>{h.mat}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <span className={`badge badge-${h.ok?'green':'red'}`} style={{ fontSize:'.65rem', padding:'2px 6px' }}>{h.ok?'OK':'✕'}</span>
                    <div style={{ fontSize:'.68rem', color:'var(--slate)', marginTop:2 }}>{h.time}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </DashLayout>
  )
}