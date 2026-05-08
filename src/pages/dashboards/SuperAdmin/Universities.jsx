import { useState, useMemo, useEffect } from 'react' // Ajout de useEffect
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Import client Supabase
import { buildTenantPayload, provisionSchoolWithAdmin, updateTenantWithDefaults } from '../../../utils/tenantProvisioning'

const STATUS_B  = { ACTIVE:'badge-green', SUSPENDED:'badge-red', SETUP:'badge-gold' }
const PLAN_COL  = { STARTER:'var(--slate)', STANDARD:'var(--blue)', PREMIUM:'var(--gold)', ENTERPRISE:'var(--teal)' }

// On garde INIT_UNIVS comme secours (fallback)
const INIT_UNIVS = [
  { id:'UNV-001', nom:'Université Abdou Moumouni', ville:'Niamey', pays:'Niger', plan:'ENTERPRISE', statut:'ACTIVE',
    etudiants:4200, enseignants:312, admin:'Dr. Moussa Issoufou', email:'admin@uam.ne',
    tel:'+227 20 31 56 78', modules:['scolarité','finances','accès','examens','surveillant'],
    createdAt:'2024-09-01', lastLogin:'2026-03-05T08:12:00', mrr:850000 },
]

const MODULES_LABELS = {
  scolarité:'Scolarité', finances:'Finances', accès:'Accès',
  examens:'Examens', surveillant:'Surveillance',
}

export default function SuperAdminUniversities() {
  const [univs,    setUnivs]   = useState([]) // On initialise à vide pour charger la BD
  const [loading,  setLoading] = useState(true)
  const [search,   setSearch]  = useState('')
  const [filterPl, setFilterPl]= useState('ALL')
  const [filterSt, setFilterSt]= useState('ALL')
  const [modal,    setModal]   = useState(null)
  const [toast,    setToast]   = useState(null)
  const [form,     setForm]    = useState({})

  // ── CHARGEMENT DE LA BASE DE DONNÉES ──
  useEffect(() => {
    fetchUniversities()
  }, [])

const fetchUniversities = async () => {
  setLoading(true)
  try {
    // On récupère les données fraîches
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .limit(500)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (data && data.length > 0) {
      const mapped = data.map(u => ({
        id: u.id,
        nom: u.name,
        pays: u.country,
        ville: u.country === 'Niger' ? 'Niamey' : '—',
        plan: u.plan || 'STARTER',
        statut: u.status || 'SETUP',
        etudiants: u.students_count || 0,
        enseignants: u.teachers_count || 0,
        mrr: u.mrr || 0,
        // DYNAMIQUE : On utilise u.modules de la base de données
        // Si u.modules est null ou vide, on met un tableau par défaut
        modules: Array.isArray(u.modules) && u.modules.length > 0 
          ? u.modules 
          : ['Scolarité'], 
        admin: 'Admin', // À lier plus tard avec une jointure users
        email: 'admin@univ.edu',
        tel: '—',
        createdAt: u.created_at?.slice(0, 10),
        lastLogin: 'Récent'
      }))
      
      console.log("Données mappées pour l'affichage :", mapped)
      setUnivs(mapped)
    } else {
      setUnivs(INIT_UNIVS)
    }
  } catch (err) {
    console.error('[Universities] Erreur de récupération:', err.message)
    showToast('Erreur lors du chargement des données', 'error')
    setUnivs(INIT_UNIVS)
  }
  setLoading(false)
}

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  const filtered = useMemo(() => univs.filter(u => {
    const q = search.toLowerCase()
    const mQ = !q || `${u.nom} ${u.ville} ${u.admin}`.toLowerCase().includes(q)
    const mP = filterPl==='ALL' || u.plan===filterPl
    const mS = filterSt==='ALL' || u.statut===filterSt
    return mQ && mP && mS
  }), [univs, search, filterPl, filterSt])

  const totalEtu = univs.reduce((s,u)=>s+u.etudiants,0)
  const totalMrr = univs.reduce((s,u)=>s+u.mrr,0)
  const nbActifs = univs.filter(u=>u.statut==='ACTIVE').length

  const openAdd = () => {
    setForm({ nom:'',ville:'',pays:'Niger',plan:'STANDARD',statut:'SETUP',admin:'',email:'',tel:'',etudiants:0,enseignants:0,modules:['scolarité'],mrr:0, adminPassword:'' })
    setModal({ mode:'add' })
  }

  const openEdit = (u) => { setForm({...u}); setModal({mode:'edit',univ:u}) }
// ── SAUVEGARDE RÉELLE SANS EDGE FUNCTIONS ──
const handleSave = async () => {
  console.log("--- DÉBUT SAUVEGARDE ---");
  console.log("Mode:", modal.mode);
  console.log("Données du formulaire (form):", form);
  console.log("Modules à envoyer:", form.modules);

  if (!form.nom?.trim() || !form.pays?.trim()) {
    showToast('Nom et pays sont requis', 'error');
    return;
  }

  setLoading(true);
  try {
    if (modal.mode === 'add') {
       // ... (ton code ADD ici)
       console.log("Tentative de création...");
       // Rajoute un log après l'insertion pour voir le tenant créé
    } else {
      // MODE UPDATE
      console.log("Tentative d'UPDATE sur l'ID:", form.id);
      
      const payload = {
        name: form.nom,
        country: form.pays,
        plan: form.plan,
        status: form.statut,
        students_count: form.etudiants,
        teachers_count: form.enseignants,
        mrr: form.mrr,
        modules: form.modules // C'est ici que ça doit partir
      };

      console.log("Payload envoyé à Supabase:", payload);

      const { data, error, count } = await supabase
        .from('tenants')
        .update(payload)
        .eq('id', form.id)
        .select(); // On ajoute .select() pour voir ce que la base a enregistré

      if (error) {
        console.error("ERREUR SUPABASE LORS DE L'UPDATE:", error);
        throw error;
      }

      console.log("RÉPONSE SUPABASE (Data enregistrée):", data);
      showToast('Mise à jour réussie');
    }

    setModal(null);
    fetchUniversities();
  } catch (err) {
    console.error("ERREUR CAPTURÉE:", err.message);
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
    console.log("--- FIN SAUVEGARDE ---");
  }
};

  // ── TOGGLE STATUT RÉEL SUPABASE ──
  const toggleStatut = async (id) => {
    const u = univs.find(x => x.id === id)
    const next = u.statut === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: next })
        .eq('id', id)

      if (!error) {
        showToast(`${u.nom} — statut → ${next}`)
        fetchUniversities()
      }
    } catch (err) {
      console.error("[Error]", err.message)
    }
  }

  if (loading) return <DashLayout title="Universités"><div></div></DashLayout>

  return (
    <DashLayout title="Universités" requiredRole="super_admin">
      {/* TOUT VOTRE JSX RESTE CI-DESSOUS STRICTEMENT IDENTIQUE */}
      {toast && /* role=status for screen readers */ (
        <div style={{ position:'fixed',top:24,right:24,zIndex:9999,padding:'12px 20px',borderRadius:10,
          background:toast.type==='error'?'var(--red)':'var(--green)',color:'#fff',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div className="card" style={{ maxWidth:600,width:'100%',maxHeight:'90vh',overflow:'auto',padding:0 }}>
            <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)',background:'var(--ink)',borderRadius:'12px 12px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'#fff' }}>
                {modal.mode==='view' ? modal.univ.nom : modal.mode==='add' ? 'Nouvelle université' : `Modifier — ${modal.univ?.nom}`}
              </div>
              <button onClick={()=>setModal(null)} style={{ background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',color:'#fff' }}>×</button>
            </div>
            <div style={{ padding:24 }}>
              {modal.mode === 'view' ? (
                // View mode
                <div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20 }}>
                    {[
                      ['Ville / Pays', `${modal.univ.ville}, ${modal.univ.pays}`],
                      ['Plan', modal.univ.plan],
                      ['Statut', modal.univ.statut],
                      ['Étudiants', modal.univ.etudiants.toLocaleString('fr')],
                      ['Enseignants', modal.univ.enseignants],
                      ['Admin', modal.univ.admin],
                      ['Email', modal.univ.email],
                      ['Téléphone', modal.univ.tel],
                      ['Créé le', modal.univ.createdAt],
                      ['MRR', `${(modal.univ.mrr/1000).toFixed(0)}K XOF`],
                    ].map(([k,v],i) => (
                      <div key={i} style={{ padding:'10px 14px',background:'var(--mist)',borderRadius:8 }}>
                        <div style={{ fontSize:'.72rem',color:'var(--slate)',marginBottom:3 }}>{k}</div>
                        <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',color:'var(--ink)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.82rem',color:'var(--slate)',marginBottom:8 }}>MODULES ACTIVÉS</div>
                    <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                      {modal.univ.modules.map(m => (
                        <span key={m} style={{ background:'var(--blue-light)',color:'var(--blue)',padding:'4px 10px',borderRadius:6,fontSize:'.78rem',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700 }}>
                          {MODULES_LABELS[m]||m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex',gap:8 }}>
                    <button className="btn btn-primary btn-sm" onClick={()=>openEdit(modal.univ)}>Modifier</button>
                    <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Fermer</button>
                  </div>
                </div>
              ) : (
                // Edit / Add mode
                <div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                    {[
                      ['nom','Nom de l\'université','text'],
                      ['ville','Ville','text'],
                      ['pays','Pays','text'],
                      ['admin','Nom administrateur','text'],
                      ['email','Email admin','email'],
                      ['tel','Téléphone','text'],
                      ['etudiants','Nb étudiants','number'],
                      ['enseignants','Nb enseignants','number'],
                      ['mrr','MRR (XOF)','number'],
                    ].map(([key,label,type]) => (
                      <div className="form-group" key={key}>
                        <label className="form-label">{label}</label>
                        <input className="form-input" type={type} value={form[key]||''}
                          onChange={e=>setForm(p=>({...p,[key]:type==='number'?Number(e.target.value):e.target.value}))}/>
                      </div>
                    ))}
                    <div className="form-group">
                      <label className="form-label">Plan</label>
                      <select className="form-input form-select" value={form.plan||'STANDARD'} onChange={e=>setForm(p=>({...p,plan:e.target.value}))}>
                        {['STARTER','STANDARD','PREMIUM','ENTERPRISE'].map(p=><option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Statut</label>
                      <select className="form-input form-select" value={form.statut||'SETUP'} onChange={e=>setForm(p=>({...p,statut:e.target.value}))}>
                        {['ACTIVE','SETUP','SUSPENDED'].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  {modal.mode === 'add' && (
                    <div className="form-group">
                      <label className="form-label">Mot de passe temporaire admin</label>
                      <input
                        className="form-input"
                        type="password"
                        value={form.adminPassword || ''}
                        onChange={e=>setForm(p=>({...p,adminPassword:e.target.value}))}
                        placeholder="8 caractères minimum"
                      />
                    </div>
                  )}
                  <div className="form-group" style={{ marginTop:8 }}>
                    <label className="form-label">Modules activés</label>
                    <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginTop:6 }}>
                      {Object.entries(MODULES_LABELS).map(([k,v]) => {
                        const isActive = (form.modules||[]).includes(k)
                        return (
                          <button key={k} type="button"
                            onClick={() => setForm(p=>({...p,modules:isActive?(p.modules||[]).filter(m=>m!==k):[...(p.modules||[]),k]}))}
                            style={{ appearance:'none', border:`1px solid ${isActive?'var(--blue)':'var(--border)'}`, background:isActive?'var(--blue-light)':'#fff', color:isActive?'var(--blue)':'var(--slate)', padding:'6px 12px', borderRadius:6, fontSize:'.82rem', fontWeight:700, cursor:'pointer', fontFamily:'Marianne,Roboto,sans-serif', transition:'all .15s' }}>
                            {v}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ display:'flex',gap:8,marginTop:20 }}>
                    <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
                    <button className="btn btn-secondary" onClick={()=>setModal(null)}>Annuler</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:8 }}>
        <div>
          <div className="dash-page-title">Universités partenaires</div>
          <div className="dash-page-sub">{univs.length} établissements · {totalEtu.toLocaleString('fr')} étudiants</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Ajouter une université</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16, marginBottom:24 }}>
        {[
          { label:'Établissements',    value:univs.length },
          { label:'Actifs',            value:nbActifs },
          { label:'Total étudiants',   value:totalEtu.toLocaleString('fr') },
          { label:'MRR total',         value:`${(totalMrr/1000).toFixed(0)}K XOF` },
        ].map((k,i) => (
          <div key={i} style={{ padding:20, background:'#fff', border:'1px solid var(--border)', borderRadius:8 }}>
            <div style={{ fontSize:'.75rem', color:'var(--slate)', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.8rem', color:'var(--blue)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16, marginBottom:24 }}>
        <input className="form-input" placeholder="Rechercher par nom, ville, admin…" value={search} onChange={e=>setSearch(e.target.value)} style={{ padding:'10px 14px', fontSize:'.82rem', border:'1px solid var(--border)', borderRadius:8 }}/>
        <select className="form-input form-select" value={filterPl} onChange={e=>setFilterPl(e.target.value)} style={{ padding:'10px 14px', fontSize:'.82rem', border:'1px solid var(--border)', borderRadius:8 }}>
          <option value="ALL">Tous les plans</option>
          {['STARTER','STANDARD','PREMIUM','ENTERPRISE'].map(p=><option key={p}>{p}</option>)}
        </select>
        <select className="form-input form-select" value={filterSt} onChange={e=>setFilterSt(e.target.value)} style={{ padding:'10px 14px', fontSize:'.82rem', border:'1px solid var(--border)', borderRadius:8 }}>
          <option value="ALL">Tous statuts</option>
          {['ACTIVE','SETUP','SUSPENDED'].map(s=><option key={s}>{s}</option>)}
        </select>
        <div style={{ padding:'10px 14px', fontSize:'.82rem', color:'var(--slate)', display:'flex', alignItems:'center', background:'#f9f9f9', borderRadius:8, border:'1px solid var(--border)' }}>
          {filtered.length} résultat(s)
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))', gap:20, marginBottom:20 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn:'1/-1', padding:40, textAlign:'center', color:'var(--slate)' }}>
            Aucune université trouvée
          </div>
        ) : (
          filtered.map((u,i) => (
            <div key={i} className="card" style={{ padding:0, display:'flex', flexDirection:'column' }}>
              {/* Card Header */}
              <div style={{ padding:16, borderBottom:'1px solid var(--border)', background:'var(--mist)' }}>
                <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'.95rem', color:'var(--ink)', marginBottom:4 }}>
                  {u.nom}
                </div>
                <div style={{ fontSize:'.72rem', color:'var(--slate)' }}>
                  {u.ville}, {u.pays}
                </div>
              </div>
              
              {/* Card Content */}
              <div style={{ padding:16, flex:1 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:'.7rem', color:'var(--slate)', marginBottom:4 }}>Plan</div>
                    <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'.88rem', color:PLAN_COL[u.plan]||'var(--slate)' }}>
                      {u.plan}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:'.7rem', color:'var(--slate)', marginBottom:4 }}>Statut</div>
                    <span className={`badge ${STATUS_B[u.statut]||'badge-slate'}`} style={{ fontSize:'.75rem' }}>
                      {u.statut}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize:'.7rem', color:'var(--slate)', marginBottom:4 }}>Étudiants</div>
                    <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'.88rem' }}>
                      {u.etudiants.toLocaleString('fr')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:'.7rem', color:'var(--slate)', marginBottom:4 }}>MRR</div>
                    <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'.88rem', color:u.mrr>0?'var(--green)':'var(--slate)' }}>
                      {u.mrr>0?`${(u.mrr/1000).toFixed(0)}K XOF`:'—'}
                    </div>
                  </div>
                </div>
                
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:'.7rem', color:'var(--slate)', marginBottom:6 }}>Admin</div>
                  <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.82rem', marginBottom:2 }}>
                    {u.admin}
                  </div>
                  <div style={{ fontSize:'.72rem', color:'var(--slate)' }}>
                    {u.email}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize:'.7rem', color:'var(--slate)', marginBottom:6 }}>Modules</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {u.modules.map(m => (
                      <span key={m} style={{ background:'var(--blue-light)', color:'var(--blue)', padding:'4px 8px', borderRadius:5, fontSize:'.7rem', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700 }}>
                        {MODULES_LABELS[m]||m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Card Footer */}
              <div style={{ padding:12, borderTop:'1px solid var(--border)', display:'flex', gap:6 }}>
                <button className="btn btn-sm btn-secondary" onClick={()=>setModal({mode:'view',univ:u})} style={{ flex:1, fontSize:'.75rem' }}>
                  Voir
                </button>
                <button className="btn btn-sm btn-secondary" onClick={()=>openEdit(u)} style={{ flex:1, fontSize:'.75rem' }}>
                  Modifier
                </button>
                <button className="btn btn-sm" onClick={()=>toggleStatut(u.id)}
                  style={{ flex:1, fontSize:'.75rem', background:u.statut==='ACTIVE'?'var(--red-light)':'var(--green-light)', color:u.statut==='ACTIVE'?'var(--red)':'var(--green)', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 }}>
                  {u.statut==='ACTIVE'?'Suspendre':'Activer'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </DashLayout>
  )
}
