import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Client Supabase réel
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'

export default function SurveillantPresence() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // ── États des données Supabase ──
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState({ name: 'Chargement...', room: '—', expected_students: 0 })
  const [dbData, setDbData] = useState({
    students: [],
    badges: [],
    events: []
  })

  // ── États UI (Identiques à l'origine) ──
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchPresenceData()
  }, [])

  const fetchPresenceData = async () => {
    setLoading(true)
    try {
      const [resSession, resStudents, resBadges, resEvents] = await Promise.all([
        supabase.from('access_sessions').select('*').limit(1).single(),
        supabase.from('students').select('*').limit(500),
        supabase.from('badges').select('*').limit(500),
        supabase.from('access_events').select('*').limit(200).order('timestamp', { ascending: false })
      ])

      if (resSession.data) setSession(resSession.data)

      setDbData({
        students: resStudents.data || [],
        badges: resBadges.data || [],
        events: resEvents.data || []
      })
    } catch (err) {
      console.error("Erreur Sync Presence:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE DE FUSION (Mappage vers variables d'origine) ──
  const students = useMemo(() => {
    return dbData.students.map(s => {
      const badge = dbData.badges.find(b => b.student_id === s.id)
      const lastEvent = dbData.events.find(e => e.matricule === s.id)
      
      let scanStatus = 'ABSENT'
      let time = null
      let reason = null

      if (lastEvent) {
        if (lastEvent.type === 'GRANTED') {
          scanStatus = 'PRÉSENT'
          time = new Date(lastEvent.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        } else if (lastEvent.type === 'DENIED') {
          scanStatus = 'REFUSÉ'
          time = new Date(lastEvent.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          reason = lastEvent.reason || 'Accès refusé'
        }
      }

      return {
        mat: s.id,
        name: `${s.prenom} ${s.nom}`,
        filiere: s.filiere,
        badge: badge?.id || null,
        badgeStatus: badge?.status || 'NONE',
        scanStatus,
        time,
        reason
      }
    })
  }, [dbData])

  // ── 3. ACTIONS RÉELLES (Toggle Presence) ──
  const togglePresence = async (mat) => {
    const s = students.find(x => x.mat === mat)
    const isPresent = s.scanStatus === 'PRÉSENT'
    
    if (isPresent) {
      // Pour marquer absent, on supprime les entrées de présence en base pour cet étudiant
      try {
        const { error } = await supabase
          .from('access_events')
          .delete()
          .eq('matricule', mat)
          .eq('type', 'GRANTED')
        if (!error) {
          showToast(`Étudiant marqué absent`, 'error')
          fetchPresenceData()
        }
      } catch (err) {
        console.error("[Error]", err.message)
      }
    } else {
      // Pour marquer présent, on insère un événement manuel
      try {
        const { error } = await supabase.from('access_events').insert([{
          id: `MANUAL-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'GRANTED',
          matricule: mat,
          student_name: s.name,
          filiere: s.filiere,
          direction: 'ENTRY',
          reader_id: 'MANUAL_ENTRY',
          reason: 'Validé manuellement par surveillant'
        }])
      } catch (err) {
        console.error("[Error]", err.message)
      }

      if (!error) {
        showToast(`Présence confirmée pour ${s.name}`)
        fetchPresenceData()
      }
    }
  }

  // Filtrage (Inchangé)
  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.mat.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filterStatus === 'ALL' || s.scanStatus === filterStatus
    return matchSearch && matchFilter
  })

  const present = students.filter(s => s.scanStatus === 'PRÉSENT').length
  const absent = students.filter(s => s.scanStatus === 'ABSENT').length
  const refused = students.filter(s => s.scanStatus === 'REFUSÉ').length

  if (loading) return <DashLayout title="Présence">
    <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, color: 'var(--slate)' }}>
      Synchronisation de la feuille de présence...
    </div>
  </DashLayout>

  return (
    <DashLayout title="Liste de Présence" requiredRole="surveillant">
      
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'var(--ink)' }}>📋 Liste de présence </div>
          <div style={{ fontSize: '.83rem', color: 'var(--slate)', marginTop: 2 }}>{session.name} · {session.room}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/dashboard/surveillant')} style={{ padding: '8px 16px', borderRadius: 8, border: '2px solid var(--border)', background: '#fff', color: 'var(--slate)', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 600, fontSize: '.83rem', cursor: 'pointer' }}>← Retour</button>
        </div>
      </div>

      {/* Stats - Design 100% Intact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total attendus', value: session.expected_students || students.length, color: 'var(--ink)', icon: '👥' },
          { label: 'Présents', value: present, color: 'var(--green)', icon: '✅' },
          { label: 'Absents', value: absent, color: 'var(--slate)', icon: '⏳' },
          { label: 'Refusés', value: refused, color: 'var(--red)', icon: '🚫' },
        ].map((s, i) => (
          <div key={i} className="kpi-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: '1.6rem' }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--slate)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters - Design 100% Intact */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Chercher par nom ou matricule…"
          className="form-input" style={{ width: 280, padding: '8px 14px', fontSize: '.85rem' }}
        />
        {['ALL', 'PRÉSENT', 'ABSENT', 'REFUSÉ'].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)} style={{
            padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600,
            background: filterStatus === f ? (f === 'PRÉSENT' ? 'var(--green)' : f === 'REFUSÉ' ? 'var(--red)' : f === 'ABSENT' ? 'var(--slate)' : 'var(--ink)') : 'var(--mist)',
            color: filterStatus === f ? '#fff' : 'var(--slate)'
          }}>{f === 'ALL' ? 'Tous' : f}</button>
        ))}
      </div>

      {/* Table - Design 100% Intact */}
      <div className="card">
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr><th>Matricule</th><th>Nom</th><th>Filière</th><th>Badge</th><th>Heure scan</th><th>Statut</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.mat} style={{ opacity: s.scanStatus === 'ABSENT' ? 0.7 : 1 }}>
                  <td style={{ fontFamily: 'monospace', fontSize: '.75rem' }}>{s.mat}</td>
                  <td><strong style={{ color: 'var(--ink)' }}>{s.name}</strong></td>
                  <td style={{ fontSize: '.8rem' }}>{s.filiere}</td>
                  <td>
                    {s.badge
                      ? <span className={`badge badge-${s.badgeStatus === 'ACTIVE' ? 'green' : 'red'}`} style={{ fontSize: '.68rem' }}>
                          {s.badge} · {s.badgeStatus}
                        </span>
                      : <span style={{ color: 'var(--slate)', fontSize: '.75rem' }}>Non assigné</span>
                    }
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.78rem' }}>{s.time || '—'}</td>
                  <td>
                    <span className={`badge badge-${s.scanStatus === 'PRÉSENT' ? 'green' : s.scanStatus === 'REFUSÉ' ? 'red' : 'slate'}`}>
                      {s.scanStatus}
                    </span>
                    {s.reason && <div style={{ fontSize: '.65rem', color: 'var(--red)', marginTop: 2, fontWeight: 700 }}>⚠️ {s.reason}</div>}
                  </td>
                  <td>
                    {s.scanStatus !== 'REFUSÉ' && (
                      <button onClick={() => togglePresence(s.mat)} style={{
                        padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600,
                        background: s.scanStatus === 'PRÉSENT' ? 'rgba(192,57,43,.1)' : 'rgba(30,132,73,.1)',
                        color: s.scanStatus === 'PRÉSENT' ? 'var(--red)' : 'var(--green)'
                      }}>{s.scanStatus === 'PRÉSENT' ? 'Marquer absent' : 'Marquer présent'}</button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--slate)' }}>Aucun étudiant correspondant en base de données.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}