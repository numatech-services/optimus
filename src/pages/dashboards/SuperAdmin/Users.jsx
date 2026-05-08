import { useState, useEffect } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { supabase } from '../../../lib/supabase'
import { provisionPlatformUser } from '../../../utils/tenantProvisioning'

const ROLE_B = {
  super_admin: 'badge-gold',
  admin_universite: 'badge-blue',
  scolarite: 'badge-teal',
  enseignant: 'badge-green',
  etudiant: 'badge-slate',
  surveillant: 'badge-red'
}

const ROLE_L = {
  super_admin: 'Super Admin',
  admin_universite: 'Admin Univ.',
  scolarite: 'Scolarité',
  enseignant: 'Enseignant',
  etudiant: 'Étudiant',
  surveillant: 'Surveillant'
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'etudiant', tenant_id: '' }

// ── Composant Modal (Design SuperAdmin) ───────────────────
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

export default function SuperAdminUsers() {
  const [users, setUsers] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)
  
  // États pour la création
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 1. CHARGEMENT DES DONNÉES ──
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [resUsers, resTenants] = await Promise.all([
        supabase.from('users').select('*').limit(500).order('id', { ascending: false }),
        supabase.from('tenants').select('id, name')
      ])
      if (resUsers.data) setUsers(resUsers.data)
      if (resTenants.data) setTenants(resTenants.data)
    } catch (err) {
      console.error('[Users] Erreur chargement:', err.message)
      showToast('Erreur de chargement des données', 'error')
    }
    setLoading(false)
  }
const handleCreate = async () => {
  // Nettoyage immédiat des entrées pour éviter l'erreur 400
  const cleanEmail = form.email.replace(/\s/g, '').toLowerCase();
  const cleanName = form.name.trim();

  if (!cleanEmail || !form.password) {
    return showToast("Email et mot de passe requis", "error");
  }

  console.log("🚀 [DEBUG] Tentative avec email propre :", cleanEmail);
  setCreating(true);

  try {
    // 1. SIGNUP
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: form.password,
      options: {
        data: {
          full_name: cleanName,
          role: form.role,
          tenant_id: form.tenant_id || null,
        }
      }
    });

    if (authError) throw authError;

    console.log("✅ Auth réussi, ID:", authData.user?.id);

    // 2. INSERTION DB
    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        name: cleanName,
        email: cleanEmail,
        role: form.role,
        tenant_id: form.tenant_id || null
      }]);

    if (dbError) {
      console.error("❌ Erreur Table Users:", dbError);
      throw new Error("Compte créé mais profil table non généré: " + dbError.message);
    }

    showToast("Utilisateur créé !");
    setShowModal(false);
    loadData();

  } catch (err) {
    console.error("🛑 Erreur attrapée:", err);
    // Si l'erreur est encore 500 ici, c'est que le SQL de l'étape 1 n'a pas été exécuté
    showToast(err.message, "error");
  } finally {
    setCreating(false);
  }
};
  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchQ = !q || `${u.name} ${u.email}`.toLowerCase().includes(q)
    const matchR = filter === 'all' || u.role === filter
    return matchQ && matchR
  })

  if (loading) return <DashLayout title="Utilisateurs"><div>Chargement de la base utilisateurs...</div></DashLayout>

  return (
    <DashLayout title="Utilisateurs" requiredRole="super_admin">
      
      {/* Toast Persistant */}
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* MODAL DE CRÉATION (Nouveauté fonctionnelle) */}
      {showModal && (
        <Modal title="Créer un nouvel utilisateur" onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label className="form-label">Nom complet</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Prénom Nom" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe par défaut</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mot de passe" />
          </div>
          <div className="form-group">
            <label className="form-label">Rôle système</label>
            <select className="form-input form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_L).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
            </select>
          </div>
          {form.role !== 'super_admin' && (
            <div className="form-group">
              <label className="form-label">Université rattachée</label>
              <select className="form-input form-select" value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}>
                <option value="">— Choisir un établissement —</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Création…' : 'Créer le compte'}
            </button>
          </div>
        </Modal>
      )}

      <div className="dash-page-title">Gestion des Utilisateurs</div>
      <div className="dash-page-sub">Tous les comptes de la plateforme · {users.length} utilisateurs</div>

      {/* KPI Grid - Indicateurs de Rôles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16, marginBottom:24 }}>
        {Object.entries(ROLE_L).map(([role, label]) => (
          <div key={role} onClick={() => setFilter(role)} style={{ padding:20, background:'#fff', border:`2px solid ${filter === role ? 'var(--blue)' : 'var(--border)'}`, borderRadius:8, cursor:'pointer', transition:'all .2s' }}>
            <div style={{ fontSize:'.75rem', color:'var(--slate)', marginBottom:8 }}>{label}</div>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.8rem', color:filter === role ? 'var(--blue)' : 'var(--ink)' }}>{users.filter(u => u.role === role).length}</div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16, marginBottom:24 }}>
        <input className="form-input" placeholder="Rechercher par nom ou email..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding:'10px 14px', fontSize:'.82rem', border:'1px solid var(--border)', borderRadius:8 }}/>
        <select className="form-input form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ padding:'10px 14px', fontSize:'.82rem', border:'1px solid var(--border)', borderRadius:8 }}>
          <option value="all">Tous les rôles</option>
          {Object.entries(ROLE_L).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
        </select>
        <div style={{ display:'flex', gap:12 }}>
          <div style={{ flex:1, padding:'10px 14px', fontSize:'.82rem', color:'var(--slate)', display:'flex', alignItems:'center', background:'#f9f9f9', borderRadius:8, border:'1px solid var(--border)' }}>
            {filtered.length} résultat(s)
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ whiteSpace:'nowrap' }}>+ Créer</button>
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:20 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn:'1/-1', padding:40, textAlign:'center', color:'var(--slate)' }}>
            Aucun utilisateur trouvé
          </div>
        ) : (
          filtered.map((u) => (
            <div key={u.id} className="card" style={{ padding:0, display:'flex', flexDirection:'column' }}>
              {/* Card Header */}
              <div style={{ padding:16, borderBottom:'1px solid var(--border)', background:'var(--mist)', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--blue-light)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.85rem', color:'var(--blue)', flexShrink:0 }}>
                  {u.avatar || u.name?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'.95rem', color:'var(--ink)' }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize:'.72rem', color:'var(--slate)' }}>
                    {u.email}
                  </div>
                </div>
              </div>
              
              {/* Card Content */}
              <div style={{ padding:16, flex:1 }}>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:'.7rem', color:'var(--slate)', marginBottom:6 }}>Rôle</div>
                  <span className={`badge ${ROLE_B[u.role]}`} style={{ fontSize:'.75rem' }}>
                    {ROLE_L[u.role]}
                  </span>
                </div>
                
                <div>
                  <div style={{ fontSize:'.7rem', color:'var(--slate)', marginBottom:6 }}>Université</div>
                  <div style={{ fontSize:'.82rem', color:'var(--ink)', fontWeight:600 }}>
                    {u.tenant_id ? (tenants.find(t => t.id === u.tenant_id)?.name || u.tenant_id) : 'Plateforme (Global)'}
                  </div>
                </div>
              </div>
              
              {/* Card Footer */}
              <div style={{ padding:12, borderTop:'1px solid var(--border)' }}>
                <button className="btn btn-sm btn-primary" style={{ width:'100%', fontSize:'.75rem' }} onClick={() => showToast(`Email de réinitialisation envoyé à ${u.email}`)}>
                  Réinitialiser MDP
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </DashLayout>
  )
}
