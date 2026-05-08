import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── Constantes de Design (Zéro omission) ──────────────────
const SEVERITY_COLORS = { HIGH:'var(--red)', MEDIUM:'var(--amber)', LOW:'var(--slate)' }
const SEVERITY_LABELS = { HIGH:'Élevée', MEDIUM:'Moyenne', LOW:'Faible' }
const STATUS_COLORS = { REPORTED:'var(--blue)', RESOLVED:'var(--green)', ESCALATED:'var(--red)' }
const STATUS_LABELS = { REPORTED:'Signalé', RESOLVED:'Résolu', ESCALATED:'Escaladé' }

export default function SurveillantIncidents() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // ── États des données Supabase ──
  const [incidents, setIncidents] = useState([])
  const [dbReaders, setDbReaders] = useState([])
  const [session, setSession] = useState({ name: 'Chargement...', room: '—' })
  const [loading, setLoading] = useState(true)
  
  // ── États UI (Design Intact) ──
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({
    type: 'Badge inconnu',
    severity: 'Moyenne',
    matricule: '',
    readerId: '',
    description: ''
  })

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 1. CHARGEMENT RÉEL ──
  useEffect(() => {
    fetchIncidentsData()
  }, [])

  const fetchIncidentsData = async () => {
    setLoading(true)
    try {
      const [resInc, resReaders, resSession] = await Promise.all([
        supabase.from('incidents').select('*').limit(500).order('created_at', { ascending: false }),
        supabase.from('readers').select('*').limit(500),
        supabase.from('access_sessions').select('*').limit(1).single()
      ])

      if (resSession.data) setSession(resSession.data)
      if (resReaders.data) {
        setDbReaders(resReaders.data)
        // Initialiser le lecteur du formulaire par défaut
        if (resReaders.data.length > 0) setForm(f => ({ ...f, readerId: resReaders.data[0].id }))
      }

      if (resInc.data) {
        // Mapping -> Variables JS d'origine (Zéro Omission)
        const mapped = resInc.data.map(i => ({
          id: i.id,
          time: new Date(i.created_at).toLocaleTimeString('fr-FR'),
          type: i.type,
          severity: i.severity,
          reader: i.reader_id,
          room: i.room,
          description: i.description,
          mat: i.student_matricule,
          name: i.student_name,
          status: i.status,
          resolution: i.resolution,
          escalatedTo: i.escalated_to
        }))
        setIncidents(mapped)
      }
    } catch (err) {
      console.error("Erreur Sync Incidents:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. SAUVEGARDE RÉELLE (CRUD) ──
  const handleSaveIncident = async () => {
    if (!form.description) return showToast("Veuillez décrire l'incident", "error")

    const selectedReader = dbReaders.find(r => r.id === form.readerId)
    
    // Conversion Libellés UI -> Constantes
    const severityMap = { 'Faible':'LOW', 'Moyenne':'MEDIUM', 'Élevée':'HIGH' }
    const typeKey = form.type.toUpperCase().replace(/\s/g, '_')

    const newId = `INC-${Date.now().toString().slice(-3)}`
    const payload = {
      id: newId,
      type: typeKey,
      severity: severityMap[form.severity] || 'MEDIUM',
      reader_id: form.readerId,
      room: selectedReader?.room || 'Inconnu',
      description: form.description,
      student_matricule: form.matricule || 'Inconnu',
      student_name: 'Signalé par terminal',
      status: 'REPORTED'
    }

    try {
      const { error } = await supabase.from('incidents').insert([payload])
    } catch (err) {
      console.error("[Error]", err.message)
    }

    if (!error) {
      showToast("Incident enregistré et transmis à l'administration")
      setShowForm(false)
      setForm({ ...form, description: '', matricule: '' })
      fetchIncidentsData()
    } else {
      showToast("Erreur lors de l'envoi", "error")
    }
  }

  if (loading) return <DashLayout title="Incidents"><div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700}}>Synchronisation du registre des incidents...</div></DashLayout>

  return (
    <DashLayout title="Rapport d'Incidents" requiredRole="surveillant">
      
      {/* Toast Design Origine */}
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position:'fixed',top:24,right:24,zIndex:2000,padding:'12px 20px',borderRadius:10,background:toast.type==='error'?'var(--red)':'var(--green)',color:'#fff',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.type==='error'?'❌':'✅'} {toast.msg}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.3rem', color:'var(--ink)' }}>⚠️ Rapport d'incidents</div>
          <div style={{ fontSize:'.83rem', color:'var(--slate)', marginTop:2 }}>
            Session : {session.name} · {session.room} · {session.time_start}–{session.time_end}
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setShowForm(f=>!f)} className="btn btn-primary" style={{ padding:'8px 18px', fontSize:'.85rem' }}>
            {showForm ? 'Annuler' : '+ Signaler un incident'}
          </button>
          <button onClick={() => navigate('/dashboard/surveillant')} style={{ padding:'8px 16px', borderRadius:8, border:'2px solid var(--border)', background:'#fff', color:'var(--slate)', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:600, fontSize:'.83rem', cursor:'pointer' }}>← Retour</button>
        </div>
      </div>

      {/* Stats - Design 100% Intact */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Incidents total',  value:incidents.length,                                 color:'var(--ink)',   icon:'📊' },
          { label:'Escaladés',        value:incidents.filter(i=>i.status==='ESCALATED').length, color:'var(--red)',   icon:'🚨' },
          { label:'Résolus',          value:incidents.filter(i=>i.status==='RESOLVED').length,  color:'var(--green)', icon:'✅' },
        ].map((s,i) => (
          <div key={i} className="card card-p" style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div style={{ fontSize:'1.8rem' }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.6rem', color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'.75rem', color:'var(--slate)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire de signalement - Design Intact */}
      {showForm && (
        <div className="card card-p" style={{ marginBottom:20, borderLeft:'4px solid var(--primary)', animation: 'slideDown 0.3s ease' }}>
          <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.9rem', color:'var(--ink)', marginBottom:16 }}>Signaler un nouvel incident matériel ou humain</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div className="form-group">
              <label className="form-label">Type d'incident</label>
              <select className="form-input" style={{ padding:'8px 12px' }} value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
                <option>Badge inconnu</option><option>Badge bloqué</option><option>Badge perdu/volé</option>
                <option>Intrusion forcée</option><option>Tailgating (passage groupé)</option><option>Autre</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sévérité</label>
              <select className="form-input" style={{ padding:'8px 12px' }} value={form.severity} onChange={e=>setForm({...form, severity:e.target.value})}>
                <option>Faible</option><option>Moyenne</option><option>Élevée</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Matricule étudiant (si connu)</label>
              <input className="form-input" placeholder="ETU-XXXX-XXXX" style={{ padding:'8px 12px' }} value={form.matricule} onChange={e=>setForm({...form, matricule:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Lecteur concerné</label>
              <select className="form-input" style={{ padding:'8px 12px' }} value={form.readerId} onChange={e=>setForm({...form, readerId:e.target.value})}>
                {dbReaders.map(r => (
                  <option key={r.id} value={r.id}>{r.id} — {r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom:12 }}>
            <label className="form-label">Description détaillée des faits</label>
            <textarea className="form-input" rows={3} placeholder="Précisez les circonstances..." style={{ padding:'8px 12px', resize:'vertical' }} value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-primary" style={{ padding:'8px 20px' }} onClick={handleSaveIncident}>Enregistrer l'incident</button>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary" style={{ padding:'8px 20px' }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste des Incidents - Design Intact & Données */}
      <div style={{ display:'grid', gap:16 }}>
        {incidents.map(inc => (
          <div key={inc.id} className="card card-p" style={{ borderLeft:`4px solid ${SEVERITY_COLORS[inc.severity] || 'var(--slate)'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontFamily:'monospace', fontSize:'.75rem', color:'var(--slate)' }}>{inc.id}</span>
                <span style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.9rem', color:'var(--ink)' }}>{inc.type.replace(/_/g,' ')}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ background:`${SEVERITY_COLORS[inc.severity]}15`, color:SEVERITY_COLORS[inc.severity], padding: '4px 9px', borderRadius:12, fontSize:'.72rem', fontWeight:700 }}>
                  Sévérité : {SEVERITY_LABELS[inc.severity]}
                </span>
                <span style={{ background:`${STATUS_COLORS[inc.status]}15`, color:STATUS_COLORS[inc.status], padding: '4px 9px', borderRadius:12, fontSize:'.72rem', fontWeight:700 }}>
                  {STATUS_LABELS[inc.status]}
                </span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
              <div style={{ background:'var(--mist)', borderRadius:8, padding:'8px 12px' }}>
                <div style={{ fontSize:'.65rem', color:'var(--slate)', marginBottom:2 }}>Heure du rapport</div>
                <div style={{ fontFamily:'monospace', fontWeight:600, fontSize:'.82rem' }}>{inc.time}</div>
              </div>
              <div style={{ background:'var(--mist)', borderRadius:8, padding:'8px 12px' }}>
                <div style={{ fontSize:'.65rem', color:'var(--slate)', marginBottom:2 }}>Lecteur / Zone</div>
                <div style={{ fontFamily:'monospace', fontWeight:600, fontSize:'.82rem' }}>{inc.reader} · {inc.room}</div>
              </div>
              <div style={{ background:'var(--mist)', borderRadius:8, padding:'8px 12px' }}>
                <div style={{ fontSize:'.65rem', color:'var(--slate)', marginBottom:2 }}>Identité déclarée</div>
                <div style={{ fontWeight:600, fontSize:'.82rem' }}>{inc.name} · {inc.mat}</div>
              </div>
            </div>
            <div style={{ fontSize:'.83rem', color:'var(--ink)', marginBottom:inc.resolution||inc.escalatedTo?12:0, lineHeight:1.5 }}>
              {inc.description}
            </div>
            
            {/* Pied de carte conditionnel (Design Intact) */}
            {inc.resolution && (
              <div style={{ background:'rgba(30,132,73,.06)', border:'1px solid rgba(30,132,73,.15)', borderRadius:8, padding:'8px 12px', fontSize:'.78rem', color:'var(--green)', marginTop: 10 }}>
                ✅ Résolution : {inc.resolution}
              </div>
            )}
            {inc.escalatedTo && (
              <div style={{ background:'rgba(192,57,43,.06)', border:'1px solid rgba(192,57,43,.15)', borderRadius:8, padding:'8px 12px', fontSize:'.78rem', color:'var(--red)', marginTop: 10 }}>
                🚨 Escaladé à : {inc.escalatedTo}
              </div>
            )}
          </div>
        ))}

        {incidents.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>
            Aucun incident signalé en base de données.
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </DashLayout>
  )
}