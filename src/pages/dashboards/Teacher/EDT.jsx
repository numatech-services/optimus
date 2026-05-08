import { useState, useEffect, useMemo } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Client Supabase réel
import { filterTeacherCourses, normalizeCourse, resolveTeacherContext } from '../../../utils/identityResolver'

// ── Constantes de Structure (Design 100% Intact) ──────────
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi']
const HEURES = ['07h30-09h30','09h30-11h30','11h30-13h30','14h00-16h00','16h00-18h00']
const COLORS = ['#4361ee','#e85d04','#588157','#9b5de5','#f72585']

export default function TeacherEDT() {
  const { user } = useAuth()
  
  // ── États des données Supabase ──
  const [weeks, setWeeks] = useState([]) // Chargé depuis academic_weeks
  const [dbEdts, setDbEdts] = useState([])
  const [courseCodes, setCourseCodes] = useState([])
  
  // ── États UI ──
  const [semaineIdx, setSemaineIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  const profName = user?.name || 'Prof. Traoré'

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchCompleteSchedule()
  }, [profName, user])

  const fetchCompleteSchedule = async () => {
    setLoading(true)
    try {
      const { teacherNames, tenantId } = await resolveTeacherContext(user)

      // On récupère tout en parallèle : Semaines + Cours du prof + EDT
      const [resWeeks, resCours, resEdts] = await Promise.all([
        supabase.from('academic_weeks').select('*').limit(500).eq('tenant_id', tenantId).order('week_number', { ascending: true }),
        supabase.from('prof_cours').select('*').limit(500).eq('tenant_id', tenantId),
        supabase.from('edts').select('*').limit(500).eq('tenant_id', tenantId)
      ])

      if (resWeeks.data) setWeeks(resWeeks.data)
      
      const teacherCourses = filterTeacherCourses(resCours.data || [], teacherNames).map(normalizeCourse)
      const codes = teacherCourses.map(c => c.code)
      setCourseCodes(codes)

      if (resEdts.data) {
        setDbEdts(
          resEdts.data.filter((entry) => {
            const prof = String(entry.prof || '').trim().toLowerCase()
            return !prof || teacherNames.some((name) => prof === name.toLowerCase())
          })
        )
      }

    } catch (err) {
      console.error("Erreur Sync EDT Enseignant:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE DE CONSTRUCTION DE LA GRILLE (Design Intact) ──
  const { grid, colorMap } = useMemo(() => {
    const _grid = {}
    HEURES.forEach(h => { 
      _grid[h] = {}
      JOURS.forEach(j => { _grid[h][j] = null }) 
    })

    dbEdts.forEach(e => { 
      if (_grid[e.heure]) {
        _grid[e.heure][e.jour] = e 
      }
    })

    const _colorMap = {}
    courseCodes.forEach((code, i) => { 
      _colorMap[code] = COLORS[i % COLORS.length] 
    })

    return { grid: _grid, colorMap: _colorMap }
  }, [dbEdts, courseCodes])

  // Sécurité pour éviter les erreurs si les semaines ne sont pas encore chargées
  const currentWeek = weeks[semaineIdx] || { label: 'Chargement...', dates: [] }

  if (loading) return <DashLayout title="Mon EDT">
    <div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)'}}>
      Synchronisation de votre agenda académique...
    </div>
  </DashLayout>

  return (
    <DashLayout title="Mon EDT" requiredRole="enseignant">
      <div className="dash-page-title">📅 Mon emploi du temps</div>
      <div className="dash-page-sub">{profName} · {dbEdts.length} créneaux · {weeks.length} semaines chargées</div>

      {/* Onglets Semaines - Dynamiques via academic_weeks */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {weeks.map((s, i) => (
          <button key={s.id} onClick={() => setSemaineIdx(i)}
            style={{ 
              padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.82rem',
              background: semaineIdx === i ? 'var(--ink)' : 'var(--mist)',
              color: semaineIdx === i ? '#fff' : 'var(--slate)',
              transition: 'all 0.2s'
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Table EDT - Design 100% Intact (Noir & Or) */}
      <div className="card" style={{ overflowX:'auto', marginBottom:20 }}>
        <table role="table" style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
          <thead>
            <tr style={{ background:'var(--ink)' }}>
              <th style={{ padding:'10px 16px', color:'var(--gold)', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.75rem', textAlign:'left', width:120 }}>Horaire</th>
              {JOURS.map((j, i) => (
                <th key={j} style={{ padding:'10px 12px', color:'rgba(255,255,255,.9)', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.78rem', textAlign:'center' }}>
                  <div>{j}</div>
                  <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.5)', marginTop:2 }}>
                    {currentWeek.dates[i] || '--/--'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEURES.map(h => (
              <tr key={h} style={{ borderBottom:'1px solid var(--border-light)' }}>
                <td style={{ padding:'8px 16px', background:'var(--mist)', fontSize:'.75rem', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)', borderRight:'2px solid var(--border)' }}>
                  {h}
                </td>
                {JOURS.map(j => {
                  const e = grid[h][j]
                  if (!e) return (
                    <td key={j} style={{ padding:6 }}>
                      <div style={{ height:72, border:'1px dashed var(--border)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:'.65rem', color:'#d0d8e4' }}>—</span>
                      </div>
                    </td>
                  )
                  
                  const col = colorMap[e.code] || '#4361ee'
                  return (
                    <td key={j} style={{ padding:6 }}>
                      <div style={{ 
                        background: col + '18', 
                        border: `1.5px solid ${col}40`, 
                        borderLeft: `3px solid ${col}`, 
                        borderRadius:6, padding:'6px 8px', height:72, overflow:'hidden' 
                      }}>
                        <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.72rem', color:col }}>{e.code} · {e.type}</div>
                        <div style={{ fontSize:'.7rem', fontWeight:600, color:'var(--ink)', marginBottom:3, lineHeight:1.2 }}>{e.filiere}</div>
                        <div style={{ fontSize:'.62rem', color:'var(--slate)' }}>🏫 {e.salle}</div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* État vide si aucune donnée trouvée */}
      {dbEdts.length === 0 && (
        <div style={{ textAlign:'center', padding:40, color:'var(--slate)' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>📭</div>
          <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700 }}>Emploi du temps vide en base</div>
          <div style={{ fontSize:'.82rem', marginTop:4 }}>Vérifiez les données dans la table 'edts' de votre base de données.</div>
        </div>
      )}
    </DashLayout>
  )
}
