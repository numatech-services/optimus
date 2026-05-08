import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Client Supabase

export default function BadgesPage() {
  const navigate = useNavigate()
  const { user } = useAuth() // <--- AJOUTER CECI
  const tid = user?.tenant_id // <--- AJOUTER CECI (C'est ce qui manquait !)
  // ── États des données Supabase ──
  const [dbData, setDbData] = useState({
    badges: [],
    students: [],
    paiements: []
  })
  const [loading, setLoading] = useState(true)
  
  // ── États UI (Design d'origine conservé) ──
  const [search, setSearch] = useState('')
  const [filterSt, setFilterSt] = useState('ALL')
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState({ studentName:'', matricule:'', cardNumber:'', cardType:'RFID' })
  const [toast, setToast]       = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),3000) }

  // ── 1. CHARGEMENT RÉEL ──
  useEffect(() => {
    fetchBadgesData()
  }, [])

  const fetchBadgesData = async () => {
    setLoading(true)
    try {
      const [resBadges, resStudents, resPaiements] = await Promise.all([
        supabase.from('badges').select('*').limit(500),
        supabase.from('students').select('*').limit(500),
        supabase.from('paiements').select('*').limit(500)
      ])

      setDbData({
        badges: resBadges.data || [],
        students: resStudents.data || [],
        paiements: resPaiements.data || []
      })
    } catch (err) {
      console.error("Erreur de chargement des badges:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE D'ENRICHISSEMENT (Zéro omission) ──
  const enriched = useMemo(() => {
    return dbData.badges.map(b => {
      // Lien avec l'étudiant pour récupérer le nom
      const student = dbData.students.find(s => s.id === b.student_id)
      const studentName = student ? `${student.prenom} ${student.nom}` : 'Inconnu'
      
      // Calcul des impayés (Mapping -> Variables UI)
      const pays    = dbData.paiements.filter(p => p.student_id === b.student_id)
      const retard  = pays.filter(p => p.statut === 'EN RETARD')
      const attente = pays.filter(p => p.statut === 'EN ATTENTE')
      
      const montantDu = retard.reduce((s,p)=>s + (p.montant || 0), 0) + 
                        attente.reduce((s,p)=>s + (p.montant || 0), 0)
      
      const maxRetard = Math.max(0, ...retard.map(p => p.delai_retard || 0))
      
      return { 
        ...b, 
        studentName, 
        matricule: b.student_id,
        cardNumber: b.card_number,
        cardType: b.card_type,
        issuedAt: b.issued_at,
        expiresAt: b.expires_at,
        blockedReason: b.blocked_reason,
        montantDu, 
        maxRetard 
      }
    })
  }, [dbData])

  const filtered = enriched.filter(b => {
    const q = search.toLowerCase()
    const matchQ = !q || b.studentName.toLowerCase().includes(q) || b.matricule.toLowerCase().includes(q) || b.cardNumber.toLowerCase().includes(q)
    const matchSt = filterSt==='ALL' || (filterSt==='ACTIVE'&&b.status==='ACTIVE') || (filterSt==='BLOCKED'&&b.status==='BLOCKED') || (filterSt==='IMPAYE'&&b.montantDu>0)
    return matchQ && matchSt
  })

  // Statistiques KPIs 
  const actifs       = dbData.badges.filter(b=>b.status==='ACTIVE').length
  const bloqués      = dbData.badges.filter(b=>b.status==='BLOCKED').length
  const avecImpayes  = enriched.filter(b=>b.montantDu>0&&b.status==='ACTIVE').length
  const sansInscrits = Math.max(0, dbData.students.length - dbData.badges.length)

  // ── 3. ACTIONS SUPABASE RÉELLES ──
const toggleBadge = async (badgeId, reason = '') => {
  // 1. Trouver le badge localement pour connaître son état actuel
  const currentBadge = dbData.badges.find(b => b.id === badgeId);
  if (!currentBadge) return;

  // 2. Déterminer le nouveau statut (on bascule entre ACTIF et SUSPENDU)
  // Attention : on compare avec 'ACTIF' (le nom dans votre SQL)
  const isCurrentlyActive = currentBadge.status === 'ACTIF';
  const newStatus = isCurrentlyActive ? 'SUSPENDU' : 'ACTIF';

  try {
    const { error } = await supabase
      .from('badges')
      .update({
        status: newStatus,
        // On active le blocage_impayes si on suspend, on l'enlève si on réactive
        blocage_impayes: isCurrentlyActive, 
        dernier_controle: new Date().toISOString()
      })
      .eq('id', badgeId);

    if (error) {
      console.error("Erreur lors de la mise à jour :", error.message);
      showToast(`Erreur : ${error.message}`);
    } else {
      showToast(isCurrentlyActive ? 'Accès suspendu 🚫' : 'Accès réactivé ✅');
      // Recharger les données pour mettre à jour l'affichage
      fetchBadgesData();
    }
  } catch (err) {
    console.error("Erreur système :", err);
  }
};

 const addBadge = async () => {
  console.log("--- Début addBadge ---");
  console.log("Valeurs du formulaire:", form);
  console.log("Tenant ID (tid):", tid);

  if (!form.matricule || !form.cardNumber) {
    console.error("Champs manquants");
    showToast('Veuillez remplir le matricule et le numéro de carte');
    return;
  }

  const payload = {
    student_id: form.matricule,
    matricule: form.matricule,
    card_number: form.cardNumber,
    card_type: form.cardType || 'RFID',
    status: 'ACTIF', // Respecte la contrainte CHECK SQL
    issued_at: new Date().toISOString().slice(0, 10),
    expires_at: '2027-06-30',
    paiement_statut: 'OK',
    montant_impaye: 0,
    blocage_impayes: false,
    tenant_id: tid // Maintenant défini
  };

  console.log("Payload envoyé à Supabase:", payload);

  try {
    const { data, error, status, statusText } = await supabase
      .from('badges')
      .insert([payload])
      .select(); // .select() aide souvent à confirmer l'insertion

    // Log de la réponse brute pour comprendre le "type: opaque"
    console.log("Réponse Supabase - Status:", status, statusText);

    if (error) {
      console.error("Erreur de la base de données:", error);
      showToast(`Erreur SQL: ${error.message}`);
      return;
    }

    console.log("Insertion réussie, données retournées:", data);

    setForm({ studentName: '', matricule: '', cardNumber: '', cardType: 'RFID' });
    setShowAdd(false);
    showToast('Badge créé et activé sur le portique');
    fetchBadgesData();

  } catch (err) {
    console.error("Exception attrapée dans addBadge:", err);
    showToast('Erreur critique système');
  }
};
  if (loading) return <DashLayout title="Badges"><div>Synchronisation des terminaux de contrôle d'accès...</div></DashLayout>

  return (
    <DashLayout title="Badges & Cartes" requiredRole="admin_universite">
      
      {/* Toast Design Origine */}
      {toast && (
        <div className="fade-in" style={{position:'fixed',top:72,right:24,zIndex:9999,background:'var(--green)',color:'#fff',padding:'12px 20px',borderRadius:10,fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>
          ✅ {toast}
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:900, fontSize:'1.6rem', color:'var(--ink)', margin:0 }}>🪪 Badges & Cartes d'accès</h1>
          <p style={{ fontSize:'.85rem', color:'var(--slate)', marginTop:4 }}>Attribution et gestion des badges RFID — Temps réel</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-primary" onClick={()=>setShowAdd(!showAdd)} style={{ borderRadius:10 }}>
                {showAdd ? 'Fermer le formulaire' : '+ Nouveau badge'}
            </button>
        </div>
      </div>

      {/* ── SECTION STATS HORIZONTALE MODERNE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {[
          { label: 'Badges actifs', val: actifs, icon: '✅', color: '#10b981', bg: '#ecfdf5', sub: `Sur ${dbData.students.length} inscrits` },
          { label: 'Badges bloqués', val: bloqués, icon: '🚫', color: '#ef4444', bg: '#fef2f2', sub: 'Impayés + sanctions' },
          { label: 'Avec impayés', val: avecImpayes, icon: '⚠️', color: '#f59e0b', bg: '#fffbeb', sub: 'Accès à risque' },
          { label: 'Non enrôlés', val: sansInscrits, icon: '➕', color: '#64748b', bg: '#f8fafc', sub: 'À assigner' },
        ].map((item, i) => (
          <div key={i} style={{ 
            background: '#fff', padding: '18px', borderRadius: '14px', border: '1px solid var(--border)', 
            display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' 
          }}>
            <div style={{ 
                width: 46, height: 46, borderRadius: 12, background: item.bg, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' 
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing:'0.5px' }}>{item.label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--ink)', lineHeight:1.2 }}>{item.val}</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerte Impayés (Design Intact) */}
      {avecImpayes > 0 && (
        <div style={{display:'flex',alignItems:'center',gap:12,background:'var(--amber-light)',border:'1px solid rgba(212,137,26,.25)',borderLeft:'4px solid var(--amber)',borderRadius:10,padding:'12px 18px',marginBottom:24}}>
          <span style={{fontSize:'1.3rem'}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,color:'var(--amber)',fontSize:'.88rem'}}>{avecImpayes} badge(s) actif(s) avec impayés en cours</div>
            <div style={{fontSize:'.78rem',color:'var(--ink-60)',marginTop:2}}>Ces badges ont toujours accès au portique. Gérer les blocages dans le module dédié.</div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={()=>navigate('/dashboard/uni-admin/impayes-acces')}>Gérer →</button>
        </div>
      )}

      <div className="card">
        {/* Barre de recherche et filtres (Design Intact) */}
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div style={{ fontWeight:800, fontSize:'.9rem', color:'var(--ink)' }}>Liste des badges ({filtered.length})</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <input className="form-input" placeholder="Nom, matricule, N° carte…" value={search} onChange={e=>setSearch(e.target.value)} style={{width:200, borderRadius:8}}/>
            <select className="form-input form-select" value={filterSt} onChange={e=>setFilterSt(e.target.value)} style={{width:160, borderRadius:8}}>
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="BLOCKED">Bloqués</option>
              <option value="IMPAYE">Avec impayés</option>
            </select>
          </div>
        </div>

        {/* Formulaire d'ajout (Design Intact) */}
        {showAdd && (
          <div style={{padding:'20px 24px',background:'var(--mist)',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,marginBottom:14,fontSize:'.9rem', color:'var(--primary)'}}>Nouveau badge RFID</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:14}}>
              {[['Matricule','matricule','ETU-20XX-XXXX'],['N° Carte RFID','cardNumber','A4F2B891']].map(([label,key,ph])=>(
                <div className="form-group" key={key} style={{margin:0}}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" placeholder={ph} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/>
                </div>
              ))}
              <div className="form-group" style={{margin:0}}>
                <label className="form-label">Type</label>
                <select className="form-input form-select" value={form.cardType} onChange={e=>setForm(p=>({...p,cardType:e.target.value}))}>
                  <option value="RFID">RFID</option>
                  <option value="QR">QR Code</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={addBadge}>Créer et activer</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShowAdd(false)}>Annuler</button>
            </div>
          </div>
        )}

        {/* Tableau des Badges (Design Intact) */}
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Étudiant</th><th>Matricule</th><th>N° Carte RFID</th><th>Type</th><th>Paiements</th><th>Portique</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={i} style={{ background: b.status === 'SUSPENDU' ? 'rgba(192,57,43,.03)' : '' }}>
                  <td>
                    <strong style={{ color: 'var(--ink)', fontSize: '.88rem' }}>{b.studentName}</strong>
                    <div style={{ fontSize: '.7rem', color: 'var(--slate)', marginTop: 1 }}>Assigné {b.issuedAt || '—'} · expire {b.expiresAt}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.75rem', color: 'var(--slate)' }}>{b.matricule}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '.78rem', background: 'var(--mist)', padding: '4px 8px', borderRadius: 4 }}>{b.cardNumber}</span>
                  </td>
                  <td><span className="badge badge-slate" style={{ fontSize: '.65rem' }}>{b.cardType || 'RFID'}</span></td>
                  <td>
                    {b.montantDu > 0 ? (
                      <div>
                        <span className={`badge badge-${b.maxRetard > 60 ? 'red' : 'gold'}`} style={{ fontSize: '.65rem' }}>
                          {b.montantDu.toLocaleString('fr')} XOF dû
                        </span>
                        <div style={{ fontSize: '.65rem', color: b.maxRetard > 60 ? 'var(--red)' : 'var(--amber)', marginTop: 2 }}>
                          {b.maxRetard > 0 ? `Retard ${b.maxRetard}j` : 'En attente'}
                        </div>
                      </div>
                    ) : <span className="badge badge-green" style={{ fontSize: '.65rem' }}>À jour ✓</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${b.status === 'ACTIF' ? 'green' : 'red'}`} style={{ fontSize: '.7rem' }}>
                      {b.status === 'ACTIF' ? '✅ Autorisé' : '🚫 Bloqué'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-sm" 
                        style={{ 
                          fontSize: '.72rem', 
                          background: b.status === 'ACTIF' ? 'var(--red-light)' : 'var(--green-light)', 
                          color: b.status === 'ACTIF' ? 'var(--red)' : 'var(--green)' 
                        }}
                        onClick={() => toggleBadge(b.id)}
                      >
                        {b.status === 'ACTIF' ? '🚫 Bloquer' : '✅ Activer'}
                      </button>
                      {b.montantDu > 0 && b.status === 'ACTIF' && (
                        <button className="btn btn-sm btn-secondary" style={{ fontSize: '.65rem' }} onClick={() => navigate('/dashboard/uni-admin/impayes-acces')}>💳</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Aucun badge trouvé</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Pied de tableau (Design Intact) */}
        <div style={{padding:'10px 20px',borderTop:'1px solid var(--border)',background:'var(--mist)',borderRadius:'0 0 12px 12px',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',fontSize:'.8rem',color:'var(--slate)'}}>
          <span><strong style={{color:'var(--green)'}}>{actifs}</strong> actifs · <strong style={{color:'var(--red)'}}>{bloqués}</strong> bloqués · <strong style={{color:'var(--amber)'}}>{avecImpayes}</strong> avec impayés</span>
          <div style={{marginLeft:'auto',fontSize:'.75rem'}}>💡 Synchronisation temps réel avec les portiques IP</div>
        </div>
      </div>
    </DashLayout>
  )
}