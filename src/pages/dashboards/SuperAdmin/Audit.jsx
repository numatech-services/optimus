import { useEffect, useMemo, useState } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { supabase } from '../../../lib/supabase'

const LEVEL_B = { INFO: 'badge-blue', SUCCESS: 'badge-green', WARNING: 'badge-gold', ERROR: 'badge-red' }

function mapAuditLog(log) {
  return {
    id: log.id,
    sortValue: new Date(log.created_at).getTime(),
    time: new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    user: log.user_email || log.user_id || 'Système',
    action: log.action || 'AUDIT_EVENT',
    detail: log.target_table ? `${log.target_table} — ${log.target_id || '—'}` : 'Journal système',
    level: log.action?.includes('DELETE') ? 'WARNING' : 'INFO',
  }
}

function mapAccessEvent(event) {
  const granted = ['GRANTED', 'ACCESS_GRANTED'].includes(event.type)

  return {
    id: event.id,
    sortValue: new Date(event.timestamp).getTime(),
    time: new Date(event.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    user: event.student_name || event.matricule || 'Système',
    action: granted ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
    detail: `${event.reader || event.reader_id || 'Lecteur'} — ${event.reason || 'Passage portique'}`,
    level: granted ? 'SUCCESS' : 'WARNING',
  }
}

export default function SuperAdminAudit() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)

      try {
        const [auditRes, accessRes] = await Promise.allSettled([
          supabase.from('audit_logs').select('*').limit(100).order('created_at', { ascending: false }),
          supabase.from('access_events').select('*').limit(100).order('timestamp', { ascending: false }),
        ])

        const auditLogs = (auditRes.status === 'fulfilled' ? (auditRes.value.data || []) : []).map(mapAuditLog)
        const accessLogs = (accessRes.status === 'fulfilled' ? (accessRes.value.data || []) : []).map(mapAccessEvent)
        setLogs([...auditLogs, ...accessLogs].sort((a, b) => b.sortValue - a.sortValue))
      } catch (err) {
        console.error('[Audit]', err.message)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  const filtered = useMemo(() => logs.filter((log) => {
    const q = search.toLowerCase()
    const matchQ = !q || `${log.user} ${log.action} ${log.detail}`.toLowerCase().includes(q)
    const matchF = filter === 'ALL' || log.level === filter
    return matchQ && matchF
  }), [logs, search, filter])

  if (loading) return <DashLayout title="Journal d'audit"><div>Récupération des journaux...</div></DashLayout>

  return (
    <DashLayout title="Journal d'audit" requiredRole="super_admin">
      <div className="dash-page-title">Journal d'Audit</div>
      <div className="dash-page-sub">Traçabilité complète des actions sur la plateforme</div>
      <div className="kpi-grid">
        {[
          { label: 'Événements', value: logs.length, sub: 'Dernières entrées', icon: '📋', color: 'var(--blue)' },
          { label: 'Erreurs', value: logs.filter(l => l.level === 'ERROR').length, sub: 'Problèmes critiques', icon: '❌', color: 'var(--red)' },
          { label: 'Alertes', value: logs.filter(l => l.level === 'WARNING').length, sub: 'Accès refusés', icon: '⚠️', color: 'var(--amber)' },
          { label: 'Succès', value: logs.filter(l => l.level === 'SUCCESS').length, sub: 'Opérations réussies', icon: '✅', color: 'var(--green)' },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><div className="kpi-label">{k.label}</div><span style={{ fontSize: '1.3rem' }}>{k.icon}</span></div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Flux d'événements ({filtered.length})</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220, padding: '7px 10px', fontSize: '.82rem' }} />
            <select className="form-input form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 130, padding: '7px 10px', fontSize: '.82rem' }}>
              {['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map(level => <option key={level}>{level}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Horodatage</th><th>Utilisateur</th><th>Action</th><th>Détail</th><th>Niveau</th></tr></thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '.75rem', color: 'var(--slate)' }}>{log.time}</td>
                  <td style={{ fontSize: '.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.user}</td>
                  <td><code style={{ background: 'var(--mist)', padding: '2px 7px', borderRadius: 5, fontSize: '.75rem', color: 'var(--ink)' }}>{log.action}</code></td>
                  <td style={{ fontSize: '.82rem', color: 'var(--slate)', maxWidth: 280 }}>{log.detail}</td>
                  <td><span className={`badge ${LEVEL_B[log.level]}`}>{log.level}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--slate)' }}>Aucune donnée d'audit disponible.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}
