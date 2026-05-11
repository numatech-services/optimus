import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── Champ réutilisable ──
const F = ({ label, name, form, setForm, type = 'text', options, required, placeholder }) => (
  <div className="form-group">
    <label className="form-label">{label}{required && ' *'}</label>
    {options ? (
      <select className="form-input form-select" value={form[name] || ''}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}>
        {options.map(o => (
<option key={o.value ?? o} value={o.value ?? o}>{(o.label ?? o) || '— Sélectionner —'}</option>          
        ))}
      </select>
    ) : (
      <input className="form-input" type={type} value={form[name] || ''}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        placeholder={placeholder || label} required={required} />
    )}
  </div>
)

const SEMESTRES = ['', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']

const EMPTY = {
  code: '', nom: '', filiere: '', semestre: '', annee: '',
  enseignant_id: '', coef: 1, heures_cm: 0, heures_td: 0, heures_tp: 0
}

export default function ScolariteMatieres() {
  const { user } = useAuth()
const tenantId = user?.tenant_id || user?.id
  const [matieres, setMatieres] = useState([])
  const [filieres, setFilieres] = useState([])
  const [annees, setAnnees] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'add' | 'edit'
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [toast, setToast] = useState(null)

  // Filtres
  const [filterFiliere, setFilterFiliere] = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')
  const [search, setSearch] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Chargement initial ──
useEffect(() => {
    // On ne lance le chargement que si le tenantId est présent
    if (tenantId) {
      loadAll()
    } else {
      console.warn("⚠️ Absence de tenantId, attente de l'authentification...")
    }
  }, [tenantId])

const loadAll = async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      console.log("Chargement pour le tenant:", tenantId);

      const [resMat, resFil, resAnn, resTea] = await Promise.all([
        supabase.from('matieres').select('*').eq('tenant_id', tenantId).order('filiere').order('nom'),
        supabase.from('filieres').select('id,nom,code').eq('tenant_id', tenantId).order('nom'),
        // 🟢 CORRECTION : Nom de table et colonnes réels
        supabase.from('annees_academiques').select('*').eq('tenant_id', tenantId).order('label', { ascending: false }),
        supabase.from('teachers').select('id,nom,prenom,specialite').eq('tenant_id', tenantId).order('nom')
      ]);

      // Debugging
      console.log("Années académiques trouvées:", resAnn.data);

      setMatieres(resMat.data || []);
      setFilieres(resFil.data || []);
      setAnnees(resAnn.data || []); // On stocke les données de 'annees_academiques'
      setTeachers(resTea.data || []);

      // 🟢 CORRECTION : Utilisation de la colonne 'active' au lieu de 'is_current'
      if (resAnn.data && resAnn.data.length > 0) {
        const current = resAnn.data.find(a => a.active === true);
        const defaultYear = current ? current.label : resAnn.data[0].label;
        
        // On ne change le filtre que s'il est vide
        if (!filterAnnee) setFilterAnnee(defaultYear);
      }

    } catch (err) {
      console.error('Erreur sync:', err);
      showToast('❌ Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Sauvegarde ──
const handleSave = async () => {
  if (!form.nom || !form.filiere || !form.annee) {
    showToast('⚠️ Nom, filière et année sont requis', 'error')
    return
  }

  const teacher = teachers.find(t => t.id === form.enseignant_id)
  const enseignant_nom = teacher ? `${teacher.prenom} ${teacher.nom}` : (form.enseignant_nom || null)

  // 1. On prépare les données communes
  const data = {
    code: form.code || null,
    nom: form.nom,
    filiere: form.filiere,
    semestre: form.semestre || null,
    annee: form.annee,
    enseignant_id: form.enseignant_id || null,
    enseignant_nom,
    coef: Number(form.coef) || 1,
    heures_cm: Number(form.heures_cm) || 0,
    heures_td: Number(form.heures_td) || 0,
    heures_tp: Number(form.heures_tp) || 0,
  }

  try {
    if (modal === 'add') {
      // 2. Pour l'ajout, on DOIT inclure le tenant_id
      const { error } = await supabase
        .from('matieres')
        .insert([{ ...data, tenant_id: tenantId }])
      
      if (error) throw error
      showToast('✅ Matière créée')
    } else {
      // 3. Pour la modification, on n'envoie PAS le tenant_id
      // On utilise l'ID de la ligne sélectionnée (selected.id)
      const { error } = await supabase
        .from('matieres')
        .update(data) 
        .eq('id', selected.id)
        .eq('tenant_id', tenantId) // Sécurité supplémentaire : on vérifie le tenant
      
      if (error) throw error
      showToast('✅ Matière mise à jour')
    }
    
    setModal(null)
    setForm(EMPTY)
    setSelected(null)
    loadAll() // Recharge la liste pour voir les changements
  } catch (err) {
    console.error("Erreur save:", err)
    showToast('❌ ' + err.message, 'error')
  }
}
  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette matière ? Les présences associées seront aussi supprimées.')) return
    const { error } = await supabase.from('matieres').delete().eq('id', id)
    if (error) showToast('❌ ' + error.message, 'error')
    else { showToast('✅ Supprimé'); loadAll() }
  }

  // ── Filtrage ──
  const filtered = useMemo(() => {
    return matieres.filter(m => {
      if (filterFiliere && m.filiere !== filterFiliere) return false
      if (filterAnnee && m.annee !== filterAnnee) return false
      if (search && !m.nom.toLowerCase().includes(search.toLowerCase()) &&
          !m.code?.toLowerCase().includes(search.toLowerCase()) &&
          !m.enseignant_nom?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [matieres, filterFiliere, filterAnnee, search])

  // Options pour les selects du formulaire
  const filieresOpts = [{ value: '', label: '— Filière —' }, ...filieres.map(f => ({ value: f.nom, label: f.nom }))]
  const anneesOpts   = [{ value: '', label: '— Année —' }, ...annees.map(a => ({ value: a.label, label: a.label + (a.is_current ? ' ✦ En cours' : '') }))]
  const teachersOpts = [{ value: '', label: '— Aucun enseignant —' }, ...teachers.map(t => ({ value: t.id, label: `${t.prenom} ${t.nom}${t.specialite ? ' · ' + t.specialite : ''}` }))]

  // Grouper par filière pour l'affichage
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(m => {
      const key = m.filiere
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return map
  }, [filtered])

  if (loading) return (
    <DashLayout title="Matières">
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--slate)' }}>Chargement...</div>
    </DashLayout>
  )

  return (
    <DashLayout title="Matières" requiredRole={['scolarite', 'admin_universite']}>

      {/* Toast */}
      {toast && (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Modal Formulaire */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, borderRadius: 14, padding: 0, margin: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', borderRadius: '14px 14px 0 0' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, color: '#fff' }}>
                {modal === 'add' ? '➕ Nouvelle matière' : '✏️ Modifier la matière'}
              </div>
              <button onClick={() => { setModal(null); setForm(EMPTY); setSelected(null) }}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#fff' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Code" name="code" form={form} setForm={setForm} placeholder="Ex: INF101" />
                <F label="Coefficient" name="coef" type="number" form={form} setForm={setForm} />
              </div>
              <F label="Nom de la matière" name="nom" form={form} setForm={setForm} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Filière" name="filiere" options={filieresOpts} form={form} setForm={setForm} required />
                <F label="Semestre" name="semestre" options={SEMESTRES.map(s => ({ value: s, label: s || '— Tous —' }))} form={form} setForm={setForm} />
              </div>
              <F label="Année académique" name="annee" options={anneesOpts} form={form} setForm={setForm} required />
              <F label="Enseignant responsable" name="enseignant_id" options={teachersOpts} form={form} setForm={setForm} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <F label="Heures CM" name="heures_cm" type="number" form={form} setForm={setForm} />
                <F label="Heures TD" name="heures_td" type="number" form={form} setForm={setForm} />
                <F label="Heures TP" name="heures_tp" type="number" form={form} setForm={setForm} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => { setModal(null); setForm(EMPTY); setSelected(null) }}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Créer' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="dash-page-title">Matières par filière</div>
      <div className="dash-page-sub">{matieres.length} matière{matieres.length !== 1 ? 's' : ''} au total · {filtered.length} affichée{filtered.length !== 1 ? 's' : ''}</div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Chercher matière, code, enseignant…"
          className="form-input" style={{ width: 260, padding: '8px 14px', fontSize: '.85rem' }}
        />
        <select className="form-input form-select" style={{ width: 200 }}
          value={filterFiliere} onChange={e => setFilterFiliere(e.target.value)}>
          <option value="">Toutes les filières</option>
          {filieres.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
        </select>
        <select className="form-input form-select" style={{ width: 180 }}
          value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}>
          <option value="">Toutes les années</option>
          {annees.map(a => <option key={a.id} value={a.label}>{a.label}{a.is_current ? ' ✦' : ''}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}
          onClick={() => {
            const current = annees.find(a => a.is_current)
            setForm({ ...EMPTY, annee: current?.label || '', filiere: filterFiliere || '' })
            setSelected(null); setModal('add')
          }}>
          ➕ Ajouter une matière
        </button>
      </div>

      {/* Table groupée par filière */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--slate)' }}>
          Aucune matière trouvée. Commencez par en créer une.
        </div>
      ) : (
        Object.entries(grouped).map(([filiere, items]) => (
          <div key={filiere} className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, color: 'var(--ink)', fontSize: '1rem' }}>
                📚 {filiere}
                <span style={{ marginLeft: 10, fontSize: '.75rem', fontWeight: 500, color: 'var(--slate)' }}>
                  {items.length} matière{items.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="table-wrap">
              <table role="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Nom de la matière</th>
                    <th>Semestre</th>
                    <th>Année</th>
                    <th>Enseignant</th>
                    <th>Coef</th>
                    <th>Volume h.</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(m => {
                    const totalH = (m.heures_cm || 0) + (m.heures_td || 0) + (m.heures_tp || 0)
                    return (
                      <tr key={m.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '.78rem', color: 'var(--slate)' }}>
                          {m.code || '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.nom}</td>
                        <td>
                          {m.semestre
                            ? <span className="badge badge-blue" style={{ fontSize: '.72rem' }}>{m.semestre}</span>
                            : <span style={{ color: 'var(--slate)', fontSize: '.8rem' }}>—</span>
                          }
                        </td>
                        <td style={{ fontSize: '.82rem', color: 'var(--slate)' }}>{m.annee}</td>
                        <td>
                          {m.enseignant_nom
                            ? <div>
                                <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--ink)' }}>{m.enseignant_nom}</div>
                              </div>
                            : <span style={{ color: 'var(--red)', fontSize: '.8rem', fontWeight: 600 }}>⚠️ Non assigné</span>
                          }
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.coef}</td>
                        <td style={{ fontSize: '.78rem', color: 'var(--slate)' }}>
                          {totalH > 0
                            ? <span title={`CM:${m.heures_cm}h TD:${m.heures_td}h TP:${m.heures_tp}h`}>
                                {totalH}h
                              </span>
                            : '—'
                          }
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm"
                            style={{ background: 'var(--blue-light)', color: 'var(--blue)', border: 'none', borderRadius: 6, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', fontSize: '.75rem' }}
                            onClick={() => { setForm(m); setSelected(m); setModal('edit') }}>
                            ✏️ Modifier
                          </button>
                          <button className="btn btn-sm"
                            style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 6, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', fontSize: '.75rem' }}
                            onClick={() => handleDelete(m.id)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </DashLayout>
  )
}