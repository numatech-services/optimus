import { useState, useEffect, useMemo } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { resolveStudentContext } from '../../../utils/identityResolver'

// ── Constantes de Structure (Design 100% Intact) ──────────
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi']
const HEURE_ORDER = ['07h30-09h30','09h30-11h30','11h30-13h30','14h00-16h00','16h00-18h00']
const COLORS = ['#4361ee','#3a86ff','#e85d04','#588157','#9b5de5','#f72585','#00b4d8','#fb8500']
const TYPE_COLOR = { CM:'var(--blue)', TD:'var(--teal)', TP:'var(--amber)' }

export default function StudentEDT() {
  const { user } = useAuth()
  
  // ── États des données Supabase ──
  const [loading, setLoading] = useState(true)
  const [dbData, setDbData] = useState({
    student: null,
    edts: [],
    weeks: []
  })
  
  // ── États UI ──
  const [semaineIdx, setSemaineIdx] = useState(0)

  const matricule = user?.matricule

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchStudentSchedule()
  }, [user, matricule])

  const fetchStudentSchedule = async () => {
    setLoading(true)
    try {
      const { student, filiere, tenantId } = await resolveStudentContext(user)

      if (!student) {
        setDbData({ student: null, edts: [], weeks: [] })
        return
      }

      // Récupération parallèle : Profil Étudiant + Emploi du temps + Calendrier des semaines
      const [resEdts, resWeeks] = await Promise.all([
        supabase.from('edts').select('*').limit(500).eq('tenant_id', tenantId),
        supabase.from('academic_weeks').select('*').limit(500).eq('tenant_id', tenantId).order('week_number', { ascending: true })
      ])

      setDbData({
        student,
        // On filtre l'EDT par la filière de l'étudiant
        edts: (resEdts.data || []).filter(e => e.filiere === (student?.filiere || filiere)),
        weeks: resWeeks.data || []
      })
    } catch (err) {
      console.error("Erreur de synchronisation EDT Supabase:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE DE CONSTRUCTION (Mappage intégral) ──
  const filiere = dbData.student?.filiere || 'Chargement...'
  const edts = dbData.edts
  const currentWeek = dbData.weeks[semaineIdx] || { label: '...', dates: [] }

  // Construction de la grille : heure × jour
  const grid = useMemo(() => {
    const _grid = {}
    HEURE_ORDER.forEach(h => {
      _grid[h] = {}
      JOURS.forEach(j => { _grid[h][j] = null })
    })
    edts.forEach(e => {
      if (_grid[e.heure]) _grid[e.heure][e.jour] = e
    })
    return _grid
  }, [edts])

  // Carte des couleurs persistantes par code de matière
  const colorMap = useMemo(() => {
    const _map = {}
    const uniqueCodes = [...new Set(edts.map(e => e.code))]
    uniqueCodes.forEach((code, i) => { 
      _map[code] = COLORS[i % COLORS.length] 
    })
    return _map
  }, [edts])

  const matieresUnique = useMemo(() => [...new Set(edts.map(e => e.matiere))], [edts])

  if (loading) return <DashLayout title="EDT"><div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)'}}>Chargement de votre emploi du temps personnalisé...</div></DashLayout>

  return (
    <DashLayout title="Emploi du temps" requiredRole="etudiant">
      <div className="dash-page-title">📅 Emploi du temps</div>
      <div className="dash-page-sub">{filiere} · Matricule : {matricule} · Session</div>

      {/* Sélecteur de Semaine - Design d'origine */}
      <div style={{ display:'flex',gap:8,marginBottom:20,flexWrap:'wrap', alignItems:'center' }}>
        {dbData.weeks.map((s,i) => (
          <button key={s.id} onClick={() => setSemaineIdx(i)}
            style={{ padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.82rem',
              background: semaineIdx===i ? 'var(--ink)' : 'var(--mist)',
              color: semaineIdx===i ? '#fff' : 'var(--slate)',
              transition:'all 0.2s' }}>
            {s.label}
          </button>
        ))}
        
        {/* Légende type de cours */}
        <div style={{ marginLeft:'auto',display:'flex',gap:12,alignItems:'center', background:'var(--mist)', padding:'8px 14px', borderRadius:10 }}>
          {Object.entries(TYPE_COLOR).map(([t,c]) => (
            <span key={t} style={{ fontSize:'.75rem',display:'flex',alignItems:'center',gap: 4, fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700 }}>
              <span style={{ width:10,height:10,borderRadius:2,background:c }}/>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Grille Principale - Design Intact */}
      <div className="card" style={{ overflowX:'auto',marginBottom:20 }}>
        <table role="table" style={{ width:'100%',borderCollapse:'collapse',minWidth:850 }}>
          <thead>
            <tr style={{ background:'var(--ink)' }}>
              <th style={{ padding:'12px 16px',color:'var(--gold)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'.75rem',textAlign:'left',width:120, borderBottom:'1px solid rgba(255,255,255,0.1)' }}>Horaire</th>
              {JOURS.map((j,i) => (
                <th key={j} style={{ padding:'12px 12px',color:'rgba(255,255,255,.9)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.78rem',textAlign:'center', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
                  <div>{j}</div>
                  <div style={{ fontSize:'.65rem',color:'rgba(255,255,255,.4)',fontWeight:400,marginTop:2 }}>
                    {currentWeek.dates[i] || '--/--'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEURE_ORDER.map((h) => (
              <tr key={h} style={{ borderBottom:'1px solid var(--border-light)' }}>
                <td style={{ padding:'8px 16px',background:'var(--mist)',fontSize:'.75rem',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,color:'var(--slate)',verticalAlign:'middle',borderRight:'2px solid var(--border)' }}>
                  {h}
                </td>
                {JOURS.map(j => {
                  const cours = grid[h][j]
                  if (!cours) return (
                    <td key={j} style={{ padding:6,verticalAlign:'top' }}>
                      <div style={{ height:75,border:'1px dashed var(--border)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center' }}>
                        <span style={{ fontSize:'.65rem',color:'#d0d8e4' }}>—</span>
                      </div>
                    </td>
                  )
                  
                  const col = colorMap[cours.code] || 'var(--blue)'
                  return (
                    <td key={j} style={{ padding:6,verticalAlign:'top' }}>
                      <div style={{ 
                        background:col+'12', 
                        border:`1.5px solid ${col}30`, 
                        borderLeft:`3px solid ${col}`, 
                        borderRadius:6, padding:'7px 10px', height:75, overflow:'hidden',
                        display:'flex', flexDirection:'column', justifyContent:'space-between'
                      }}>
                        <div>
                          <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'.68rem',color:col,marginBottom:1 }}>{cours.code}</div>
                          <div style={{ fontSize:'.72rem',fontWeight:700,color:'var(--ink)',lineHeight:1.1,marginBottom:4 }}>{cours.matiere}</div>
                        </div>
                        
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                          <span style={{ fontSize:'.62rem',color:'var(--slate)', fontWeight:600 }}>🏫 {cours.salle}</span>
                          <span style={{ background:TYPE_COLOR[cours.type]+'22',color:TYPE_COLOR[cours.type],padding:'1px 5px',borderRadius:4,fontSize:'.6rem',fontWeight:800 }}>{cours.type}</span>
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Légende détaillée en bas - Design Intact */}
      <div className="card card-p">
        <div className="section-title" style={{ marginBottom:14 }}>📚 Détails des enseignements — {filiere}</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12 }}>
          {matieresUnique.map((m,i) => {
            const sample = edts.find(e => e.matiere === m)
            if (!sample) return null
            const col = colorMap[sample.code]
            return (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:10,background:'var(--mist)',borderLeft:`4px solid ${col}`, transition:'transform 0.2s' }}>
                <div style={{flex:1}}>
                  <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'.82rem',color:'var(--ink)' }}>{sample.code} — {m}</div>
                  <div style={{ fontSize:'.72rem',color:'var(--slate)',marginTop:4, display:'flex', justifyContent:'space-between' }}>
                    <span>👤 {sample.prof || 'Enseignant'}</span>
                    <span style={{fontWeight:700}}>{edts.filter(e=>e.code===sample.code).length * 2}h / semaine</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </DashLayout>
  )
}
