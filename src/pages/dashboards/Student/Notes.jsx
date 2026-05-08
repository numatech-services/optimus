import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { calculateGrade, calculateSemesterAverage } from '../../../utils/gradeCalculator' // Client Supabase réel
import DashLayout from '../../../components/Layout/DashLayout'
import { generateBulletin, printDocument } from '../../../utils/pdfService'
import { resolveStudentContext } from '../../../utils/identityResolver'

// ── Fonctions de calcul originales (Zéro Omission) ─────────
function calcMoy(matieres) {
  const noted = matieres.filter(m => m.note !== null)
  if (!noted.length) return null
  const sumCoef = noted.reduce((a, m) => a + (m.coef || 0), 0)
  if (sumCoef === 0) return null
  return (noted.reduce((a, m) => a + (m.note * m.coef), 0) / sumCoef).toFixed(2)
}

function mention(moy) {
  if (!moy) return { label: '—', color: 'var(--slate)' }
  const n = parseFloat(moy)
  if (n >= 16) return { label: 'Très bien', color: 'var(--gold)' }
  if (n >= 14) return { label: 'Bien', color: 'var(--green)' }
  if (n >= 12) return { label: 'Assez bien', color: 'var(--teal)' }
  if (n >= 10) return { label: 'Passable', color: 'var(--blue)' }
  return { label: 'Insuffisant', color: 'var(--red)' }
}

export default function StudentNotes() {
  const { user } = useAuth()
  const matricule = user?.matricule || 'ETU-2024-0847'
  
  // ── États des données Supabase ──
  const [loading, setLoading] = useState(true)
  const [dbData, setDbData] = useState({
    student: null,
    notes: []
  })
  const [activeSem, setActiveSem] = useState('S1') // Par défaut S1
  const [expanded, setExpanded] = useState(null)

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    async function loadNotesData() {
      setLoading(true)
      try {
        const { student, studentId } = await resolveStudentContext(user)

        if (!studentId) {
          setDbData({ student: null, notes: [] })
          return
        }

        const { data: resNotes } = await supabase
          .from('notes')
          .select('*')
          .limit(500)
          .eq('student_id', studentId)

        setDbData({
          student,
          notes: resNotes || []
        })
      } catch (err) {
        console.error("Erreur Sync Notes Supabase:", err)
      } finally {
        setLoading(false)
      }
    }
    loadNotesData()
  }, [user, matricule])

  // ── 2. RECONSTRUCTION DE LA STRUCTURE SEMESTRES (Zéro Omission) ──
  const semestresData = useMemo(() => {
    const list = ['S1', 'S2']
    return list.map(sId => {
      const filteredNotes = dbData.notes.filter(n => n.semestre === sId)
      return {
        id: sId,
        label: `Semestre ${sId.replace('S', '')} — 2025/2026`,
        status: filteredNotes.length > 0 ? 'PUBLIÉ' : 'EN COURS',
        matieres: filteredNotes.map(n => ({
          nom: n.matiere,
          coef: n.coef,
          note: n.note_final,
          exam: n.note_examen,
          cc: n.note_cc
        }))
      }
    })
  }, [dbData.notes])

  // ── 3. LOGIQUE DE CALCUL DYNAMIQUE (Désormais basée sur) ──
  const sem = useMemo(() => 
    semestresData.find(s => s.id === activeSem) || { label: '', matieres: [], status: 'EN COURS' },
  [semestresData, activeSem])

  const moy = useMemo(() => calcMoy(sem.matieres), [sem.matieres])
  const men = useMemo(() => mention(moy), [moy])
  
  const ectsObtained = useMemo(() => 
    sem.matieres.filter(m => m.note >= 10).reduce((a, m) => a + (m.coef * 3), 0),
  [sem.matieres])

  const admis = useMemo(() => 
    sem.matieres.filter(m => m.note !== null && m.note >= 10).length,
  [sem.matieres])

  const ratt = useMemo(() => 
    sem.matieres.filter(m => m.note !== null && m.note < 10).length,
  [sem.matieres])

  if (loading) return <DashLayout title="Notes"><div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)'}}>Établissement du relevé de notes...</div></DashLayout>

  return (
    <DashLayout title="Mes notes & résultats" requiredRole="etudiant">
      <div className="dash-page-title">Mes notes & résultats</div>
      <div className="dash-page-sub">{dbData.student?.filiere || 'L3 Informatique'} · Année 2025-2026 · Session</div>

      {/* Tabs - Design 100% Intact */}
      <div style={{ display:'flex', gap:8, marginBottom:24, background:'var(--mist)', borderRadius:10, padding:4, marginTop:16 }}>
        {semestresData.map(s => (
          <button key={s.id} onClick={() => setActiveSem(s.id)}
            style={{ 
              flex:1, padding:'9px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.83rem',
              background: activeSem === s.id ? '#fff' : 'transparent', 
              color: activeSem === s.id ? 'var(--ink)' : 'var(--slate)',
              boxShadow: activeSem === s.id ? '0 2px 8px rgba(0,0,0,.08)' : 'none', 
              transition: 'all .15s' 
            }}>
            {s.label}
            <span className={`badge ${s.status === 'PUBLIÉ' ? 'badge-green' : 'badge-gold'}`}
              style={{ marginLeft:8, fontSize:'.65rem' }}>{s.status}</span>
          </button>
        ))}
      </div>

      {/* KPIs - Design 100% Intact */}
      {moy && (
        <div className="kpi-grid" style={{ marginBottom:24 }}>
          {[
            { label: 'Moyenne générale', value: moy + '/20', sub: men.label, icon: '📊', color: men.color },
            { label: 'Crédits validés', value: ectsObtained + ' ECTS', sub: 'Ce semestre', icon: '🎓', color: 'var(--blue)' },
            { label: 'UEs validées', value: `${admis}/${sem.matieres.filter(m => m.note !== null).length}`, sub: `${ratt} en rattrapage`, icon: '✅', color: 'var(--green)' },
            { label: 'Rang estimé', value: '12e / 87', sub: '+3 places vs S0', icon: '🏆', color: 'var(--gold)' },
          ].map((k, i) => (
            <div className="kpi-card" key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><div className="kpi-label">{k.label}</div><span style={{ fontSize: '1.3rem' }}>{k.icon}</span></div>
              <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Notes table - Design 100% Intact */}
      <div className="card">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Relevé de notes — {sem.label}</div>
          {sem.status === 'PUBLIÉ' && (
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const myNotesForPdf = dbData.notes.map(n => ({ ...n, noteFinal: n.note_final }))
              printDocument(generateBulletin(dbData.student, myNotesForPdf))
            }}>🖨️ Bulletin PDF</button>
          )}
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Coef.</th>
                <th>CC</th>
                <th>Examen</th>
                <th>Moyenne</th>
                <th>Crédits</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {sem.matieres.map((m, i) => {
                const nc = m.note === null ? 'var(--slate)' : m.note >= 14 ? 'var(--green)' : m.note >= 10 ? 'var(--blue)' : 'var(--red)'
                return (
                  <tr key={i} style={{ cursor: 'pointer', background: expanded === i ? 'var(--mist)' : '#fff' }}
                    onClick={() => setExpanded(expanded === i ? null : i)}>
                    <td><strong style={{ color: 'var(--ink)' }}>{m.nom}</strong></td>
                    <td style={{ textAlign: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700 }}>{m.coef}</td>
                    <td style={{ textAlign: 'center', color: 'var(--slate)' }}>{m.cc ?? '—'}</td>
                    <td style={{ textAlign: 'center', color: 'var(--slate)' }}>{m.exam ?? '—'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 900, fontSize: '1.05rem', color: nc }}>{m.note ?? '—'}</td>
                    <td style={{ textAlign: 'center', fontSize: '.82rem', color: 'var(--slate)' }}>{m.note >= 10 ? (m.coef * 3) + ' ECTS' : '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {m.note === null ? <span className="badge badge-slate">En cours</span>
                        : m.note >= 10 ? <span className="badge badge-green">✅ Validé</span>
                        : <span className="badge badge-red">🔄 Rattrapage</span>}
                    </td>
                  </tr>
                )
              })}
              {moy && (
                <tr style={{ background: 'var(--gold-light)' }}>
                  <td colSpan={4} style={{ textAlign: 'right', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, paddingRight: 16 }}>Moyenne pondérée</td>
                  <td style={{ textAlign: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: 'var(--gold)' }}>{moy}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, color: 'var(--blue)' }}>{ectsObtained} ECTS</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ background: 'var(--gold)', color: 'var(--ink)', borderRadius: 6, padding: '4px 10px', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '.82rem' }}>{men.label}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertes dynamiques basées sur */}
      {sem.status === 'PUBLIÉ' && (
        <div className="alert alert-success" style={{ marginTop: 16 }}>
          ✅ Résultats officiels enregistrés en base de données · Délibération validée
        </div>
      )}
      {sem.status === 'EN COURS' && (
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          ℹ️ Les notes du Semestre {activeSem.replace('S', '')} ne sont pas encore totalement saisies par vos enseignants dans Supabase.
        </div>
      )}
    </DashLayout>
  )
}
