import { useState, useEffect } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { supabase } from '../../../lib/supabase'

const ROLES = [
  { id: 'super_admin', label: 'Super Admin', color: '#000091', permissions: ['all'] },
  { id: 'admin_universite', label: 'Admin Université', color: '#3b82f6', permissions: ['students','teachers','finances','examens','settings','reports','access_control'] },
  { id: 'scolarite', label: 'Scolarité', color: '#14b8a6', permissions: ['students','inscriptions','notes','edt','examens','documents'] },
  { id: 'enseignant', label: 'Enseignant', color: '#18753C', permissions: ['cours','edt','notes','etudiants'] },
  { id: 'etudiant', label: 'Étudiant', color: '#666666', permissions: ['edt','notes','paiements','documents','examens'] },
  { id: 'surveillant', label: 'Surveillant', color: '#E10600', permissions: ['scanner','monitor','presence','incidents'] },
  { id: 'bibliotheque', label: 'Bibliothèque', color: '#F3812B', permissions: ['catalogue','emprunts','lecteurs'] },
  { id: 'comptabilite', label: 'Comptabilité', color: '#6E445A', permissions: ['recettes','depenses','impayes','rapports_financiers'] },
]

const ALL_PERMISSIONS = [
  { id: 'students', label: 'Gestion étudiants' },
  { id: 'teachers', label: 'Gestion enseignants' },
  { id: 'finances', label: 'Finances & paiements' },
  { id: 'examens', label: 'Examens & planning' },
  { id: 'notes', label: 'Notes & résultats' },
  { id: 'edt', label: 'Emplois du temps' },
  { id: 'documents', label: 'Documents & attestations' },
  { id: 'inscriptions', label: 'Inscriptions' },
  { id: 'settings', label: 'Paramètres' },
  { id: 'reports', label: 'Rapports & exports' },
  { id: 'access_control', label: 'Contrôle d\'accès' },
  { id: 'scanner', label: 'Scanner badges' },
  { id: 'monitor', label: 'Monitoring temps réel' },
  { id: 'presence', label: 'Listes de présence' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'cours', label: 'Gestion des cours' },
  { id: 'etudiants', label: 'Voir les étudiants' },
  { id: 'paiements', label: 'Mes paiements' },
  { id: 'catalogue', label: 'Catalogue bibliothèque' },
  { id: 'emprunts', label: 'Gestion emprunts' },
  { id: 'lecteurs', label: 'Lecteurs actifs' },
  { id: 'recettes', label: 'Recettes' },
  { id: 'depenses', label: 'Dépenses' },
  { id: 'impayes', label: 'Suivi impayés' },
  { id: 'rapports_financiers', label: 'Rapports financiers' },
]

export default function SuperAdminSettings() {
  const [tab, setTab] = useState('alerts')
  const [alerts, setAlerts] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  // Configuration de la plateforme (system_config)
  const [platformConfig, setPlatformConfig] = useState({
    nom_plateforme: 'Optimus Campus',
    version: '2.0.0',
    environnement: 'Production',
    fuseau_horaire: 'Africa/Niamey (UTC+1)',
    devise: 'FCFA (XOF)',
    langue: 'Français',
    infrastructure: {
      plan: 'Cloud Standard',
      modules: '12',
      rls: '40',
      edge: '2 (email + SMS)',
      storage: 'student-photos bucket'
    }
  })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load Platform Config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data, error } = await supabase.from('system_config').select('*').eq('id', 'global').single()
        if (data && !error) {
          setPlatformConfig({
            nom_plateforme: data.nom_plateforme || 'Optimus Campus',
            version: data.version || '2.0.0',
            environnement: data.environnement || 'Production',
            fuseau_horaire: data.fuseau_horaire || 'Africa/Niamey (UTC+1)',
            devise: data.devise || 'FCFA (XOF)',
            langue: data.langue || 'Français',
            infrastructure: data.infrastructure || { plan: 'Cloud Standard', modules: '12', rls: '40', edge: '2 (email + SMS)', storage: 'student-photos bucket' }
          })
        }
      } catch (err) {
        console.error('Error fetching system config:', err)
      }
    }
    fetchConfig()
  }, [])


  // Charger les alertes depuis Supabase (proactif) + checks système
  useEffect(() => {
    async function loadAlerts() {
      try {
        // 1. Alertes stockées en base
        const { data: dbAlerts } = await supabase
          .from('notifications')
          .select('*')
          .in('type', ['payment_overdue_30','payment_overdue_60','access_denied','results_published'])
          .order('created_at', { ascending: false })
          .limit(20)

        // 2. Check proactif : dispositifs hors ligne
        const { data: devices } = await supabase
          .from('devices')
          .select('id, name, status, last_seen')
          .eq('status', 'OFFLINE')
          .limit(500)

        // 3. Check proactif : abonnements impayés
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name, status')
          .eq('status', 'SUSPENDED')
          .limit(500)
        const systemAlerts = []
        let nextId = 1

        // Dispositifs hors ligne → alerte PANNE
        if (devices?.length > 0) {
          devices.forEach(d => {
            systemAlerts.push({ id: nextId++, type: 'PANNE', severity: 'CRITICAL', message: d.name + ' — hors ligne', tenant: 'Système', time: 'Temps réel', resolved: false })
          })
        }

        // Tenants suspendus → alerte IMPAYÉ
        if (tenants?.length > 0) {
          tenants.forEach(t => {
            systemAlerts.push({ id: nextId++, type: 'IMPAYÉ', severity: 'HIGH', message: t.name + ' — abonnement suspendu', tenant: t.name, time: 'Actif', resolved: false })
          })
        }

        // DB alerts → notifications
        if (dbAlerts?.length > 0) {
          dbAlerts.forEach(n => {
            systemAlerts.push({ id: nextId++, type: n.type?.includes('overdue') ? 'IMPAYÉ' : n.type?.includes('access') ? 'SÉCURITÉ' : 'INFO', severity: n.type?.includes('60') ? 'CRITICAL' : 'MEDIUM', message: n.titre || n.detail, tenant: 'Auto', time: new Date(n.created_at).toLocaleDateString('fr-FR'), resolved: n.lu })
          })
        }

        // Fallback si aucune alerte dynamique
        if (systemAlerts.length === 0) {
          systemAlerts.push({ id: 1, type: 'INFO', severity: 'LOW', message: 'Aucune alerte active — système nominal', tenant: 'Plateforme', time: 'Maintenant', resolved: true })
        }

        setAlerts(systemAlerts)
      } catch {
        setAlerts([{ id: 1, type: 'INFO', severity: 'LOW', message: 'Impossible de charger les alertes', tenant: 'Système', time: '', resolved: false }])
      }
    }
    loadAlerts()

    const intervalId = window.setInterval(loadAlerts, 30000)
    return () => window.clearInterval(intervalId)
  }, [refreshKey])

  const handleSavePlatformConfig = async () => {
    setSaving(true)
    try {
      const payload = {
        id: 'global',
        ...platformConfig,
        updated_at: new Date().toISOString()
      }
      const { error } = await supabase.from('system_config').upsert(payload)
      if (error) throw error
      showToast('Configuration enregistrée avec succès')
    } catch (err) {
      console.error(err)
      showToast('Erreur de sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  const [roles, setRoles] = useState(ROLES)

  const tabs = [
    { id: 'alerts', label: '🚨 Alertes système', count: alerts.filter(a => !a.resolved).length },
    { id: 'permissions', label: '🔐 Rôles & Permissions' },
    { id: 'platform', label: '⚙️ Configuration' },
  ]

  const severityColors = { CRITICAL: '#E10600', HIGH: '#F3812B', MEDIUM: '#3b82f6', LOW: '#666666' }
  const typeIcons = { PANNE: '🔧', IMPAYÉ: '💰', PERFORMANCE: '⚡', SÉCURITÉ: '🛡️', STOCKAGE: '💾' }

  return (
    <DashLayout title="Paramètres système" requiredRole="super_admin">
      {toast && /* role=status for screen readers */ (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? 'var(--red-light)' : 'var(--green-light)', color: toast.type === 'error' ? 'var(--red)' : '#18753C', padding: '14px 22px', borderRadius: 14, fontWeight: 600, fontSize: '.85rem', boxShadow: '0 8px 24px rgba(0,0,0,.08)', border: `1px solid ${toast.type === 'error' ? '#FCC' : '#C6E0CC'}` }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <div className="dash-page-title">Paramètres système</div>
      <div className="dash-page-sub">Administration globale de la plateforme Optimus Campus</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: '.85rem', fontWeight: tab === t.id ? 700 : 500,
            background: tab === t.id ? 'var(--primary-light)' : 'var(--mist)',
            color: tab === t.id ? 'var(--primary)' : 'var(--ink-60)',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s'
          }}>
            {t.label}
            {t.count > 0 && <span style={{ background: 'var(--red)', color: '#fff', fontSize: '.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 10 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══ ALERTES SYSTÈME ═══ */}
      {tab === 'alerts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title">Alertes actives</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setRefreshKey(prev => prev + 1)}>
                ↻ Actualiser
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setAlerts(prev => prev.map(a => ({ ...a, resolved: true })))}>
                ✓ Tout marquer résolu
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.sort((a, b) => a.resolved - b.resolved).map(alert => (
              <div key={alert.id} className="card" style={{
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
                opacity: alert.resolved ? 0.5 : 1,
                borderLeft: `4px solid ${severityColors[alert.severity]}`,
                transition: 'all .2s'
              }}>
                <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>{typeIcons[alert.type] || '⚠️'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: '.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                      background: severityColors[alert.severity] + '15',
                      color: severityColors[alert.severity]
                    }}>{alert.severity}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--slate)' }}>{alert.type}</span>
                  </div>
                  <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{alert.message}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--slate)' }}>{alert.tenant} · {alert.time}</div>
                </div>
                {!alert.resolved ? (
                  <button onClick={() => setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, resolved: true } : a))}
                    className="btn btn-sm" style={{ background: 'var(--green-light)', color: '#18753C', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                    ✓ Résoudre
                  </button>
                ) : (
                  <span style={{ fontSize: '.75rem', color: 'var(--green)', fontWeight: 700 }}>✓ Résolu</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ RÔLES & PERMISSIONS ═══ */}
      {tab === 'permissions' && (
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>Matrice des permissions par rôle</div>
          <div className="section-sub" style={{ marginBottom: 24 }}>8 rôles · {ALL_PERMISSIONS.length} permissions</div>

          <div className="card" style={{ overflow: 'auto' }}>
            <table role="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 1, minWidth: 160 }}>Permission</th>
                  {roles.map(r => (
                    <th key={r.id} style={{ padding: '10px 8px', textAlign: 'center', minWidth: 90 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                        <span style={{ fontSize: '.65rem' }}>{r.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map(perm => (
                  <tr key={perm.id}>
                    <td style={{ padding: '8px 14px', fontWeight: 500, position: 'sticky', left: 0, background: '#fff', borderBottom: '1px solid var(--border-light)' }}>{perm.label}</td>
                    {roles.map(r => {
                      const has = r.permissions.includes('all') || r.permissions.includes(perm.id)
                      return (
                        <td key={r.id} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, margin: '0 auto',
                            background: has ? '#E6F0E9' : '#FEE8E7',
                            color: has ? '#18753C' : '#E5E5E5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '.7rem', fontWeight: 800
                          }}>
                            {has ? '✓' : '—'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ CONFIGURATION PLATEFORME ═══ */}
      {tab === 'platform' && (
        <div>
          <div className="section-title" style={{ marginBottom: 20 }}>Configuration de la plateforme</div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Général */}
            <div className="card card-p" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.9rem', marginBottom: 14 }}>🌐 Général</div>
              {[
                { key: 'nom_plateforme', label: 'Nom plateforme' },
                { key: 'version', label: 'Version' },
                { key: 'environnement', label: 'Environnement' },
                { key: 'fuseau_horaire', label: 'Fuseau horaire' },
                { key: 'devise', label: 'Devise' },
                { key: 'langue', label: 'Langue' },
              ].map(({ key, label }, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '6px 0', borderBottom: i < 5 ? '1px solid var(--border-light)' : 'none' }}>
                  <label style={{ fontSize: '.75rem', color: 'var(--slate)', fontWeight: 600, marginBottom: 4 }}>{label}</label>
                  <input 
                    className="form-input" 
                    value={platformConfig[key]} 
                    onChange={e => setPlatformConfig(p => ({ ...p, [key]: e.target.value }))}
                    style={{ fontSize: '.85rem', padding: '6px 10px' }}
                  />
                </div>
              ))}
            </div>

            {/* Infrastructure */}
            <div className="card card-p" style={{ borderLeft: '4px solid var(--green)' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.9rem', marginBottom: 14 }}>📊 Infrastructure</div>
              {[
                { key: 'plan', label: 'Plan' },
                { key: 'modules', label: 'Modules' },
                { key: 'rls', label: 'RLS Policies' },
                { key: 'edge', label: 'Edge Functions' },
                { key: 'storage', label: 'Storage' },
              ].map(({ key, label }, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '6px 0', borderBottom: i < 4 ? '1px solid var(--border-light)' : 'none' }}>
                  <label style={{ fontSize: '.75rem', color: 'var(--slate)', fontWeight: 600, marginBottom: 4 }}>{label}</label>
                  <input 
                    className="form-input" 
                    value={platformConfig.infrastructure[key]} 
                    onChange={e => setPlatformConfig(p => ({ ...p, infrastructure: { ...p.infrastructure, [key]: e.target.value } }))}
                    style={{ fontSize: '.85rem', padding: '6px 10px' }}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleSavePlatformConfig}
              disabled={saving}
              style={{ padding: '12px 24px', fontSize: '.95rem' }}
            >
              {saving ? 'Enregistrement...' : '💾 Enregistrer la configuration'}
            </button>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
