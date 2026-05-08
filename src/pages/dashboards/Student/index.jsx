import { useState, useMemo, useEffect } from 'react' // Ajout de useEffect
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Import client Supabase
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { generateConvocation, printDocument } from '../../../utils/pdfService'
import { resolveStudentContext } from '../../../utils/identityResolver'

export default function StudentDash() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // ── États pour les données provenant de Supabase ──
  const [dbData, setDbData] = useState({
    student: null,
    notes: [],
    paiements: [],
    edts: [],
    convocations: []
  })
  const [loading, setLoading] = useState(true)
  const [edtView, setEdtView] = useState('today')
  const [showQR, setShowQR] = useState(false)

  const matricule = user?.matricule || null

  // ── 1. Chargement des données réelles (Supabase) ──
  useEffect(() => {
    async function loadStudentDashboard() {
      setLoading(true)
      try {
        const { student, studentId, filiere, tenantId } = await resolveStudentContext(user)

        if (!studentId) {
          setDbData({ student: null, notes: [], paiements: [], edts: [], convocations: [] })
          return
        }

        const [resNotes, resPaiements, resEdts, resConvocs] = await Promise.all([
          supabase.from('notes').select('*').limit(50).eq('student_id', studentId),
          supabase.from('paiements').select('*').limit(20).eq('student_id', studentId),
          supabase.from('edts').select('*').limit(50).eq('tenant_id', tenantId),
          // Jointure pour récupérer les infos de l'examen lié à la convocation
          supabase.from('convocations').select('*, examens(*)').eq('student_id', studentId)
        ])

        setDbData({
          student,
          // Mapping -> CamelCase pour ne pas casser ta logique useMemo
          notes: (resNotes.data || []).map(n => ({ 
            ...n, 
            studentId: n.student_id, 
            noteFinal: n.note_final 
          })),
          paiements: (resPaiements.data || []).map(p => ({ 
            ...p, 
            studentId: p.student_id, 
            desc: p.description, 
            date: p.date_paiement 
          })),
          edts: (resEdts.data || []).filter(e => e.filiere === (student?.filiere || filiere)),
          convocations: (resConvocs.data || []).map(c => ({ 
            ...c, 
            studentId: c.student_id, 
            matiere: c.examens?.matiere,
            date: c.examens?.date_examen || c.date,
            heure: c.examens?.heure || c.heure,
            salle: c.salle || c.examens?.salle,
            table: c.numero_table || c.place,
          }))
        })
      } catch (err) {
        console.error("Erreur Student Dashboard:", err)
      } finally {
        setLoading(false)
      }
    }
    loadStudentDashboard()
  }, [user, matricule])

  // ── 2. Ta logique de calcul originale (Inchangée) ──
  const student = dbData.student
  const filiere = student?.filiere || user?.filiere || 'L3 Informatique'

  const myNotes = useMemo(() =>
    dbData.notes.filter(n => n.studentId === matricule && n.semestre === 'S1'),
  [dbData.notes, matricule])

  const moy = useMemo(() => {
    if (!myNotes.length) return null
    const sumCoef = myNotes.reduce((a, n) => a + n.coef, 0)
    return sumCoef > 0 ? (myNotes.reduce((a, n) => a + n.noteFinal * n.coef, 0) / sumCoef).toFixed(2) : null
  }, [myNotes])

  const mention = !moy ? { label:'—', color:'var(--slate)' }
    : parseFloat(moy) >= 16 ? { label:'Très bien', color:'var(--gold)' }
    : parseFloat(moy) >= 14 ? { label:'Bien', color:'var(--green)' }
    : parseFloat(moy) >= 12 ? { label:'Assez bien', color:'var(--teal)' }
    : parseFloat(moy) >= 10 ? { label:'Passable', color:'var(--blue)' }
    : { label:'Insuffisant', color:'var(--red)' }

  const myPaiements = useMemo(() =>
    dbData.paiements.filter(p => p.studentId === matricule),
  [dbData.paiements, matricule])
  
  const payRestant = myPaiements.filter(p => p.statut !== 'PAYÉ').reduce((a, p) => a + p.montant, 0)

  const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi']
  const todayIdx = Math.min(new Date().getDay() - 1, 4)
  const todayName = todayIdx >= 0 ? JOURS[todayIdx] : null

  const myEdts = useMemo(() =>
    dbData.edts.filter(e => e.filiere === filiere),
  [dbData.edts, filiere])

  const edtToday = todayName ? myEdts.filter(e => e.jour === todayName) : []
  const edtWeek = JOURS.flatMap(j => myEdts.filter(e => e.jour === j).map(e => ({ ...e, jourLabel: j })))

  const myConvocs = useMemo(() =>
    dbData.convocations.filter(c => c.studentId === matricule && c.statut === 'CONVOQUÉ'),
  [dbData.convocations, matricule])
  
  const prochainExam = myConvocs[0] || null

  if (loading) return <DashLayout title="Chargement..."><div style={{padding:60, textAlign:'center', color:'var(--slate)', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700}}>Initialisation de votre espace sécurisé...</div></DashLayout>

  return (
    <DashLayout title="Mon espace étudiant" requiredRole="etudiant">

      {/* QR Modal - Structure Intacte */}
      {showQR && prochainExam && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div className="card" style={{ maxWidth:380,width:'100%',borderRadius:16,padding:0 }}>
            <div style={{ padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'var(--ink)' }}>🔒 Convocation — {prochainExam.matiere}</div>
              <button onClick={()=>setShowQR(false)} style={{ background:'none',border:'none',fontSize:'1.5rem',cursor:'pointer' }}>×</button>
            </div>
            <div style={{ padding:28,textAlign:'center' }}>
              <div style={{ width:140,height:140,margin:'0 auto 20px',background:'#fff',border:'3px solid var(--ink)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'5rem' }}>▣</div>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1rem',color:'var(--ink)',marginBottom:6 }}>{user?.name || 'Étudiant'}</div>
              <div style={{ fontFamily:'monospace',fontSize:'1rem',color:'var(--gold)',fontWeight:700,marginBottom:4 }}>{matricule}</div>
              <div style={{ fontSize:'.82rem',color:'var(--slate)',marginBottom:20 }}>
                📅 {prochainExam.date} · {prochainExam.heure} · {prochainExam.salle} · Table {prochainExam.table || '—'}
              </div>
              <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const stu = student || { id:matricule, prenom:'', nom:'', filiere }
                  printDocument(generateConvocation(stu, myConvocs))
                }}>📄 Télécharger PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={()=>setShowQR(false)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header - Structure Intacte */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4,flexWrap:'wrap',gap:12 }}>
        <div className="dash-page-title">Bonjour, {user?.name?.split(' ')[0] || 'Étudiant'} 👋</div>
        <div style={{ background:'var(--gold-light)',border:'1px solid rgba(99,102,241,.15)',borderRadius:10,padding:'8px 16px',textAlign:'right' }}>
          <div style={{ fontSize:'.68rem',color:'var(--amber)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em' }}>Matricule</div>
          <div style={{ fontFamily:'monospace',fontWeight:700,color:'var(--ink)',fontSize:'.92rem' }}>{matricule}</div>
        </div>
      </div>
      <div className="dash-page-sub">{filiere} · Université de Niamey · Année 2025-2026</div>

      {/* KPIs - Structure Intacte */}
      <div className="kpi-grid">
        {[
          { label:'Moyenne S1', value: moy ? `${moy}/20` : '—', sub: moy ? mention.label : 'Non disponible', icon:'📊', color:mention.color, action:()=>navigate('/dashboard/etudiant/notes') },
          { label:'UEs validées', value: `${myNotes.filter(n=>n.noteFinal>=10).length}/${myNotes.length}`, sub:'Semestre 1', icon:'🎓', color:'var(--blue)', action:()=>navigate('/dashboard/etudiant/notes') },
          { label:'Scolarité', value:payRestant===0?'✓ OK':'À payer', sub:payRestant===0?'Tous les paiements OK':`${payRestant.toLocaleString('fr')} XOF`, icon:payRestant===0?'✅':'⚠️', color:payRestant===0?'var(--green)':'var(--red)', action:()=>navigate('/dashboard/etudiant/paiements') },
          { label:'Prochain examen', value: prochainExam ? prochainExam.date : '—', sub: prochainExam ? `${prochainExam.matiere}` : 'Aucun', icon:'📝', color:'var(--amber)', action:()=> prochainExam ? setShowQR(true) : navigate('/dashboard/etudiant/examens') },
        ].map((k)=>(
          <div className="kpi-card" key={`kpi-${k.label}`} onClick={k.action}
            style={{ cursor:'pointer',transition:'all .15s' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
              <div className="kpi-label">{k.label}</div>
              <span style={{ fontSize:'1.3rem' }}>{k.icon}</span>
            </div>
            <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Alertes - Structure Intacte */}
      {prochainExam && (
        <div className="alert alert-error" style={{ marginBottom:16,cursor:'pointer' }} onClick={()=>navigate('/dashboard/etudiant/examens')}>
          🔴 <strong>Examen à venir</strong> — {prochainExam.matiere} · {prochainExam.date} · {prochainExam.heure} · {prochainExam.salle}
          <span style={{ marginLeft:'auto',fontWeight:700,fontSize:'.82rem' }}>Voir convocation →</span>
        </div>
      )}
      {payRestant > 0 && (
        <div className="alert alert-warning" style={{ marginBottom:16,cursor:'pointer' }} onClick={()=>navigate('/dashboard/etudiant/paiements')}>
          ⚠️ <strong>{payRestant.toLocaleString('fr')} XOF</strong> en attente de paiement.
          Passé <strong>60 jours</strong> de retard, votre accès au portique sera suspendu.
          <span style={{ marginLeft:'auto',fontWeight:700,fontSize:'.82rem' }}>Payer →</span>
        </div>
      )}
      {payRestant === 0 && (
        <div className="alert alert-success" style={{ marginBottom:16 }}>
          🪪 <strong>Accès portique actif</strong> — Situation financière à jour.
        </div>
      )}

      <div className="grid-2" style={{ marginBottom:24 }}>
        {/* EDT - Structure Intacte */}
        <div className="card">
          <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div className="section-title">📅 Emploi du temps</div>
            <div style={{ display:'flex',gap:4,background:'var(--mist)',borderRadius:8,padding:3 }}>
              {[['today','Auj.'],['week','Semaine']].map(([v,l])=>(
                <button key={v} onClick={()=>setEdtView(v)}
                  style={{ padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.75rem',
                    background:edtView===v?'#fff':'transparent',color:edtView===v?'var(--ink)':'var(--slate)',
                    boxShadow:edtView===v?'0 1px 4px rgba(0,0,0,.08)':'none' }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ padding:'14px 20px' }}>
            {edtView==='today' ? (
              edtToday.length
                ? edtToday.map((c,i)=>(
                  <div key={`edt-t-${c.id}-${i}`} style={{ display:'flex',gap:10,alignItems:'center',padding:'9px 12px',background:'var(--blue)0d',borderRadius:8,marginBottom:6,border:'1px solid var(--blue)22' }}>
                    <div style={{ textAlign:'center',flexShrink:0,background:'var(--blue)',borderRadius:6,padding:'4px 8px' }}>
                      <div style={{ fontSize:'.68rem',fontFamily:'monospace',color:'#fff',fontWeight:700 }}>{c.heure}</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600,color:'var(--ink)',fontSize:'.88rem' }}>{c.matiere}</div>
                      <div style={{ fontSize:'.72rem',color:'var(--slate)' }}>{c.salle} · {c.prof} · {c.type}</div>
                    </div>
                  </div>
                ))
                : <div style={{ textAlign:'center',color:'var(--slate)',fontSize:'.85rem',padding:'20px 0' }}>{todayName ? "Aucun cours aujourd'hui 🎉" : 'Bon week-end ! 🎉'}</div>
            ) : (
              edtWeek.map((c,i)=>(
                <div key={`edt-w-${c.id}-${i}`} style={{ display:'flex',gap:10,alignItems:'center',padding:'7px 10px',borderRadius:7,marginBottom:5,background:'var(--mist)' }}>
                  <div style={{ width:64,flexShrink:0 }}>
                    <div style={{ fontSize:'.62rem',color:'var(--slate)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700 }}>{c.jourLabel}</div>
                    <div style={{ fontSize:'.72rem',fontFamily:'monospace',color:'var(--gold)' }}>{c.heure}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight:600,color:'var(--ink)',fontSize:'.85rem' }}>{c.matiere}</div>
                    <div style={{ fontSize:'.7rem',color:'var(--slate)' }}>{c.salle} · {c.type}</div>
                  </div>
                </div>
              ))
            )}
            <button className="btn btn-secondary btn-sm" style={{ width:'100%',marginTop:10 }} onClick={()=>navigate('/dashboard/etudiant/edt')}>
              Voir tout l'emploi du temps →
            </button>
          </div>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {/* Notes - Structure Intacte */}
          <div className="card">
            <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div className="section-title">🏆 Mes notes — S1</div>
              {moy && <span style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:mention.color,fontSize:'.88rem' }}>Moy. {moy}</span>}
            </div>
            <div style={{ padding:'12px 20px' }}>
              {myNotes.length
                ? myNotes.slice(0,6).map((n,i)=>{
                    const nc = n.noteFinal>=14?'var(--green)':n.noteFinal>=10?'var(--blue)':'var(--red)'
                    return (
                      <div key={`note-${n.id}`} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<Math.min(myNotes.length,6)-1?'1px solid #f5f7fb':'none' }}>
                        <span style={{ fontSize:'.84rem',color:'var(--ink-60)' }}>{n.matiere}</span>
                        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                          <span style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:nc,fontSize:'.92rem' }}>{n.noteFinal}/20</span>
                        </div>
                      </div>
                    )
                  })
                : <div style={{ textAlign:'center',color:'var(--slate)',fontSize:'.85rem',padding:'16px 0' }}>Notes non publiées</div>
              }
              <button className="btn btn-secondary btn-sm" style={{ width:'100%',marginTop:10 }} onClick={()=>navigate('/dashboard/etudiant/notes')}>
                Voir relevé complet →
              </button>
            </div>
          </div>

          {/* Convocation rapide - Structure Intacte */}
          {prochainExam && (
            <div className="card" style={{ padding:'18px 20px',background:'linear-gradient(135deg,#1E1E1E 0%,#1a2035 100%)',border:'none' }}>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'#fff',fontSize:'.95rem',marginBottom:6 }}>🔒 Prochain examen</div>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:900,color:'var(--gold)',fontSize:'1.1rem',marginBottom:4 }}>{prochainExam.matiere}</div>
              <div style={{ fontSize:'.78rem',color:'rgba(255,255,255,.6)',marginBottom:14 }}>
                📅 {prochainExam.date} · {prochainExam.heure} · {prochainExam.salle}
              </div>
              <button onClick={()=>setShowQR(true)} className="btn btn-primary btn-sm">📄 Convocation</button>
            </div>
          )}
        </div>
      </div>

      {/* Paiements - Structure Intacte */}
      <div className="card">
        <div style={{ padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div className="section-title">💳 Mes paiements</div>
          <button className="btn btn-primary btn-sm" onClick={()=>navigate('/dashboard/etudiant/paiements')}>Gérer les paiements →</button>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Description</th><th>Montant (XOF)</th><th>Date</th><th>Statut</th></tr></thead>
            <tbody>
              {myPaiements.slice(0,5).map((p)=>(
                <tr key={`pay-${p.id}`}>
                  <td>{p.desc}</td>
                  <td style={{ fontWeight:600,fontFamily:'Marianne,Roboto,sans-serif' }}>{p.montant.toLocaleString('fr')}</td>
                  <td style={{ color:'var(--slate)',fontSize:'.82rem' }}>{p.date || '—'}</td>
                  <td><span className={`badge ${p.statut==='PAYÉ'?'badge-green':'badge-gold'}`}>{p.statut}</span></td>
                </tr>
              ))}
              {myPaiements.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign:'center',padding:24,color:'var(--slate)' }}>Aucun paiement enregistré</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links - Structure Intacte */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginTop:16 }}>
        {[
          { icon:'📊', label:'Mes notes',   route:'/dashboard/etudiant/notes' },
          { icon:'📅', label:'Mon EDT',      route:'/dashboard/etudiant/edt' },
          { icon:'💳', label:'Paiements',   route:'/dashboard/etudiant/paiements' },
          { icon:'📄', label:'Documents',   route:'/dashboard/etudiant/documents' },
          { icon:'🔒', label:'Mes examens', route:'/dashboard/etudiant/examens' },
        ].map((l)=>(
          <div key={l.route} onClick={()=>navigate(l.route)}
            style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:10,padding:'14px',textAlign:'center',cursor:'pointer',transition:'all .15s' }}>
            <div style={{ fontSize:'1.6rem',marginBottom:7 }}>{l.icon}</div>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.78rem',color:'var(--ink)' }}>{l.label}</div>
          </div>
        ))}
      </div>
    </DashLayout>
  )
}
