import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── COMPOSANT DE STATUT OPTIMISÉ ────────────────
const STATUS_LABELS = { 
  ONLINE: '🟢 En ligne', OFFLINE: '🔴 Hors ligne', 
  ACTIVE: '✅ Actif', BLOCKED: '🚫 Bloqué', 
  LOST: '🔍 Perdu', SUSPENDED: '⏳ Suspendu' 
}

function StatusBadge({ status }) {
  const isOk = status === 'ONLINE' || status === 'ACTIVE'
  const isErr = status === 'OFFLINE' || status === 'BLOCKED' || status === 'SUSPENDED'
  const cls = isOk ? 'green' : isErr ? 'red' : 'slate'
  return <span className={`badge badge-${cls}`}>{STATUS_LABELS[status] || status}</span>
}

// ── CONFIGURATION MATÉRIELLE ──────────────────────────
const CONNECTORS = [
  { num: 1,  name: 'LED-Top', category: 'LED', emoji: '💡' },
  { num: 5,  name: 'Motor', category: 'Moteur', emoji: '⚙️' },
  { num: 7,  name: 'SYNC', category: 'Sync', emoji: '🔗', note: 'Liaison Master ↔ Slave' },
  { num: 13, name: 'Fire Alarm', category: 'Sécur.', emoji: '🔥', note: 'Contact sec SSI' },
  { num: 15, name: 'RS485', category: 'Comm.', emoji: '📟', note: 'Bus A+/B-' },
  { num: 21, name: 'Power 24V', category: 'Alim', emoji: '⚡' },
]

export default function PortiquePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('hardware')
  const [dbData, setDbData] = useState({ portique: null, readers: [], badges: [], students: [] })

  useEffect(() => {
    fetchPortiqueData()
  }, [])

  const fetchPortiqueData = async () => {
    setLoading(true)
    try {
      const [resDev, resRead, resBadges, resStudents] = await Promise.all([
        supabase.from('devices').select('*').eq('id', 'CTR-PORTIQUE-01').single(),
        supabase.from('readers').select('*').eq('controller_id', 'CTR-PORTIQUE-01'),
        supabase.from('badges').select('*'),
        supabase.from('students').select('*')
      ])
      setDbData({
        portique: resDev.data,
        readers: resRead.data || [],
        badges: resBadges.data || [],
        students: resStudents.data || []
      })
    } catch (err) {
      console.error("Erreur:", err)
    } finally {
      setLoading(false)
    }
  }

  const badgesEnrichis = useMemo(() => {
    return dbData.badges.map(b => {
      const s = dbData.students.find(st => st.id === b.student_id)
      return { ...b, studentName: s ? `${s.prenom} ${s.nom}` : 'Inconnu' }
    })
  }, [dbData])

  if (loading) return <DashLayout title="Chargement..."><div>⚙️ Initialisation du système...</div></DashLayout>

  return (
    <DashLayout title="Portique DS-S-V1-2302">
      
      {/* HEADER */}
      <div style={{ marginBottom: 25 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          🚧 Contrôle d'Accès Matériel
        </h2>
        <p>Terminal ID: <code>{dbData.portique?.id || 'N/A'}</code></p>
      </div>

      {/* STATS HORIZONTALES (KPIs) */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '30px', 
        overflowX: 'auto', 
        paddingBottom: '10px' 
      }}>
        {[
          { label: 'État Système', value: dbData.portique?.status === 'ONLINE' ? 'Connecté' : 'Déconnecté', icon: '🖥️', color: '#2ecc71' },
          { label: 'Badges Actifs', value: dbData.badges.filter(b => b.status === 'ACTIVE').length, icon: '💳', color: '#3498db' },
          { label: 'Lecteurs', value: dbData.readers.length, icon: '📡', color: '#9b59b6' },
          { label: 'Alertes', value: 0, icon: '⚠️', color: '#e67e22' }
        ].map((k, i) => (
          <div key={i} style={{ 
            minWidth: '200px', 
            flex: '1',
            background: '#fff', 
            padding: '15px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            borderLeft: `5px solid ${k.color}`
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{k.icon}</div>
            <div style={{ color: '#7f8c8d', fontSize: '0.8rem', fontWeight: 600 }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2c3e50' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* TABS MENU */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className={`btn ${tab === 'hardware' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('hardware')}>🔌 Hardware</button>
        <button className={`btn ${tab === 'badges' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('badges')}>🗂️ Badges</button>
      </div>

      {/* CONTENU : HARDWARE */}
      {tab === 'hardware' && (
        <div className="grid-2">
          <div className="card card-p">
            <h3>🎛️ Bornier Master Board</h3>
            <div style={{ marginTop: 15 }}>
              {CONNECTORS.map(c => (
                <div key={c.num} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                  <span>{c.emoji} <strong>#{c.num}</strong> {c.name}</span>
                  <span style={{ fontSize: '0.7rem', background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>VALIDE</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-p" style={{ background: '#1a2035', color: '#fff' }}>
            <h3 style={{ color: '#fff' }}>🔗 Synchronisation Slave</h3>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem' }}>🤝</div>
              <p>Liaison RS485 entre Master (Gauche) et Slave (Droite) active.</p>
              <div className="badge badge-green">SYNC OK</div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : BADGES (DATA RÉELLE) */}
      {tab === 'badges' && (
        <div className="card">
          <div className="table-wrap">
            <table role="table">
              <thead>
                <tr>
                  <th>Nom de l'étudiant</th>
                  <th>N° Carte (UID)</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {badgesEnrichis.map(b => (
                  <tr key={b.id}>
                    <td><strong>👤 {b.studentName}</strong></td>
                    <td><code>🆔 {b.card_number}</code></td>
                    <td><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </DashLayout>
  )
}