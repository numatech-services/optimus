import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { exportCSV } from '../../../hooks/useExportData'

const CATEGORIES = ['Général','Sciences','Droit','Médecine','Informatique','Économie','Lettres','Histoire','Langues']

// --- Composants Icones (SVG Clean) ---
const IconBook = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
const IconClock = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const IconSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>

export default function BibliothequeDash() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  const [tab, setTab] = useState('catalogue')
  const [ouvrages, setOuvrages] = useState([])
  const [emprunts, setEmprunts] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [formO, setFormO] = useState({ titre:'', auteur:'', isbn:'', categorie:'Général', exemplaires:1, emplacement:'' })
  const [formE, setFormE] = useState({ ouvrage_id:'', student_id:'', date_retour_prevue:'' })

  const load = async () => {
    setLoading(true)
    const [rO, rE, rS] = await Promise.all([
      supabase.from('ouvrages').select('*').eq('tenant_id', tid).order('titre').limit(500),
      supabase.from('emprunts').select('*, ouvrages(titre, auteur), students(nom, prenom, matricule)').eq('tenant_id', tid).order('date_emprunt', { ascending: false }).limit(500),
      supabase.from('students').select('id, nom, prenom, matricule').eq('tenant_id', tid).limit(500),
    ])
    if (rO.data) setOuvrages(rO.data)
    if (rE.data) setEmprunts(rE.data)
    if (rS.data) setStudents(rS.data)
    setLoading(false)
  }
  useEffect(() => { if (tid) load() }, [tid])

  const stats = { 
    ouvrages: ouvrages.length, 
    exemplaires: ouvrages.reduce((s, o) => s + (o.exemplaires||0), 0), 
    empruntes: emprunts.filter(e => e.statut === 'EN_COURS').length, 
    retards: emprunts.filter(e => e.statut === 'EN_RETARD').length 
  }
  
  const filteredO = ouvrages.filter(o => { 
    if (catFilter !== 'all' && o.categorie !== catFilter) return false; 
    if (search && !o.titre.toLowerCase().includes(search.toLowerCase()) && !(o.auteur||'').toLowerCase().includes(search.toLowerCase())) return false; 
    return true 
  })

  // Handlers CRUD (inchangés)
  const handleAddOuvrage = async () => { if (!formO.titre) return; await supabase.from('ouvrages').insert([{ ...formO, disponibles: formO.exemplaires, tenant_id: tid }]); setModal(null); load() }
  const handleEmprunt = async () => { if (!formE.ouvrage_id || !formE.student_id || !formE.date_retour_prevue) return; if (new Date(formE.date_retour_prevue) <= new Date()) { alert('La date de retour doit être dans le futur'); return; } await supabase.from('emprunts').insert([{ ...formE, statut: 'EN_COURS', tenant_id: tid }]); setModal(null); load() }
const handleRetour = async (empruntId) => {
  try {
    // 1. Récupérer l'ouvrage_id associé à cet emprunt avant de marquer comme rendu
    const { data: emprunt, error: e1 } = await supabase
      .from('emprunts')
      .select('ouvrage_id')
      .eq('id', empruntId)
      .single()

    if (e1) throw e1

    // 2. Mettre à jour le statut de l'emprunt
    const { error: e2 } = await supabase
      .from('emprunts')
      .update({ 
        statut: 'RENDU', 
        date_retour_effective: new Date().toISOString().split('T')[0] 
      })
      .eq('id', empruntId)

    if (e2) throw e2

    // 3. Incrémenter le stock de l'ouvrage (disponibles + 1)
    // On utilise rpc pour une opération atomique ou un update classique
    const { data: ouvrage } = await supabase
      .from('ouvrages')
      .select('disponibles')
      .eq('id', emprunt.ouvrage_id)
      .single()

    await supabase
      .from('ouvrages')
      .update({ disponibles: (ouvrage?.disponibles || 0) + 1 })
      .eq('id', emprunt.ouvrage_id)

    // 4. Recharger les données pour rafraîchir l'UI
    load()
  } catch (err) {
    console.error("Erreur lors du retour:", err.message)
    alert("Impossible d'enregistrer le retour.")
  }
}
  const handleDeleteO = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('ouvrages').delete().eq('id', id); load() }

  if (loading) return <DashLayout title="Bibliothèque"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Bibliothèque">
      <div className="dash-page-title">Bibliothèque universitaire</div>
      <div className="dash-page-sub">Gestion centralisée du catalogue et des flux d'emprunts</div>

      {/* Stats Horizontales Modernisées */}
      <div className="kpi-grid-modern">
        {[
          { l:'Catalogue', v:stats.ouvrages, sub:'Ouvrages uniques', color:'var(--blue)' },
          { l:'Volume', v:stats.exemplaires, sub:'Exemplaires totaux', color:'var(--slate)' },
          { l:'Actifs', v:stats.empruntes, sub:'Emprunts en cours', color:'var(--green)' },
          { l:'Retards', v:stats.retards, sub:'Actions requises', color:stats.retards > 0 ? '#E10600' : 'var(--slate)' }
        ].map((k,i) => (
          <div key={i} className="kpi-card-horizontal">
            <div className="kpi-content">
                <span className="kpi-label-mini">{k.l}</span>
                <div className="kpi-value-mini" style={{ color:k.color }}>{k.v}</div>
                <span className="kpi-sub-mini">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="tab-container-modern">
        <div className="tab-buttons">
          <button onClick={() => setTab('catalogue')} className={`tab-link ${tab==='catalogue'?'active':''}`}><IconBook /> Catalogue</button>
          <button onClick={() => setTab('emprunts')} className={`tab-link ${tab==='emprunts'?'active':''}`}>Flux d'emprunts</button>
          <button onClick={() => setTab('retards')} className={`tab-link ${tab==='retards'?'active':''}`}>Signalements retards</button>
          <button onClick={() => setTab('historique')} className={`tab-link ${tab==='historique'?'active':''}`}>Historique</button>
        </div>
        <div className="tab-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setModal('ouvrage')}>+ Ouvrage</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('emprunt')}>+ Emprunt</button>
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(ouvrages, [], 'catalogue')}>Export CSV</button>
        </div>
      </div>

      {tab === 'catalogue' && <>
        <div className="filter-bar-modern">
          <div className="search-input-wrapper">
            <IconSearch />
            <input placeholder="Rechercher titre ou auteur..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="cat-scroll">
            {['all',...CATEGORIES].map(c => (
              <button key={c} onClick={() => setCatFilter(c)} className={`filter-tag ${catFilter===c?'active':''}`}>
                {c==='all'?'Toutes catégories':c}
              </button>
            ))}
          </div>
        </div>
        
        <div className="card table-card">
          <div className="table-wrap">
            <table role="table">
              <thead><tr><th>Ouvrage</th><th>Catégorie</th><th>Disponibilité</th><th>Localisation</th><th></th></tr></thead>
              <tbody>
                {filteredO.map((o,i) => (
                  <tr key={i}>
                    <td>
                        <div style={{ fontWeight:600, color:'var(--ink)' }}>{o.titre}</div>
                        <div style={{ fontSize:'.75rem', color:'var(--slate)' }}>{o.auteur || 'Auteur inconnu'} • {o.isbn}</div>
                    </td>
                    <td><span className="badge-modern">{o.categorie}</span></td>
                    <td>
                        <div className="stock-info">
                            <span className={`stock-dot ${o.disponibles>0?'bg-green':'bg-red'}`}></span>
                            <b>{o.disponibles}</b> / {o.exemplaires}
                        </div>
                    </td>
                    <td className="text-muted" style={{ fontSize:'.8rem' }}>{o.emplacement||'Non assigné'}</td>
                    <td style={{ textAlign:'right' }}>
                        <button className="btn-icon-danger" onClick={() => handleDeleteO(o.id)}><IconTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {(tab==='emprunts'||tab==='retards'||tab==='historique') && (
        <div className="card table-card">
          <div className="table-wrap">
            <table role="table">
              <thead><tr><th>Étudiant</th><th>Ouvrage</th><th>Date Emprunt</th><th>Échéance</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {emprunts.filter(e => tab==='retards'?e.statut==='EN_RETARD':tab==='emprunts'?e.statut==='EN_COURS':true).map((e,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:600 }}>{e.students?`${e.students.prenom} ${e.students.nom}` : 'N/A'}</td>
                    <td>{e.ouvrages?.titre}</td>
                    <td>{new Date(e.date_emprunt).toLocaleDateString('fr-FR')}</td>
                    <td><span style={e.statut==='EN_RETARD'?{color:'red',fontWeight:700}:{}}>{new Date(e.date_retour_prevue).toLocaleDateString('fr-FR')}</span></td>
                    <td><span className={`status-tag ${e.statut.toLowerCase()}`}>{e.statut.replace('_',' ')}</span></td>
                    <td>{e.statut!=='RENDU' && <button className="btn btn-sm btn-primary-outline" onClick={() => handleRetour(e.id)}>Retourner</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Modernisée avec Glassmorphism */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{modal === 'ouvrage' ? 'Nouveau Référencement' : 'Nouvelle Transaction'}</h3>
              <button onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {modal === 'ouvrage' ? (
                <>
                  <div className="form-group"><label>Titre de l'œuvre</label><input className="form-input" value={formO.titre} onChange={e => setFormO(p => ({...p, titre:e.target.value}))} /></div>
                  <div className="grid-2">
                    <div className="form-group"><label>Auteur</label><input className="form-input" value={formO.auteur} onChange={e => setFormO(p => ({...p, auteur:e.target.value}))} /></div>
                    <div className="form-group"><label>ISBN</label><input className="form-input" value={formO.isbn} onChange={e => setFormO(p => ({...p, isbn:e.target.value}))} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group"><label>Catégorie</label><select className="form-input" value={formO.categorie} onChange={e => setFormO(p => ({...p, categorie:e.target.value}))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                    <div className="form-group"><label>Volume Stock</label><input className="form-input" type="number" value={formO.exemplaires} onChange={e => setFormO(p => ({...p, exemplaires:parseInt(e.target.value)||1}))} /></div>
                  </div>
                  <div className="form-group"><label>Emplacement (Rayonnage)</label><input className="form-input" value={formO.emplacement} onChange={e => setFormO(p => ({...p, emplacement:e.target.value}))} /></div>
                  <button className="btn btn-primary btn-block" onClick={handleAddOuvrage}>Confirmer l'ajout</button>
                </>
              ) : (
                <>
                  <div className="form-group"><label>Sélectionner l'ouvrage</label><select className="form-input" value={formE.ouvrage_id} onChange={e => setFormE(p => ({...p, ouvrage_id:e.target.value}))}><option value="">---</option>{ouvrages.filter(o => o.disponibles>0).map(o => <option key={o.id} value={o.id}>{o.titre}</option>)}</select></div>
                  <div className="form-group"><label>Étudiant bénéficiaire</label><select className="form-input" value={formE.student_id} onChange={e => setFormE(p => ({...p, student_id:e.target.value}))}><option value="">---</option>{students.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}</select></div>
                  <div className="form-group"><label>Date de retour exigée</label><input className="form-input" type="date" value={formE.date_retour_prevue} onChange={e => setFormE(p => ({...p, date_retour_prevue:e.target.value}))} /></div>
                  <button className="btn btn-primary btn-block" onClick={handleEmprunt}>Valider l'emprunt</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .kpi-grid-modern { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .kpi-card-horizontal { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 20px; transition: transform 0.2s; }
        .kpi-card-horizontal:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .kpi-label-mini { font-size: 0.75rem; color: var(--slate); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value-mini { font-size: 1.8rem; font-weight: 800; margin: 4px 0; line-height: 1; }
        .kpi-sub-mini { font-size: 0.75rem; color: var(--slate); }

        .tab-container-modern { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .tab-buttons { display: flex; gap: 24px; }
        .tab-link { background: none; border: none; padding: 12px 4px; font-size: 0.9rem; font-weight: 500; color: var(--slate); cursor: pointer; position: relative; display: flex; align-items: center; gap: 8px; }
        .tab-link.active { color: var(--blue); font-weight: 600; }
        .tab-link.active::after { content:''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--blue); }
        .tab-actions { display: flex; gap: 8px; padding-bottom: 8px; }

        .filter-bar-modern { display: flex; gap: 16px; margin-bottom: 20px; align-items: center; }
        .search-input-wrapper { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 0 12px; width: 300px; }
        .search-input-wrapper input { border: none; padding: 10px 8px; font-size: 0.9rem; outline: none; width: 100%; }
        .cat-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0; }
        .filter-tag { white-space: nowrap; background: #fff; border: 1px solid var(--border); border-radius: 20px; padding: 6px 14px; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
        .filter-tag:hover { border-color: var(--blue); color: var(--blue); }
        .filter-tag.active { background: var(--blue); color: #fff; border-color: var(--blue); }

        .table-card { border-radius: 12px; border: 1px solid var(--border); box-shadow: none; }
        .badge-modern { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
        .stock-info { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
        .stock-dot { width: 8px; height: 8px; border-radius: 50%; }
        .bg-green { background: #10b981; }
        .bg-red { background: #ef4444; }
        .btn-icon-danger { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 6px; border-radius: 6px; }
        .btn-icon-danger:hover { background: #fee2e2; color: #ef4444; }
        .status-tag { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; }
        .status-tag.rendu { background: #dcfce7; color: #15803d; }
        .status-tag.en_cours { background: #dbeafe; color: #1d4ed8; }
        .status-tag.en_retard { background: #fee2e2; color: #b91c1c; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-card { background: #fff; width: 100%; maxWidth: 500px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--ink); }
        .modal-header button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--slate); }
        .modal-body { padding: 24px; }
        .btn-block { width: 100%; padding: 12px; margin-top: 12px; font-weight: 600; }
        .btn-primary-outline { background: #fff; border: 1px solid var(--blue); color: var(--blue); padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: 0.2s; }
        .btn-primary-outline:hover { background: var(--blue); color: #fff; }
      `}</style>
    </DashLayout>
  )
}