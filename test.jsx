import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import useEscapeKey from '../../../hooks/useEscapeKey'
import { supabase } from '../../../lib/supabase'

// ── Configuration ──────────────────────────────────────────
const FILIERES = ['L1 Informatique','L2 Informatique','L3 Informatique','M1 Informatique','M2 Informatique',
  'L1 Droit','L2 Droit','L3 Droit','M1 Droit','L1 Sciences Économiques','L2 Sciences Économiques',
  'L3 Sciences Économiques','L1 Médecine','L2 Médecine','L3 Médecine','M1 Gestion','M2 Finance']
const STATUSES = ['ACTIF','SUSPENDU','DIPLÔMÉ','RETIRÉ']
const STATUS_BADGE = { ACTIF:'badge-green', SUSPENDU:'badge-red', 'DIPLÔMÉ':'badge-teal', RETIRÉ:'badge-slate' }
const EMPTY_FORM = { nom:'', prenom:'', email:'', telephone:'', dateNaissance:'', genre:'M',
  nationalite:'Sénégalaise', filiere:'L1 Informatique', niveau:'L1', annee:'2025-2026',
  status:'ACTIF', photo:null, photoPreview:null }

function genMatricule() {
  return 'ETU-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000+1000))
}

// ── Composants UI ──────────────────────────────────────────
function Modal({ title, onClose, width=560, children }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(10,15,30,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div className="card" style={{ width:'100%',maxWidth:width,borderRadius:14,padding:0,margin:'auto' }}>
        <div style={{ padding:'18px 24px',borderBottom:'1px solid #e8edf4',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff',borderRadius:'14px 14px 0 0',zIndex:1 }}>
          <div style={{ fontFamily:'Syne',fontWeight:800,fontSize:'1rem',color:'var(--ink)' }}>{title}</div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'1.5rem',cursor:'pointer',color:'var(--slate)',lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24,maxHeight:'75vh',overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, name, form, setForm, type='text', options, required }) {
  const val = form[name] ?? ''
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color:'var(--red)' }}> *</span>}</label>
      {options
        ? <select className="form-input form-select" value={val} onChange={e=>setForm(p=>({...p,[name]:e.target.value}))}>
            {options.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        : <input className="form-input" type={type} value={val} placeholder={label}
            onChange={e=>setForm(p=>({...p,[name]:e.target.value}))} />
      }
    </div>
  )
}

function StudentForm({ form, setForm }) {
  const photoRef = useRef()
  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(p => ({ ...p, photo: file, photoPreview: ev.target.result }))
    reader.readAsDataURL(file)
  }
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:20,padding:16,background:'var(--mist)',borderRadius:10 }}>
        <div onClick={()=>photoRef.current?.click()} style={{ width:72,height:72,borderRadius:'50%',overflow:'hidden',background:'#e0e8f0',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'2px dashed #cdd7e2',flexShrink:0,fontSize:'1.8rem' }}>
          {form.photoPreview ? <img src={form.photoPreview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : '📷'}
        </div>
        <div>
          <div style={{ fontWeight:600,color:'var(--ink)',fontSize:'.88rem',marginBottom:4 }}>Photo de l'étudiant</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={()=>photoRef.current?.click()}>
            {form.photoPreview ? '🔄 Changer la photo' : '📁 Choisir une photo'}
          </button>
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <Field label="Nom" name="nom" form={form} setForm={setForm} required />
        <Field label="Prénom" name="prenom" form={form} setForm={setForm} required />
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <Field label="Email" name="email" form={form} setForm={setForm} type="email" required />
        <Field label="Téléphone" name="telephone" form={form} setForm={setForm} type="tel" />
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <Field label="Date de naissance" name="dateNaissance" form={form} setForm={setForm} type="date" />
        <Field label="Genre" name="genre" form={form} setForm={setForm} options={['M','F']} />
      </div>
      <Field label="Nationalité" name="nationalite" form={form} setForm={setForm} />
      <div style={{ fontFamily:'Syne',fontWeight:700,fontSize:'.8rem',color:'var(--slate)',textTransform:'uppercase',letterSpacing:'.05em',margin:'16px 0 10px' }}>Informations académiques</div>
      <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:12 }}>
        <Field label="Filière" name="filiere" form={form} setForm={setForm} options={FILIERES} required />
        <Field label="Statut" name="status" form={form} setForm={setForm} options={STATUSES} />
      </div>
      <Field label="Année académique" name="annee" form={form} setForm={setForm} options={['2025-2026','2024-2025','2023-2024']} />
    </div>
  )
}

// ── Page principale ────────────────────────────────────────
export default function UniAdminStudents() {
  const { user, seedData } = useAuth()
  const navigate           = useNavigate()
  const tenantName = seedData?.tenants?.find(t=>t.id===user?.tenant)?.name || 'Mon Université'

  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilter] = useState('ALL')
  const [filterFiliere, setFilterFiliere] = useState('ALL')
  const [toast, setToast]       = useState(null)
  const [page, setPage]         = useState(1)
  const PER_PAGE = 8

  useEscapeKey(() => setModal(null))

  // ── 1. CHARGEMENT SQL ──
  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('nom', { ascending: true })

    if (data) {
      setStudents(data.map(s => ({
        ...s,
        telephone: s.tel,
        dateInscription: s.created_at?.slice(0,10)
      })))
    }
    setLoading(false)
  }

  const showToast = (msg, type='success') => {
    setToast({ msg, type }); setTimeout(()=>setToast(null), 3500)
  }

  // ── 2. CRUD PERSISTANT ──
  const handleSave = async () => {
    if (!form.nom || !form.prenom) return
    const payload = {
      nom: form.nom,
      prenom: form.prenom,
      email: form.email,
      tel: form.telephone,
      filiere: form.filiere,
      annee: form.annee, // Utilise le champ Année Académique du formulaire
      status: form.status,
      genre: form.genre
    }

    if (modal === 'add') {
      const { error } = await supabase.from('students').insert([{ id: genMatricule(), ...payload }])
      if (!error) showToast("Étudiant créé avec succès")
    } else {
      const { error } = await supabase.from('students').update(payload).eq('id', selected.id)
      if (!error) showToast("Dossier mis à jour")
    }
    setModal(null); fetchStudents()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('students').delete().eq('id', selected.id)
    if (!error) showToast("Étudiant supprimé", 'error')
    setModal(null); fetchStudents()
  }

  const handleToggleStatus = async (s) => {
    const next = s.status === 'ACTIF' ? 'SUSPENDU' : 'ACTIF'
    const { error } = await supabase.from('students').update({ status: next }).eq('id', s.id)
    if (!error) { showToast(`${s.prenom} → ${next}`); fetchStudents() }
  }

  const handleCSVImport = async (rows) => {
    const formatted = rows.map(r => ({
        id: genMatricule(),
        nom: r.nom,
        prenom: r.prenom,
        email: r.email,
        tel: r.telephone,
        filiere: r.filiere,
        annee: r.annee,
        status: 'ACTIF',
        genre: r.genre
    }))
    const { error } = await supabase.from('students').insert(formatted)
    if (!error) { showToast(`${rows.length} étudiants importés`); fetchStudents() }
  }

  // Filtrage & Pagination
  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch  = !q || `${s.prenom} ${s.nom} ${s.email} ${s.id}`.toLowerCase().includes(q)
    const matchStatus  = filterStatus === 'ALL' || s.status === filterStatus
    const matchFiliere = filterFiliere === 'ALL' || s.filiere === filterFiliere
    return matchSearch && matchStatus && matchFiliere
  })

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  const openAdd  = () => { setForm({ ...EMPTY_FORM }); setModal('add') }
  const openEdit = (s) => { setSelected(s); setForm({ ...s, telephone: s.tel }); setModal('edit') }
  const openView = (s) => { setSelected(s); setModal('view') }

  if (loading) return <DashLayout title="Étudiants"><div>Chargement de la base SQL...</div></DashLayout>

  return (
    <DashLayout title="Gestion des Étudiants" requiredRole="admin_universite">

      {toast && (
        <div className="fade-in" style={{ position:'fixed',top:24,right:24,zIndex:2000,padding:'12px 20px',borderRadius:10,background:toast.type==='error'?'var(--red)':'var(--green)',color:'#fff',fontFamily:'Syne',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.type==='error'?'🗑️':'✅'} {toast.msg}
        </div>
      )}

      {/* Modals Add/Edit */}
      {(modal==='add'||modal==='edit') && (
        <Modal title={modal==='add'?'➕ Ajouter un étudiant':'✏️ Modifier le dossier'} onClose={()=>setModal(null)} width={640}>
          <StudentForm form={form} setForm={setForm}/>
          <div style={{ display:'flex',gap:12,justifyContent:'flex-end',marginTop:20,paddingTop:16,borderTop:'1px solid #e8edf4' }}>
            <button className="btn btn-secondary" onClick={()=>setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer dans la base</button>
          </div>
        </Modal>
      )}

      {/* Modal View */}
      {modal==='view' && selected && (
        <Modal title={`Dossier Étudiant`} onClose={()=>setModal(null)} width={560}>
          <div style={{ display:'flex',gap:16,marginBottom:20 }}>
            <div style={{ width:72,height:72,borderRadius:'50%',overflow:'hidden',background:'var(--mist)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem',flexShrink:0,border:'2px solid #e8edf4' }}>👤</div>
            <div>
              <div style={{ fontFamily:'Syne',fontWeight:800,fontSize:'1.1rem' }}>{selected.prenom} {selected.nom}</div>
              <div style={{ fontFamily:'monospace',color:'var(--gold)',fontWeight:700 }}>{selected.id}</div>
              <span className={`badge ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20 }}>
            {[ ['📧 Email',selected.email],['📞 Téléphone',selected.tel],['📚 Filière',selected.filiere],['📅 Année',selected.annee],['⚥ Genre',selected.genre] ].map(([k,v])=>(
              <div key={k} style={{ background:'var(--mist)',borderRadius:8,padding:'10px 12px' }}>
                <div style={{ fontSize:'.68rem',color:'var(--slate)',marginBottom:3 }}>{k}</div>
                <div style={{ fontWeight:600,fontSize:'.85rem' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button className="btn btn-sm btn-secondary" onClick={()=>openEdit(selected)}>✏️ Modifier</button>
            <button className="btn btn-sm btn-danger" onClick={()=>setModal('delete')}>🗑️ Supprimer</button>
          </div>
        </Modal>
      )}

      {/* Modal Delete */}
      {modal==='delete' && selected && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div className="card" style={{ maxWidth:400,padding:28,borderRadius:14,textAlign:'center' }}>
            <div style={{ fontFamily:'Syne',fontWeight:800,marginBottom:20 }}>Supprimer définitivement {selected.prenom} ?</div>
            <div style={{ display:'flex',gap:12,justifyContent:'center' }}>
              <button className="btn btn-secondary" onClick={()=>setModal('view')}>Annuler</button>
              <button className="btn btn-danger" onClick={handleDelete}>Confirmer la suppression</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
        <div>
          <div className="dash-page-title">Gestion des Étudiants</div>
          <div className="dash-page-sub">{tenantName} · {students.length} dossiers SQL</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Ajouter un étudiant</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom:24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Effectif Total</div>
          <div className="kpi-value" style={{color:'var(--blue)'}}>{students.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Étudiants Actifs</div>
          <div className="kpi-value" style={{color:'var(--green)'}}>{students.filter(s=>s.status==='ACTIF').length}</div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display:'flex',gap:10,marginBottom:16 }}>
        <input className="form-input" placeholder="🔍 Rechercher nom, matricule..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1}}/>
        <select className="form-input" value={filterStatus} onChange={e=>setFilter(e.target.value)} style={{width:160}}>
          <option value="ALL">Tous statuts</option>
          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Étudiant</th><th>Matricule</th><th>Filière</th><th>Année</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {paginated.map((s)=>(
                <tr key={s.id}>
                  <td><strong>{s.nom} {s.prenom}</strong><div style={{fontSize:'.7rem'}}>{s.email}</div></td>
                  <td style={{fontFamily:'monospace',fontWeight:700}}>{s.id}</td>
                  <td><span className="badge badge-blue">{s.filiere}</span></td>
                  <td style={{fontSize:'.8rem'}}>{s.annee}</td>
                  <td><span className={`badge ${STATUS_BADGE[s.status]}`}>{s.status}</span></td>
                  <td>
                    <div style={{ display:'flex',gap:5 }}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>openView(s)}>👁</button>
                      <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(s)}>✏️</button>
                      <button className="btn btn-sm" onClick={()=>handleToggleStatus(s)} style={{background:'var(--mist)'}}>{s.status==='ACTIF'?'🔒':'🔓'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button onClick={()=>navigate('/dashboard/uni-admin')}
        style={{ background:'none',border:'none',color:'var(--slate)',cursor:'pointer',fontFamily:'Syne',fontWeight:600,fontSize:'.85rem' }}>
        ← Retour au tableau de bord
      </button>
    </DashLayout>
    
  )

}