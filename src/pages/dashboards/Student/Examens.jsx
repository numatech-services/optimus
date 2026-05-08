import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom' // Ajout de l'import manquant
import DashLayout from '../../../components/Layout/DashLayout'
import { generateConvocation, printDocument } from '../../../utils/pdfService'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { resolveStudentContext } from '../../../utils/identityResolver'

const STATUT_B = { 'CONVOQUÉ':'badge-blue','PASSÉ':'badge-green','ABSENT':'badge-red' }

export default function StudentExamens() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // ── États des données Supabase ──
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [convocs, setConvocs] = useState([])
  const [filter, setFilter] = useState('ALL')

  // On récupère le matricule depuis l'utilisateur connecté (plus de fallback en dur)
  const matricule = user?.matricule

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    async function loadExamData() {
      setLoading(true)
      try {
        const { student, studentId, matricule: resolvedMatricule, tenantId } = await resolveStudentContext(user)

        if (!studentId) {
          setStudent(null)
          setConvocs([])
          return
        }

        const [resConvocs] = await Promise.all([
          supabase.from('convocations')
            .select('*, examens(*)') // Jointure pour récupérer les détails
            .eq('tenant_id', tenantId)
        ])

        if (student) setStudent(student)

        if (resConvocs.data) {
          // Mapping strict pour correspondre à vos variables UI
          const mappedConvocs = resConvocs.data
            .filter(c => [studentId, resolvedMatricule, student?.id].includes(c.student_id))
            .map(c => ({
            id: c.id,
            examId: c.exam_id,
            matiere: c.examens?.matiere || c.matiere || 'Inconnu',
            code: c.examens?.code || c.code || '—',
            // On s'assure que la date est au format DD/MM/YYYY pour votre logique de calcul
            date: c.examens?.date_examen ? new Date(c.examens.date_examen).toLocaleDateString('fr-FR') : c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '—',
            heure: c.examens?.heure || c.heure || '—',
            salle: c.salle || c.examens?.salle || '—',
            table: c.numero_table || c.place,
            statut: c.statut
          }))
          setConvocs(mappedConvocs)
        }
      } catch (err) {
        console.error("Erreur Supabase:", err)
      } finally {
        setLoading(false)
      }
    }
    loadExamData()
  }, [user, matricule])

  // ── 2. LOGIQUE DE CALCUL (Zéro Omission) ──
  const filtered = useMemo(() => 
    filter === 'ALL' ? convocs : convocs.filter(c => c.statut === filter)
  , [convocs, filter])

  const nbPassés = useMemo(() => {
    const aujourd_hui = new Date()
    return convocs.filter(c => {
      if (!c.date || c.date === '—') return false;
      const [d, m, y] = c.date.split('/')
      return new Date(`${y}-${m}-${d}`) < aujourd_hui
    }).length
  }, [convocs])

  const prochaineConvoc = useMemo(() => 
    convocs.find(c => c.statut === 'CONVOQUÉ')
  , [convocs])

  // Empêche la page blanche pendant le chargement
  if (loading) return (
    <DashLayout title="Mes examens">
      <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Marianne, Roboto, sans-serif', color: 'var(--slate)' }}>
        Chargement de vos convocations depuis la base...
      </div>
    </DashLayout>
  )

  return (
    <DashLayout title="Mes examens" requiredRole="etudiant">
      <div className="dash-page-title">📋 Mes convocations d'examen</div>
      <div className="dash-page-sub">{student?.filiere || 'Filière non définie'} · Session active 2025-2026</div>

      {/* KPIs - Design 100% Intact */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total épreuves', value: convocs.length, icon: '📋', color: 'var(--blue)' },
          { label: 'À venir', value: convocs.length - nbPassés, icon: '⏳', color: 'var(--amber)' },
          { label: 'Passées', value: nbPassés, icon: '✅', color: 'var(--green)' },
          { label: 'Prochaine épreuve', value: prochaineConvoc?.date || '—', icon: '📅', color: 'var(--ink)' },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="kpi-label">{k.label}</div>
              <span style={{ fontSize: '1.3rem' }}>{k.icon}</span>
            </div>
            <div className="kpi-value" style={{ color: k.color, fontSize: k.label === 'Prochaine épreuve' ? '1.1rem' : '1.6rem' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Alerte prochaine épreuve - Design Intact */}
      {prochaineConvoc && (
        <div style={{ background: 'linear-gradient(135deg,var(--blue),#2563eb)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '2rem' }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, color: '#fff', fontSize: '.95rem' }}>
              Prochaine épreuve — {prochaineConvoc.matiere}
            </div>
            <div style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.8)', marginTop: 3 }}>
              {prochaineConvoc.date} · {prochaineConvoc.heure} · {prochaineConvoc.salle} · Table {prochaineConvoc.table || '—'}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {/* Filtres et Actions - Design Intact */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="section-title">Calendrier des épreuves</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { 
                const stuData = student || { id: matricule, prenom: '', nom: '', filiere: '' };
                printDocument(generateConvocation(stuData, convocs)); 
            }}>🖨️ Imprimer convocation</button>
            
            {['ALL', 'CONVOQUÉ', 'PASSÉ'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ 
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.75rem',
                  background: filter === f ? 'var(--ink)' : 'var(--mist)',
                  color: filter === f ? '#fff' : 'var(--slate)' 
                }}>
                {f === 'ALL' ? 'Tous' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Tableau - Design Intact */}
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr><th>Matière</th><th>Date</th><th>Horaire</th><th>Salle</th><th>Table</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.88rem' }}>{c.matiere}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '.7rem', color: 'var(--slate)' }}>{c.code}</div>
                  </td>
                  <td style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem' }}>{c.date}</td>
                  <td style={{ fontSize: '.84rem' }}>{c.heure}</td>
                  <td style={{ fontSize: '.84rem' }}>{c.salle}</td>
                  <td>
                    <span style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--blue)' }}>
                      {c.table || '—'}
                    </span>
                  </td>
                  <td><span className={`badge ${STATUT_B[c.statut] || 'badge-slate'}`}>{c.statut}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Aucune convocation trouvée en base de données.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}
