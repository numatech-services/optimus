import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function ScolariteNotes() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState([])
  const [active, setActive] = useState(null)

  useEffect(() => {
    fetchModulesAndNotes()
  }, [])

  const fetchModulesAndNotes = async () => {
    setLoading(true)
    try {
      const { data: coursData } = await supabase
        .from('prof_cours')
        .select('*')
        .limit(5000)

      if (coursData) {
        const modulesWithGrades = await Promise.all(
          coursData.map(async (c) => {
            try {
              const { data: notesData } = await supabase
                .from('notes')
                .select('*, students(nom, prenom)')
                .eq('code', c.code)

              return {
                id: c.id,
                code: c.code,
                matiere: c.titre,
                filiere: c.filiere,
                enseignant: c.prof_name,
                etudiants: c.etudiants_count,
                grades: (notesData || []).map(n => ({
                  noteId: n.id,
                  student_id: n.student_id,
                  nom: n.students ? `${n.students.prenom} ${n.students.nom}` : 'Inconnu',
                  note: n.note_final,
                  note_cc: n.note_cc,
                  note_examen: n.note_examen
                }))
              }
            } catch (err) {
              console.error("Error loading module:", err.message)
              return null
            }
          })
        )

        const validModules = modulesWithGrades.filter(m => m !== null)
        setModules(validModules)
        if (validModules.length > 0 && !active) {
          setActive(validModules[0].id)
        }
      }
    } catch (err) {
      console.error("Erreur chargement notes:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── CALCULS DYNAMIQUES ──
  const mod = useMemo(() => modules.find(m => m.id === active), [modules, active])

  if (loading) return <DashLayout title="Notes">
    <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700 }}>
      Chargement...
    </div>
  </DashLayout>

  return (
    <DashLayout title="Notes & Résultats">
      <div className="dash-page-title">Notes & Résultats</div>
      <div className="dash-page-sub">Gestion des notes académiques</div>

      {/* Sélecteur de Modules */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {modules.map(m => (
          <button
            key={m.id}
            onClick={() => setActive(m.id)}
            style={{
              padding: '9px 14px',
              borderRadius: 9,
              border: `2px solid ${active === m.id ? 'var(--gold)' : 'var(--border)'}`,
              background: active === m.id ? 'var(--gold-light)' : '#fff',
              fontFamily: 'Marianne, Roboto, sans-serif',
              fontWeight: 700,
              fontSize: '.82rem',
              color: active === m.id ? 'var(--ink)' : 'var(--slate)',
              cursor: 'pointer'
            }}
          >
            {m.code} — {m.matiere.slice(0, 20)}
          </button>
        ))}
      </div>

      {mod && (
        <div className="card">
          {/* En-tête */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
            <div className="section-title">{mod.matiere} — {mod.filiere}</div>
            <div style={{ fontSize: '.78rem', color: 'var(--slate)', marginTop: 2 }}>
              {mod.enseignant} · {mod.etudiants} étudiants
            </div>
          </div>

          {/* Tableau */}
          <div className="table-wrap">
            <table role="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Étudiant</th>
                  <th>CC /20</th>
                  <th>Examen /20</th>
                  <th>Note /20</th>
                </tr>
              </thead>
              <tbody>
                {mod.grades && mod.grades.length > 0 ? (
                  mod.grades.map((g, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: '.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                        {g.student_id}
                      </td>
                      <td style={{ fontWeight: 600 }}>{g.nom}</td>
                      <td>{g.note_cc !== null ? g.note_cc : '—'}</td>
                      <td>{g.note_examen !== null ? g.note_examen : '—'}</td>
                      <td style={{ fontWeight: 800, color: g.note !== null && g.note >= 10 ? 'var(--green)' : 'var(--red)' }}>
                        {g.note !== null ? `${g.note}/20` : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--slate)' }}>
                      Aucune note enregistrée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashLayout>
  )
}