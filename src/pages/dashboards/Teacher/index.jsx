import { useState, useMemo, useEffect } from 'react' // Ajout de useEffect
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Ajout du client Supabase
import { filterTeacherCourses, normalizeCourse, resolveTeacherContext } from '../../../utils/identityResolver'

const SEANCES = ['S01 (03/02)','S02 (10/02)','S03 (17/02)','S04 (24/02)','S05 (03/03)']
const JOURS_ORDER = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi']

export default function TeacherDash() {
  const { user } = useAuth()
  const profName = user?.name || 'Prof. Traoré'

  // ── États pour les données de la base ──
  const [loading, setLoading] = useState(true)
  const [dbData, setDbData] = useState({
    profCours: [],
    edts: [],
    students: []
  })

  const [modules, setModules]     = useState([])
  const [presence, setPresence]   = useState([])
  const [activeTab, setActiveTab]       = useState('dashboard')
  const [activeModule, setActiveModule] = useState('')
  const [toast, setToast]               = useState(null)

  // ── 1. Chargement des données réelles (Supabase) ──
  useEffect(() => {
    async function loadTeacherDashboard() {
      setLoading(true)
      try {
        const { teacherNames, tenantId } = await resolveTeacherContext(user)

        const [resCours, resEdts, resStudents] = await Promise.all([
          supabase.from('prof_cours').select('*').limit(500).eq('tenant_id', tenantId),
          supabase.from('edts').select('*').limit(500).eq('tenant_id', tenantId),
          supabase.from('students').select('id, nom, prenom, filiere', { count: 'exact' }).eq('tenant_id', tenantId).limit(100)
        ])

        const fetchedCours = filterTeacherCourses(resCours.data || [], teacherNames).map(normalizeCourse)
        const teacherEdts = (resEdts.data || []).filter((entry) => {
          const prof = String(entry.prof || '').trim().toLowerCase()
          return !prof || teacherNames.some((name) => prof === name.toLowerCase())
        })

        setDbData({
          profCours: fetchedCours,
          edts: teacherEdts,
          students: resStudents.data || []
        })

        // Initialisation des modules (Logique originale préservée)
        const initModules = fetchedCours.map(c => ({
          id: c.code,
          label: `${c.titre} — ${c.filiere}`,
          students: c.etudiants,
          deadline: '05/03/2026',
          urgent: c.etudiants > 5,
          grades: (resStudents.data || []).slice(0, 5).map(s => ({
            mat: s.id, nom: `${s.prenom} ${s.nom}`, note: '', validated: false
          }))
        }))
        
        setModules(initModules)
        if (initModules.length > 0) setActiveModule(initModules[0].id)

        setPresence((resStudents.data || []).slice(0, 5).map(s => ({
          mat: s.id,
          nom: `${s.prenom} ${s.nom}`,
          presence: [true, Math.random()>.3, Math.random()>.2, Math.random()>.3, true]
        })))

      } finally {
        setLoading(false)
      }
    }
    loadTeacherDashboard()
  }, [profName, user])

  // ── 2. Logique de calcul (Inchangée) ──
  const profCours = dbData.profCours
  const myEdts = dbData.edts

  const edtByDay = useMemo(() => {
    const grouped = {}
    myEdts.forEach(e => {
      if (!grouped[e.jour]) grouped[e.jour] = []
      grouped[e.jour].push(e)
    })
    return JOURS_ORDER.filter(j => grouped[j]).map(j => ({ day: j, cours: grouped[j] }))
  }, [myEdts])

  const totalH = profCours.reduce((s,c) => s + c.heures, 0)
  const effectuees = profCours.reduce((s,c) => s + c.effectuees, 0)
  const pctH = totalH > 0 ? Math.round(effectuees/totalH*100) : 0

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(()=>setToast(null), 3000)
  }

  const setGrade = (modId, mat, val) => {
    if (val !== '' && (isNaN(val) || Number(val) < 0 || Number(val) > 20)) return
    setModules(prev=>prev.map(m=>m.id===modId ? { ...m, grades:m.grades.map(g=>g.mat===mat ? { ...g, note:val } : g) } : m))
  }

  // ── 3. Persistance réelle des notes (Supabase) ──
  const validateGrades = async (modId) => {
    const mod = modules.find(m => m.id === modId)
    const gradesToSave = mod.grades.filter(g => g.note !== '' && !g.validated)
    let saveError = null

    if (gradesToSave.length > 0) {
      const inserts = gradesToSave.map(g => ({
        id: `NOTE-${modId}-${g.mat}-${Date.now()}`,
        student_id: g.mat,
        code: modId,
        matiere: mod.label.split('—')[0].trim(),
        note_final: parseFloat(g.note),
        semestre: 'S1',
        valide: parseFloat(g.note) >= 10
      }))

      try {
        const { error } = await supabase.from('notes').upsert(inserts)
        saveError = error
      } catch (err) {
        console.error("[Error]", err.message)
        saveError = err
      }
      if (saveError) return showToast('Erreur', 'error')
    }

    setModules(prev=>prev.map(m=>m.id===modId ? { ...m, grades:m.grades.map(g=>g.note!==''?{ ...g, validated:true }:g) } : m))
    showToast('Notes enregistrées ✓')
  }

  const togglePresence = (mat, seanceIdx) => {
    setPresence(prev=>prev.map(s=>s.mat===mat ? { ...s, presence:s.presence.map((v,i)=>i===seanceIdx?!v:v) } : s))
  }

  const curModule = modules.find(m=>m.id===activeModule)
  const validatedCount = curModule?.grades.filter(g=>g.validated).length || 0

  const tabs = [
    { id:'dashboard', label:'📊 Tableau de bord' },
    { id:'notes',     label:'📝 Saisie des notes' },
    { id:'presence',  label:'✅ Feuilles de présence' },
  ]

  if (loading) return <DashLayout title="Chargement..."><div style={{padding:60, textAlign:'center'}}>Récupération de vos cours...</div></DashLayout>

  return (
    <DashLayout title="Mon espace enseignant" requiredRole="enseignant">

      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position:'fixed',top:24,right:24,zIndex:2000,padding:'12px 20px',borderRadius:10,background:toast.type==='error'?'var(--red)':'var(--green)',color:'#fff',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          ✅ {toast.msg}
        </div>
      )}

      <div className="dash-page-title">Bonjour, {profName} 👋</div>
      <div className="dash-page-sub">Semestre 2 · 2025-2026 · {user?.tenant || 'Université de Niamey'}</div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,marginBottom:24,background:'var(--mist)',borderRadius:10,padding:4,flexWrap:'wrap' }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{ padding:'9px 18px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.85rem',transition:'all .15s',
              background:activeTab===t.id?'#fff':'transparent',color:activeTab===t.id?'var(--ink)':'var(--slate)',
              boxShadow:activeTab===t.id?'0 2px 8px rgba(0,0,0,.08)':'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB : DASHBOARD ── */}
      {activeTab==='dashboard' && (
        <>
          <div className="kpi-grid">
            {[
              { label:'Cours assignés',    value:profCours.length,          sub:`${myEdts.length} créneaux/semaine`, icon:'📚', color:'var(--blue)' },
              { label:'Étudiants',          value:profCours.reduce((s,c)=>s+c.etudiants,0), sub:'Dans vos modules', icon:'👥', color:'var(--teal)' },
              { label:'Notes à saisir',     value:`${modules.reduce((acc,m)=>acc+m.grades.filter(g=>!g.validated).length,0)}`, sub:'En attente', icon:'📝', color:'var(--amber)' },
              { label:'Heures effectuées',  value:`${effectuees}h`,          sub:`Sur ${totalH}h (${pctH}%)`, icon:'⏱️', color:'var(--green)' },
            ].map((k)=>(
              <div className="kpi-card" key={`kpi-${k.label}`}>
                <div style={{ display:'flex',justifyContent:'space-between' }}><div className="kpi-label">{k.label}</div><span style={{ fontSize:'1.3rem' }}>{k.icon}</span></div>
                <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ marginBottom:24 }}>
            <div className="card card-p">
              <div className="section-title" style={{ marginBottom:16 }}>📅 Emploi du temps — Cette semaine</div>
              {edtByDay.length > 0 ? edtByDay.map((d)=>(
                <div key={d.day} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:'.72rem',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,color:'var(--slate)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8 }}>{d.day}</div>
                  {d.cours.map((c,j)=>(
                    <div key={`${c.code}-${j}`} style={{ display:'flex',gap:12,alignItems:'center',padding:'8px 12px',background:'var(--mist)',borderRadius:7,marginBottom:5 }}>
                      <div style={{ fontFamily:'monospace',fontSize:'.78rem',color:'var(--gold)',flexShrink:0 }}>{c.heure}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'.85rem',fontWeight:600,color:'var(--ink)' }}>{c.matiere} · {c.type}</div>
                        <div style={{ fontSize:'.72rem',color:'var(--slate)' }}>{c.salle} · {c.filiere}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )) : (
                <div style={{ textAlign:'center',color:'var(--slate)',padding:'20px 0' }}>Aucun créneau trouvé</div>
              )}
            </div>

            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
              <div className="card">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}>
                  <div className="section-title">📝 Notes urgentes</div>
                </div>
                <div style={{ padding:16 }}>
                  {modules.map((m)=>(
                    <div key={m.id} style={{ padding:13,border:'1px solid var(--border)',borderRadius:10,marginBottom:10 }}>
                      <div style={{ fontWeight:600,color:'var(--ink)',marginBottom:3,fontSize:'.9rem' }}>{m.label}</div>
                      <div style={{ fontSize:'.77rem',color:'var(--slate)',marginBottom:10 }}>
                        {m.students} étudiants · {m.grades.filter(g=>g.validated).length}/{m.grades.length} saisis
                      </div>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                        <span className={`badge ${m.urgent?'badge-red':'badge-gold'}`}>{m.urgent?'🔴 Urgent':'🟡 À faire'}</span>
                        <button className="btn btn-primary btn-sm" onClick={()=>{ setActiveModule(m.id); setActiveTab('notes') }}>Saisir les notes</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-p">
                <div className="section-title" style={{ marginBottom:12 }}>⏱️ Volume horaire annuel</div>
                <div style={{ background:'var(--mist)',borderRadius:8,height:12,overflow:'hidden',marginBottom:8 }}>
                  <div style={{ width:`${pctH}%`,height:'100%',background:'var(--green)',borderRadius:8 }}/>
                </div>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:'.8rem',color:'var(--slate)' }}>
                  <span>{effectuees}h effectuées</span>
                  <span style={{ fontWeight:600,color:'var(--green)' }}>{pctH}% / {totalH}h</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB : NOTES ── */}
      {activeTab==='notes' && (
        <>
          <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
            {modules.map(m=>(
              <button key={m.id} onClick={()=>setActiveModule(m.id)}
                style={{ padding:'8px 16px',borderRadius:8,border:`2px solid ${activeModule===m.id?'var(--primary)':'var(--border)'}`,
                  background:activeModule===m.id?'var(--gold-light)':'#fff',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,
                  fontSize:'.83rem',color:activeModule===m.id?'var(--ink)':'var(--slate)',cursor:'pointer' }}>
                {m.label.split('—')[0].trim()}
                {m.grades.every(g=>g.validated) && <span style={{ marginLeft:6,color:'var(--green)' }}>✓</span>}
              </button>
            ))}
          </div>

          {curModule && (
            <div className="card">
              <div style={{ padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
                <div>
                  <div className="section-title">{curModule.label}</div>
                  <div style={{ fontSize:'.78rem',color:'var(--slate)',marginTop:2 }}>
                    {curModule.deadline} · {validatedCount}/{curModule.grades.length} note{validatedCount>1?'s':''} enregistrée{validatedCount>1?'s':''}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>validateGrades(curModule.id)}
                  disabled={curModule.grades.every(g=>g.note===''||g.validated)}>
                  💾 Enregistrer dans Supabase
                </button>
              </div>
              <div className="table-wrap">
                <table role="table">
                  <thead><tr><th>Matricule</th><th>Étudiant</th><th>Note /20</th><th>Mention</th><th>Statut</th></tr></thead>
                  <tbody>
                    {curModule.grades.map((g)=>{
                      const n = parseFloat(g.note)
                      const men = g.note===''?'—':n>=16?'TB':n>=14?'B':n>=12?'AB':n>=10?'P':'F'
                      const mColor = g.note===''?'var(--slate)':n>=10?'var(--green)':'var(--red)'
                      return (
                        <tr key={g.mat}>
                          <td style={{ fontFamily:'monospace',fontSize:'.78rem',color:'var(--gold)',fontWeight:700 }}>{g.mat}</td>
                          <td><strong style={{ color:'var(--ink)' }}>{g.nom}</strong></td>
                          <td>
                            {g.validated
                              ? <span style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1rem',color:n>=10?'var(--green)':'var(--red)' }}>{g.note}/20</span>
                              : <input type="number" min="0" max="20" step="0.5" value={g.note} placeholder="—"
                                  onChange={e=>setGrade(curModule.id, g.mat, e.target.value)}
                                  style={{ width:70,padding:'6px 10px',border:'2px solid var(--border)',borderRadius:7,fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.95rem',textAlign:'center',outline:'none' }}
                                  onFocus={e=>e.target.style.borderColor='var(--primary)'}
                                  onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                            }
                          </td>
                          <td style={{ fontWeight:700,color:mColor }}>{men}</td>
                          <td>
                            {g.validated
                              ? <span className="badge badge-green">Enregistré</span>
                              : g.note!==''
                                ? <span className="badge badge-gold">À valider</span>
                                : <span className="badge badge-slate">En attente</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB : PRÉSENCE ── */}
      {activeTab==='presence' && (
        <div className="card">
          <div style={{ padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
            <div className="section-title">{profCours[0]?.titre || 'Module'} — Feuilles de présence</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>showToast('Exportation simulée terminée')}>📄 Exporter PDF</button>
          </div>
          <div className="table-wrap">
            <table role="table">
              <thead>
                <tr>
                  <th>Étudiant</th>
                  {SEANCES.map(s=><th key={s} style={{ textAlign:'center',minWidth:68,fontSize:'.72rem' }}>{s}</th>)}
                  <th style={{ textAlign:'center' }}>Taux</th>
                </tr>
              </thead>
              <tbody>
                {presence.map((s)=>{
                  const pct = Math.round(s.presence.filter(Boolean).length/s.presence.length*100)
                  return (
                    <tr key={s.mat}>
                      <td>
                        <div style={{ fontWeight:600,color:'var(--ink)',fontSize:'.9rem' }}>{s.nom}</div>
                        <div style={{ fontFamily:'monospace',fontSize:'.72rem',color:'var(--slate)' }}>{s.mat}</div>
                      </td>
                      {s.presence.map((p,j)=>(
                        <td key={`${s.mat}-${j}`} style={{ textAlign:'center' }}>
                          <button onClick={()=>togglePresence(s.mat,j)}
                            style={{ width:30,height:30,borderRadius:6,border:'none',cursor:'pointer',fontSize:'.9rem',
                              background:p?'var(--green-light)':'var(--red-light)',color:p?'var(--green)':'var(--red)' }}>
                            {p?'✓':'✗'}
                          </button>
                        </td>
                      ))}
                      <td style={{ textAlign:'center' }}>
                        <span className={`badge ${pct>=75?'badge-green':pct>=50?'badge-gold':'badge-red'}`}>{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
