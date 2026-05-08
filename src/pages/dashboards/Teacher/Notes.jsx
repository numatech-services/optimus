import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { calculateGrade } from '../../../utils/gradeCalculator'
import { notifyGradesAdded } from '../../../utils/notificationService'
import { exportCSV, parseCSV } from '../../../hooks/useExportData'
import { notifyEvent } from '../../../utils/pushService' // Client Supabase réel
import { filterTeacherCourses, normalizeCourse, resolveTeacherContext } from '../../../utils/identityResolver'

export default function TeacherNotes() {
  const { user } = useAuth()
  const profName = user?.name || 'Prof. Traoré'

  // ── États des données Supabase ──
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState([]) // Chargé depuis prof_cours + students
  const [active, setActive]   = useState('') // Code du module actif
  const [saved, setSaved]     = useState({})
  const [toast, setToast]     = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── 1. CHARGEMENT INITIAL (Zéro Omission) ──
  useEffect(() => {
    fetchTeacherData()
  }, [profName, user])

  const fetchTeacherData = async () => {
    setLoading(true)
    try {
      const { teacherNames, tenantId } = await resolveTeacherContext(user)

      // A. Récupérer les cours de ce professeur
      const { data: resCours } = await supabase
        .from('prof_cours')
        .select('*')
        .limit(500)
        .eq('tenant_id', tenantId)

      // B. Récupérer tous les étudiants pour le mapping des filières
      const { data: resStudents } = await supabase
        .from('students')
        .select('id, nom, prenom, filiere')
        .eq('tenant_id', tenantId)

      // C. Récupérer les notes déjà saisies
      const { data: resNotes } = await supabase
        .from('notes')
        .select('*')
        .limit(500)
        .eq('tenant_id', tenantId)

      const teacherCourses = filterTeacherCourses(resCours || [], teacherNames).map(normalizeCourse)

      if (teacherCourses.length && resStudents) {
        const assembledModules = teacherCourses.map(c => {
          // Filtrer les étudiants qui appartiennent à la filière du cours
          const moduleStudents = resStudents
            .filter(s => s.filiere === c.filiere)
            .map(s => ({ mat: s.id, nom: `${s.prenom} ${s.nom}` }))

          // Récupérer les notes pour ce module précis
          const moduleGrades = {}
          moduleStudents.forEach(s => {
            const existingNote = resNotes?.find(n => n.student_id === s.mat && n.code === c.code)
            moduleGrades[s.mat] = existingNote ? existingNote.note_final.toString() : ''
          })

          return {
            id: c.code,
            label: `${c.titre} — ${c.filiere}`,
            deadline: '15/03/2026', // Date simulée (Design Intact)
            urgent: moduleStudents.length > 5,
            students: moduleStudents,
            grades: moduleGrades
          }
        })

        setModules(assembledModules)
        if (assembledModules.length > 0) setActive(assembledModules[0].id)
      }
    } catch (err) {
      console.error("Erreur Saisie Notes Supabase:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE DE SAISIE (Design Intact) ──
  const mod = useMemo(() => modules.find(m => m.id === active), [modules, active])

  const setGrade = (mat, val) => {
    if (val !== '' && (isNaN(val) || +val < 0 || +val > 20)) return
    setModules(prev => prev.map(m => 
      m.id === active ? { ...m, grades: { ...m.grades, [mat]: val } } : m
    ))
  }

  const saveGrades = async () => {
    if (!mod) return
    let saveError = null
    
    // Charger la config notation du tenant
    let notationConfig = null
    try {
      const { data: config } = await supabase
        .from('tenant_config')
        .select('systeme_notation')
        .eq('tenant_id', user?.tenant_id)
        .single()
      if (config?.systeme_notation) notationConfig = config.systeme_notation
    } catch { /* utilise les defaults du gradeCalculator */ }

    // Préparer les données avec calcul automatique
    const updates = Object.entries(mod.grades)
      .filter(([_, note]) => note !== '')
      .map(([mat, note]) => {
        const noteVal = parseFloat(note)
        // Calcul automatique via gradeCalculator si config dispo
        const result = calculateGrade(noteVal, noteVal, notationConfig || undefined) // CC = Exam pour saisie unique
        return {
          id: `NOTE-${active}-${mat}`,
          student_id: mat,
          code: active,
          matiere: mod.label.split('—')[0].trim(),
          note_cc: noteVal,
          note_examen: noteVal,
          note_final: result.noteFinal,
          mention: result.mention,
          semestre: 'S1',
          valide: result.valide,
          tenant_id: user?.tenant_id,
        }
      })

    if (updates.length === 0) return showToast("Aucune note à enregistrer", "error")

    try {
      const { error } = await supabase.from('notes').upsert(updates)
      saveError = error
    } catch (err) {
      console.error("[Error]", err.message)
      saveError = err
    }

    if (!saveError) {
      setSaved(p => ({ ...p, [active]: true }))
      showToast(`${updates.length} notes enregistrées — mentions calculées automatiquement ✓`)
      // Notifier les étudiants si > 5 notes saisies (bulk)
      if (updates.length >= 5) {
        notifyEvent('grade_published', { matiere: mod.label.split('—')[0].trim() })
        notifyGradesAdded(
          updates.map(u => ({ id: u.student_id, prenom: u.student_id, email: '' })),
          mod.label.split('—')[0].trim(),
          'Université', user?.tenant_id
        ).catch(() => {})
      }
    } else {
      showToast("Erreur: " + saveError.message, "error")
    }
  }

  const getMention = n => {
    if (n === '' || n === undefined) return '—'
    const v = parseFloat(n)
    if (isNaN(v)) return '—'
    return v >= 16 ? 'TB' : v >= 14 ? 'B' : v >= 12 ? 'AB' : v >= 10 ? 'P' : v >= 8 ? 'R' : 'AJ'
  }
  
  const avg = useMemo(() => {
    if (!mod) return 0
    const values = Object.values(mod.grades).filter(v => v !== '')
    if (values.length === 0) return 0
    return (values.reduce((s, v) => s + parseFloat(v), 0) / values.length).toFixed(1)
  }, [mod])

  if (loading) return <DashLayout title="Notes">
    <div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)'}}>
      Chargement de la liste d'appel et des carnets de notes...
    </div>
  </DashLayout>

  return (
    <DashLayout title="Saisie de notes" requiredRole="enseignant">
      
      {/* Toast - Design d'origine */}
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{position:'fixed',top:24,right:24,zIndex:2000,padding:'12px 20px',borderRadius:10,background:'var(--green)',color:'#fff',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 24px rgba(0,0,0,.2)'}}>
          ✅ {toast}
        </div>
      )}

      <div className="dash-page-title">Saisie des Notes</div>
      <div className="dash-page-sub">{profName} · Session 2025-2026 · Live</div>

      {/* Sélecteur de Modules - Design d'origine */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {modules.map(m => (
          <button key={m.id} onClick={() => setActive(m.id)}
            style={{
              padding:'9px 14px', borderRadius:9, border:`2px solid ${active===m.id ? 'var(--primary)' : 'var(--border)'}`,
              background:active===m.id ? 'var(--gold-light)' : '#fff', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700,
              fontSize:'.82rem', color:active===m.id ? 'var(--ink)' : 'var(--slate)', cursor:'pointer', textAlign:'left'
            }}>
            <div>{m.label.split('—')[0].trim()}</div>
            <div style={{fontWeight:400, fontSize:'.7rem', marginTop:2, color:m.urgent ? 'var(--red)' : 'var(--slate)'}}>
              {m.urgent ? '🔴 ' : ''}{m.deadline} {saved[m.id] && '✅'}
            </div>
          </button>
        ))}
      </div>

      {mod && (
        <>
          {/* Statistiques du module - Design d'origine */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {[
              {label:'Moyenne générale', value:avg + '/20', color:'var(--blue)'},
              {label:'Inscrits', value:mod.students.length, color:'var(--ink)'},
              {label:'Saisie effectuée', value: `${Object.values(mod.grades).filter(v=>v!=='').length}/${mod.students.length}`, color:'var(--green)'},
              {label:'Date limite', value: mod.deadline, color:'var(--amber)'},
            ].map((k,i)=>(
              <div key={i} style={{background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px'}}>
                <div style={{fontSize:'.73rem', color:'var(--slate)', marginBottom:4}}>{k.label}</div>
                <div style={{fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.1rem', color:k.color}}>{k.value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            {/* Header Carte - Design d'origine */}
            <div style={{padding:'14px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div className="section-title">{mod.label}</div>
                <div style={{fontSize:'.78rem', color:'var(--slate)', marginTop:2}}>
                  Édition en temps réel · Sauvegarde sécurisée base
                  {avg > 0 && <span style={{marginLeft:10, fontWeight:600, color:'var(--blue)'}}>Moyenne session: {avg}/20</span>}
                </div>
              </div>
              <button className="btn btn-primary" onClick={saveGrades} disabled={Object.values(mod.grades).every(v=>v==='')}>
                💾 Enregistrer les notes
              </button>
            </div>

            {/* Tableau de saisie - Design d'origine */}
            <div className="table-wrap">
              <table role="table">
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Étudiant</th>
                    <th>Note /20</th>
                    <th>Mention</th>
                    <th>Décision</th>
                  </tr>
                </thead>
                <tbody>
                  {mod.students.map((s, i) => {
                    const v = mod.grades[s.mat]
                    const n = parseFloat(v)
                    if (isNaN(n) || n < 0 || n > 20) return // Reject invalid grades
                    const mention = getMention(v)
                    return (
                      <tr key={i}>
                        <td style={{fontFamily:'monospace', fontSize:'.78rem', color:'var(--gold)', fontWeight:700}}>{s.mat}</td>
                        <td style={{fontWeight:600, color:'var(--ink)'}}>{s.nom}</td>
                        <td>
                          <input 
                            type="number" min="0" max="20" step="0.5" value={v} placeholder="0–20"
                            onChange={e => setGrade(s.mat, e.target.value)}
                            style={{
                              width:70, padding:'6px 10px', border:'2px solid var(--border)', borderRadius:7, 
                              fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.95rem', textAlign:'center', outline:'none'
                            }}
                            onFocus={e => e.target.style.borderColor='var(--primary)'}
                            onBlur={e => e.target.style.borderColor='var(--border)'}
                          />
                        </td>
                        <td style={{fontWeight:700, color: v === '' ? 'var(--slate)' : n >= 10 ? 'var(--green)' : 'var(--red)'}}>
                          {mention}
                        </td>
                        <td>
                          {v === '' ? (
                            <span className="badge badge-slate">—</span>
                          ) : (
                            <span className={`badge ${n >= 10 ? 'badge-green' : 'badge-red'}`}>
                              {n >= 10 ? 'Admis' : 'Ajourné'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashLayout>
  )
}
