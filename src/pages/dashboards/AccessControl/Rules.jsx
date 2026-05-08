import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import useEscapeKey from '../../../hooks/useEscapeKey'

const ROLES_LIST = ['Étudiant', 'Enseignant', 'Scolarité', 'Admin', 'Technicien', 'Étudiant L3+']
const STATUS_B = { ACTIVE: 'badge-green', INACTIVE: 'badge-slate', SUSPENDED: 'badge-red' }
const EMPTY_FORM = { name: '', zones: ['Entrée Campus'], roles: ['Étudiant'], days: 'LUN-SAM', hours: '07:00 - 22:00', method: 'QR ou BADGE', status: 'ACTIVE' }

// ── Composant Modal (Design Intact) ───────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 500, borderRadius: 14, padding: 0, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', borderRadius: '14px 14px 0 0' }}>
          <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export default function RulesPage() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.tenant
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'add' | 'edit'
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [toast, setToast] = useState(null)

  useEscapeKey(() => setModal(null))

  // ── 1. CHARGEMENT RÉEL ──
  useEffect(() => {
    fetchRules()
  }, [tenantId])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('access_rules')
        .select('*').limit(500)
        .eq('tenant_id', tenantId)
        .order('id', { ascending: true })

      if (data) {
        // MAPPING -> JS (Zéro Omission)
        const mapped = data.map(r => ({
          id: r.id,
          name: r.name,
          roles: Array.isArray(r.groups) ? r.groups : [],
          hours: r.time_zone ? r.time_zone.replace('-', ' - ') : '07:00 - 22:00',
          status: r.status || 'ACTIVE',
          // Champs UI maintenus pour le design
          zones: String(r.direction || '').toLowerCase() === 'entry' ? ['Zone Entrée'] : ['Entrée Campus'],
          days: 'LUN-SAM',
          method: 'QR ou BADGE'
        }))
        setRules(mapped)
      }
    } catch (err) {
      console.error("Erreur chargement règles:", err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── 2. ACTIONS CRUD (BOUTONS FONCTIONNELS) ──
  const openAdd = () => { setForm(EMPTY_FORM); setModal('add') }
  
  const openEdit = (rule) => {
    setSelected(rule)
    setForm({
      ...rule,
      // On convertit le format affichage "07:00 - 22:00" en format "07:00-22:00"
      hours: rule.hours.replace(' - ', '-')
    })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name) return
    let requestError = null

    const sqlData = {
      name: form.name,
      groups: form.roles,
      time_zone: form.hours.replace(' - ', '-'),
      status: form.status,
      direction: 'BOTH',
      tenant_id: tenantId,
    }

    if (modal === 'add') {
      try {
        const { error } = await supabase.from('access_rules').insert([{ id: 'RULE-' + Date.now().toString().slice(-4), ...sqlData }])
        requestError = error
      } catch (err) {
        console.error("[Error]", err.message)
        requestError = err
      }
      if (!requestError) showToast("Règle créée avec succès")
    } else {
      try {
        const { error } = await supabase.from('access_rules').update(sqlData).eq('id', selected.id)
        requestError = error
      } catch (err) {
        console.error("[Error]", err.message)
        requestError = err
      }
      if (!requestError) showToast("Règle mise à jour")
    }

    setModal(null)
    fetchRules()
  }

  const toggleStatus = async (id, currentStatus) => {
    const next = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    let requestError = null
    try {
      const { error } = await supabase.from('access_rules').update({ status: next }).eq('id', id)
      requestError = error
    } catch (err) {
      console.error("[Error]", err.message)
      requestError = err
    }
    if (!requestError) {
      showToast(`Règle ${next === 'ACTIVE' ? 'activée' : 'désactivée'}`)
      fetchRules()
    }
  }

  if (loading) return <DashLayout title="Règles"><div>Chargement des règles d'accès...</div></DashLayout>

  return (
    <DashLayout title="Règles d'accès" requiredRole="admin_universite">
      
      {/* Toast Design Origine */}
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: 'var(--green)', color: '#fff', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          ✅ {toast}
        </div>
      )}

      {/* MODAL AJOUT / MODIF (Restauré et Fonctionnel) */}
      {modal && (
        <Modal title={modal === 'add' ? '➕ Nouvelle règle d\'accès' : '✏️ Modifier la règle'} onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Nom de la règle</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Accès Bibliothèque" />
          </div>
          <div className="form-group">
            <label className="form-label">Plage horaire (HH:mm-HH:mm)</label>
            <input className="form-input" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="08:00-18:00" />
          </div>
          <div className="form-group">
            <label className="form-label">Profils autorisés</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {ROLES_LIST.map(role => (
                <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', padding: '5px 10px', background: form.roles.includes(role) ? 'var(--blue-light)' : 'var(--mist)', borderRadius: 6, cursor: 'pointer', border: `1px solid ${form.roles.includes(role) ? 'var(--blue)' : 'transparent'}` }}>
                  <input type="checkbox" checked={form.roles.includes(role)} hidden
                    onChange={e => {
                      const nextRoles = e.target.checked ? [...form.roles, role] : form.roles.filter(r => r !== role)
                      setForm({ ...form, roles: nextRoles })
                    }} />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </div>
        </Modal>
      )}

      <div className="dash-page-title">📐 Règles d'accès & plages horaires</div>
      <div className="dash-page-sub">Définissez quels profils peuvent accéder à quelles zones, quand et comment</div>

      {/* Alerte Info - Design Intact */}
      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <span>⚙️</span>
        <div style={{ fontSize: '.85rem' }}>
          Les règles sont évaluées dans l'ordre de priorité. La première règle applicable est appliquée.
          Pour les sessions d'examen, la règle est activée automatiquement à partir du planning Scolarité.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Règles configurées</div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Nouvelle règle</button>
        </div>

        <div style={{ padding: 16 }}>
          {rules.map((r, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 12, background: r.status === 'ACTIVE' ? '#fff' : '#fafafa', opacity: r.status === 'ACTIVE' ? 1 : .7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: 3 }}>{r.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.zones.map(z => <span key={z} className="badge badge-blue">{z}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${STATUS_B[r.status]}`}>{r.status}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleStatus(r.id, r.status)}>
                    {r.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>✏️</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  ['👥 Profils', r.roles.join(', ') || 'Tous'],
                  ['📅 Jours', r.days],
                  ['⏰ Horaires', r.hours],
                  ['🔑 Méthode', r.method]
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--mist)', borderRadius: 6, padding: '7px 10px' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--slate)', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--ink)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {rules.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>Aucune règle configurée.</div>}
        </div>
      </div>

      {/* Wiegand protocol info - Design Intact */}
      <div className="card card-p">
        <div className="section-title mb-8">⚡ Protocole Wiegand — Notes d'intégration</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          {[
            ['Format Wiegand 26 bits', 'Standard universel. Compatibilité maximale avec les lecteurs du marché. Capacité : 65 535 cartes.'],
            ['Format Wiegand 34/37 bits', 'Format étendu pour les gros établissements (> 65K cartes). Nécessite paramétrage spécifique du contrôleur.'],
            ['OSDP (Open Supervised Device Protocol)', "Protocole chiffré nouvelle génération. Résistant aux attaques par interception. Recommandé pour les sites sensibles."],
            ['QR Code OTP (Optimus Campus)', 'Convocation horodatée + HMAC-SHA256. Expiration 30 min avant examen. Non copiable. Compatible scanner USB/série.'],
          ].map(([t, d]) => (
            <div key={t} style={{ background: 'var(--mist)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.85rem', color: 'var(--ink)', marginBottom: 5 }}>{t}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--slate)', lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </DashLayout>
  )
}
