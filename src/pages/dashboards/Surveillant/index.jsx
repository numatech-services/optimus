import { useState, useRef, useEffect } from 'react' // Ajout de useEffect
import { useNavigate } from 'react-router-dom'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Import client Supabase

const POOL = [
  { name:'Hadiza Mahamadou', mat:'ETU-2024-0847', photo:'FD', filiere:'L3 Informatique', ok:true, method:'QR' },
  { name:'INCONNU',     mat:'ETU-9999-0001', photo:'?',  filiere:'—', ok:false, method:'QR',    reason:"Non inscrit à cette session d'examen" },
  { name:'Boubacar Abdou',     mat:'ETU-2024-0512', photo:'OB', filiere:'L3 Informatique', ok:true, method:'BADGE' },
  { name:'Moussa Sall', mat:'ETU-2024-0389', photo:'MS', filiere:'L3 Info', ok:false, method:'BADGE', reason:'Badge bloqué — impayé scolarité' },
  { name:'Aïssa Koné',  mat:'ETU-2024-0156', photo:'AK', filiere:'L3 Informatique', ok:true, method:'QR' },
]

export default function SurveillantDash() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const scanIdxRef = useRef(0)

  // ── États pour les données Supabase ──
  const [session, setSession] = useState({ name: 'Chargement...', room: '—', time_start: '--:--', time_end: '--:--', expected_students: 0 })
  const [devices, setDevices] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanResult, setScanResult] = useState(null)
  const [scanning, setScanning] = useState(false)

  // ── 1. Chargement initial des données ──
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [resSession, resDevices, resEvents] = await Promise.all([
        supabase.from('access_sessions').select('*').limit(1).single(),
        supabase.from('devices').select('*').limit(500).eq('status', 'ONLINE'),
        supabase.from('access_events').select('*').order('timestamp', { ascending: false }).limit(20)
      ])

      if (resSession.data) setSession(resSession.data)
      if (resDevices.data) setDevices(resDevices.data)
      if (resEvents.data) {
        // Mapping du format vers ton format d'affichage historique
        const formattedHistory = resEvents.data.map(e => ({
          time: new Date(e.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          name: e.student_name,
          mat: e.matricule,
          ok: e.type === 'GRANTED',
          method: 'RFID/QR',
          reason: e.reason
        }))
        setHistory(formattedHistory)
      }
    } catch (err) {
      console.error("Erreur Surveillant Dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. Simulation de scan avec persistance Supabase ──
  const simulateScan = () => {
    if (scanning) return
    setScanning(true); 
    setScanResult(null)

    setTimeout(async () => {
      const r = POOL[scanIdxRef.current % POOL.length]; 
      scanIdxRef.current++
      
      const now = new Date()
      const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

      // Enregistrement réel dans la base de données
      try {
        const { error } = await supabase.from('access_events').insert([{
          id: `EVT-${Date.now()}`,
          timestamp: now.toISOString(),
          type: r.ok ? 'GRANTED' : 'DENIED',
          matricule: r.mat,
          student_name: r.name,
          filiere: r.filiere,
          direction: 'ENTRY',
          reader_id: 'RDR-001A',
          reason: r.reason || ''
        }])
      } catch (err) {
        console.error("[Error]", err.message)
      }

      if (!error) {
        const entry = { time:t, name:r.name, mat:r.mat, ok:r.ok, method:r.method, reason:r.reason }
        setScanResult(r)
        setHistory(h => [entry, ...h.slice(0,19)])
      }

      setScanning(false)
      setTimeout(() => setScanResult(null), 4000)
    }, 700)
  }

  const validCount   = history.filter(h=>h.ok).length
  const refusedCount = history.filter(h=>!h.ok).length
  const expected     = session.expected_students || 87

  if (loading) return <DashLayout title="Chargement..."><div style={{padding:60, textAlign:'center'}}>Initialisation du terminal de surveillance...</div></DashLayout>

  return (
    <DashLayout title="Tableau de bord Surveillant" requiredRole="surveillant">
      <div className="dash-page-title">🛂 Tableau de bord Surveillant</div>
      <div className="dash-page-sub">
        Session : <strong>{session.name?.split('—')[0]}</strong> · {session.room} · {session.time_start}–{session.time_end}
      </div>

      {/* Scan result */}
      {scanResult && (
        <div className="fade-in" style={{
          background:scanResult.ok?'var(--green)':'var(--red)',
          borderRadius:16,padding:'20px 28px',marginBottom:24,color:'#fff',
          display:'flex',gap:20,alignItems:'center',boxShadow:'0 8px 32px rgba(0,0,0,.18)'
        }}>
          <div style={{ width:64,height:64,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1.3rem',flexShrink:0 }}>
            {scanResult.photo}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1.5rem',marginBottom:4 }}>
              {scanResult.ok ? '✅ ACCÈS AUTORISÉ' : '🚫 ACCÈS REFUSÉ'}
            </div>
            <div style={{ fontSize:'.95rem',opacity:.9 }}>{scanResult.name} · {scanResult.mat} · {scanResult.filiere}</div>
            <div style={{ fontSize:'.8rem',opacity:.7,marginTop:2 }}>Méthode : {scanResult.method} · Lecteur : RDR-001A</div>
            {scanResult.reason && (
              <div style={{ marginTop:8,background:'rgba(0,0,0,.18)',padding:'5px 12px',borderRadius:6,fontSize:'.83rem',display:'inline-block' }}>
                ⚠️ {scanResult.reason}
              </div>
            )}
          </div>
          <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'4rem',opacity:.15 }}>{scanResult.ok?'✓':'✕'}</div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { label:'Étudiants attendus', value:expected, sub:'Inscrits session',    icon:'👥', color:'var(--ink)' },
          { label:'Entrées validées',   value:validCount,  sub:`${Math.round(validCount/expected*100)}% — Temps réel`, icon:'✅', color:'var(--green)' },
          { label:'Accès refusés',      value:refusedCount,sub:refusedCount>0?'Alertes système':'Aucun incident', icon:'🚫', color:refusedCount?'var(--red)':'var(--slate)' },
          { label:'Contrôleurs actifs', value:devices.length, sub:'Lecteurs connectés online',             icon:'🖥️', color:'var(--blue)' },
        ].map((k,i) => (
          <div className="kpi-card" key={i}>
            <div style={{ display:'flex',justifyContent:'space-between' }}><div className="kpi-label">{k.label}</div><span style={{ fontSize:'1.3rem' }}>{k.icon}</span></div>
            <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24 }}>
        {[
          { icon:'📷', label:'Scanner portique', sub:'Mode scan plein écran', to:'/dashboard/surveillant/scanner', color:'var(--gold)' },
          { icon:'📡', label:'Flux en direct',   sub:'Tous lecteurs live',    to:'/dashboard/surveillant/monitor',  color:'var(--teal)' },
          { icon:'📋', label:'Liste présence',   sub:'Appel manuel',          to:'/dashboard/surveillant/presence', color:'var(--blue)' },
        ].map((a,i) => (
          <button key={i} onClick={() => navigate(a.to)} style={{
            background:'#fff',border:`2px solid ${a.color}20`,borderRadius:12,padding:'18px',
            textAlign:'left',cursor:'pointer',transition:'all .2s'
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color;e.currentTarget.style.background=`${a.color}08`}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=`${a.color}20`;e.currentTarget.style.background='#fff'}}>
            <div style={{ fontSize:'1.8rem',marginBottom:6 }}>{a.icon}</div>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.9rem',color:'var(--ink)',marginBottom:2 }}>{a.label}</div>
            <div style={{ fontSize:'.75rem',color:'var(--slate)' }}>{a.sub}</div>
          </button>
        ))}
      </div>

      {/* Scan button + mini history */}
      <div style={{ display:'grid',gridTemplateColumns:'280px 1fr',gap:20 }}>
        <div className="card card-p" style={{ textAlign:'center' }}>
          <div className="section-title mb-8">Scan rapide</div>
          <div className="section-sub" style={{ marginBottom:16 }}>Lecteur Amphi A</div>
          {/* Progress */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:'.73rem',color:'var(--slate)',marginBottom:4 }}>
              <span>Progression</span><span style={{ fontWeight:700,color:'var(--green)' }}>{validCount}/{expected}</span>
            </div>
            <div style={{ background:'var(--mist)',borderRadius:100,height:7,overflow:'hidden' }}>
              <div style={{ width:`${Math.min(100,(validCount/expected)*100)}%`,height:'100%',background:'var(--green)',borderRadius:100,transition:'width .5s' }}/>
            </div>
          </div>
          <button onClick={simulateScan} disabled={scanning} style={{
            width:140,height:140,borderRadius:'50%',
            background:scanning?'var(--slate)':'var(--ink)',
            border:`5px solid var(--primary)}`,
            color:'#fff',fontSize:'2.3rem',cursor:scanning?'default':'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            margin:'0 auto 12px',gap: 4,transition:'all .2s',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700
          }}
            onMouseEnter={e=>{if(!scanning){e.currentTarget.style.background='var(--primary)';e.currentTarget.style.color='#fff'}}}
            onMouseLeave={e=>{if(!scanning){e.currentTarget.style.background='var(--ink)';e.currentTarget.style.color='#fff'}}}>
            <span>{scanning?'⏳':'📷'}</span>
            <span style={{ fontSize:'.75rem' }}>{scanning?'LECTURE…':'SCANNER'}</span>
          </button>
          <div style={{ fontSize:'.75rem',color:'var(--slate)' }}>Données enregistré</div>
        </div>

        {/* Recent scans */}
        <div className="card">
          <div style={{ padding:'14px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div className="section-title">Derniers scans (Base)</div>
            <div style={{ display:'flex',gap:8 }}>
              <span className="badge badge-green">✓ {validCount}</span>
              <span className="badge badge-red">✕ {refusedCount}</span>
            </div>
          </div>
          <div className="table-wrap">
            <table role="table">
              <thead><tr><th>Heure</th><th>Étudiant</th><th>Matricule</th><th>Méthode</th><th>Résultat</th></tr></thead>
              <tbody>
                {history.slice(0,8).map((h,i) => (
                  <tr key={i}>
                    <td style={{ fontFamily:'monospace',fontSize:'.78rem' }}>{h.time}</td>
                    <td><strong style={{ color:'var(--ink)' }}>{h.name}</strong></td>
                    <td style={{ fontFamily:'monospace',fontSize:'.75rem' }}>{h.mat}</td>
                    <td><span style={{ background:'var(--mist)',padding:'2px 7px',borderRadius:4,fontSize:'.72rem',fontWeight:700 }}>{h.method}</span></td>
                    <td><span className={`badge badge-${h.ok?'green':'red'}`}>{h.ok?'AUTORISÉ':'REFUSÉ'}</span></td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', padding:20, color:'var(--slate)'}}>Aucun scan enregistré</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashLayout>
  )
}