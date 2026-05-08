import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

export default function ExamAccess() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')

  useEffect(() => {
    if (tid) loadLogs()
  }, [tid])

  const loadLogs = async () => {
    setLoading(true)
      .from('exam_access_logs')
      .select('*, students(nom, prenom, matricule), salles(nom), examens(matiere)')
      .eq('tenant_id', tid)
      .order('heure_entree', { ascending: false })
      .limit(500)
    if (data) setLogs(data)
    try {
      const { data } = await supabase
    } catch (err) {
      console.error("[Error]", err.message)
    }
    setLoading(false)
  }

  const handleScan = async () => {
    if (!scanInput.trim()) return
    // Rechercher l'étudiant par matricule
    try {
      const { data: student } = await supabase
        .from('students')
        .select('id, nom, prenom, matricule')
        .eq('tenant_id', tid)
        .eq('matricule', scanInput.trim())
        .single()
    } catch (err) {
      console.error("[Error]", err.message)
    }

    if (!student) {
      alert('Matricule non trouvé : ' + scanInput)
      setScanInput('')
      return
    }

    // 1. Vérifier l'éligibilité (paiement + badge)
    try {
      const { data: eligibility } = await supabase.rpc('check_exam_eligibility', {
        p_student_id: student.id, p_tenant_id: tid
      })
    } catch (err) {
      console.error("[Error]", err.message)
    }

    if (eligibility && eligibility.length > 0 && !eligibility[0].eligible) {
      // Étudiant NON éligible — enregistrer comme EXCLU
      try {
        await supabase.from('exam_access_logs').insert([{
          student_id: student.id,
          verifie_par: user?.name || 'Surveillant',
          statut: 'EXCLU',
          tenant_id: tid,
        }])
      } catch (err) {
        console.error("[Error]", err.message)
      }
      alert(`⚠️ ACCÈS REFUSÉ — ${student.prenom} ${student.nom}\nRaison : ${eligibility[0].raison}`)
      setScanInput('')
      loadLogs()
      return
    }

    // 2. Vérifier les convocations actives
    let convocations = null
    try {
      const { data: convocations } = await supabase
        .from('convocations')
        .select('*, examens(id, matiere, salle)')
        .eq('student_id', student.id)
        .limit(500)
      if (!convocations || convocations.length === 0) {
        alert(`${student.prenom} ${student.nom} — Aucune convocation active`)
        setScanInput('')
        return
      }
    } catch (err) {
      console.error("[Error]", err.message)
    }

    // 3. Tout OK — enregistrer l'accès PRÉSENT
    try {
      await supabase.from('exam_access_logs').insert([{
        examen_id: convocations[0]?.examens?.id,
        student_id: student.id,
        verifie_par: user?.name || 'Surveillant',
        statut: 'PRÉSENT',
        tenant_id: tid,
      }])
    } catch (err) {
      console.error("[Error]", err.message)
    }

    setScanInput('')
    loadLogs()
  }

  const stats = {
    presents: logs.filter(l => l.statut === 'PRÉSENT').length,
    retards: logs.filter(l => l.statut === 'RETARD').length,
    exclus: logs.filter(l => l.statut === 'EXCLU').length,
  }

  if (loading) return <DashLayout title="Accès examens"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Accès salles d'examen">
      <div className="dash-page-title">Contrôle d'accès — Examens</div>
      <div className="dash-page-sub">Vérification des convocations et accès aux salles d'examen</div>

      {/* Scanner */}
      <div className="card card-p" style={{ marginBottom: 24, borderLeft: '3px solid var(--primary)' }}>
        <div className="section-title" style={{ marginBottom: 12 }}>📷 Scanner un étudiant</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" value={scanInput} onChange={e => setScanInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder="Matricule ou scan badge (ex: ETU-2024-0042)" style={{ flex: 1 }} autoFocus />
          <button className="btn btn-primary" onClick={handleScan}>Vérifier</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card"><div className="kpi-label">Présents</div><div className="kpi-value" style={{ color: '#18753C' }}>{stats.presents}</div></div>
        <div className="kpi-card"><div className="kpi-label">Retards</div><div className="kpi-value" style={{ color: '#F3812B' }}>{stats.retards}</div></div>
        <div className="kpi-card"><div className="kpi-label">Exclus</div><div className="kpi-value" style={{ color: '#E10600' }}>{stats.exclus}</div></div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-title">Journal d'accès ({logs.length})</div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Heure</th><th>Étudiant</th><th>Matricule</th><th>Examen</th><th>Vérifié par</th><th>Statut</th></tr></thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Aucun accès enregistré</td></tr>
              ) : logs.map((l, i) => (
                <tr key={i}>
                  <td>{new Date(l.heure_entree).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ fontWeight: 600 }}>{l.students ? `${l.students.prenom} ${l.students.nom}` : '—'}</td>
                  <td><code style={{ fontSize: '.75rem', background: 'var(--mist)', padding: '2px 6px', borderRadius: 4 }}>{l.students?.matricule || '—'}</code></td>
                  <td>{l.examens?.matiere || '—'}</td>
                  <td style={{ fontSize: '.85rem', color: 'var(--slate)' }}>{l.verifie_par}</td>
                  <td>
                    <span className={`badge ${l.statut === 'PRÉSENT' ? 'badge-green' : l.statut === 'RETARD' ? 'badge-amber' : 'badge-red'}`}>{l.statut}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}
