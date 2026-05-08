import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Client Supabase réel
import { filterTeacherCourses, normalizeCourse, resolveTeacherContext } from '../../../utils/identityResolver'

export default function TeacherCours() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [allCours, setAllCours] = useState([])
  const [loading, setLoading] = useState(true)

  const profName = user?.name || 'Prof. Traoré'

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchTeacherCours()
  }, [profName, user])

  const fetchTeacherCours = async () => {
    setLoading(true)
    try {
      const { teacherNames, tenantId } = await resolveTeacherContext(user)

      const { data } = await supabase
        .from('prof_cours')
        .select('*')
        .limit(500)
        .eq('tenant_id', tenantId)

      if (data) {
        // Mappage vers variables JS existantes (Zéro changement de logique UI)
        const mappedData = filterTeacherCourses(data, teacherNames).map(normalizeCourse)
        setAllCours(mappedData)
      }
    } catch (err) {
      console.error("Erreur chargement cours:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE DE CALCUL DES KPIs (Design 100% Intact) ──
  const totalH = useMemo(() => allCours.reduce((s, c) => s + c.heures, 0), [allCours])
  const effectuees = useMemo(() => allCours.reduce((s, c) => s + c.effectuees, 0), [allCours])
  const pct = useMemo(() => (totalH > 0 ? Math.round(effectuees / totalH * 100) : 0), [totalH, effectuees])

  if (loading) return <DashLayout title="Mes cours"><div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif'}}>Chargement de vos enseignements en base...</div></DashLayout>

  return (
    <DashLayout title="Mes cours" requiredRole="enseignant">
      <div className="dash-page-title">📚 Mes cours</div>
      <div className="dash-page-sub">{profName} · Semestre 2 — 2025-2026 Live</div>

      {/* KPI Grid - Design Original */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Cours dispensés', value: allCours.length, icon: '📚', color: 'var(--blue)' },
          { label: 'Heures totales', value: totalH + 'h', icon: '⏱️', color: 'var(--ink)' },
          { label: 'Heures effectuées', value: effectuees + 'h', icon: '✅', color: 'var(--green)' },
          { label: 'Avancement', value: pct + '%', icon: '📈', color: 'var(--teal)' },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><div className="kpi-label">{k.label}</div><span style={{ fontSize: '1.3rem' }}>{k.icon}</span></div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-title">Liste des cours ({allCours.length})</div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Intitulé</th>
                <th>Filière</th>
                <th>Étudiants</th>
                <th>Avancement</th>
                <th>Coef.</th>
              </tr>
            </thead>
            <tbody>
              {allCours.map((c, i) => {
                const pctC = c.heures > 0 ? Math.round(c.effectuees / c.heures * 100) : 0
                return (
                  <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setModal(c)}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '.8rem', background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.88rem' }}>{c.titre}</td>
                    <td style={{ fontSize: '.82rem' }}>{c.filiere}</td>
                    <td style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700 }}>{c.etudiants}</td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pctC}%`, height: '100%', background: pctC >= 80 ? 'var(--green)' : pctC >= 50 ? 'var(--amber)' : 'var(--red)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '.75rem', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, color: 'var(--slate)', width: 36 }}>{pctC}%</span>
                      </div>
                      <div style={{ fontSize: '.65rem', color: 'var(--slate)', marginTop: 2 }}>{c.effectuees}/{c.heures}h</div>
                    </td>
                    <td style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, color: 'var(--gold)' }}>{c.coef}</td>
                  </tr>
                )
              })}
              {allCours.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Aucun cours assigné en base de données.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Détail (Design 100% Intact) */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, color: 'var(--ink)' }}>{modal.code} — {modal.titre}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              {[
                ['Filière', modal.filiere], 
                ['Étudiants', modal.etudiants],
                ['Heures totales', modal.heures + 'h'], 
                ['Effectuées', modal.effectuees + 'h'],
                ['Coeff.', modal.coef], 
                ['Avancement', Math.round(modal.effectuees / (modal.heures || 1) * 100) + '%'],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: '.88rem' }}>
                  <span style={{ color: 'var(--slate)' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-primary btn-sm" onClick={() => { setModal(null); navigate('/dashboard/enseignant/notes'); }}>Saisir les notes →</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
