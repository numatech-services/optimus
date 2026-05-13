import { useState, useEffect, useMemo, useCallback } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import useDebounce from '../../../hooks/useDebounce'

const JOURS    = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const CRENEAUX = ['07h-09h', '09h-11h', '11h-13h', '14h-16h', '16h-18h']
const TYPES    = ['CM', 'TD', 'TP', 'Examen']

const EMPTY_FORM = {
  jour: 'Lundi', heure: '07h-09h', matiere_id: '', matiere: '', code: '',
  prof: '', salle_id: '', filiere: '', type: 'CM',
}

// ── Icônes SVG ──
const IcPlus     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcPrint    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
const IcTrash    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
const IcDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>

// ── TYPE badge colors ──
const TYPE_COLOR = { CM: '#185FA5', TD: '#0F6E56', TP: '#854F0B', Examen: '#A32D2D' }
const TYPE_BG    = { CM: '#E6F1FB', TD: '#E1F5EE', TP: '#FAEEDA', Examen: '#FCEBEB' }

// ── Impression ──
function printEDT({ cours, salles, filterFiliere, filterAnnee, filterYear }) {
  const getSalle = id => salles.find(s => s.id === id)?.nom || '—'
  const cellMap = {}
  cours.forEach(c => {
    const key = `${c.jour}_${c.heure}`
    if (!cellMap[key]) cellMap[key] = []
    cellMap[key].push(c)
  })

  const typeColor = { CM: '#185FA5', TD: '#0F6E56', TP: '#854F0B', Examen: '#A32D2D' }

  const rows = CRENEAUX.map(cr => `
    <tr>
      <td class="time">${cr}</td>
      ${JOURS.map(j => {
        const cells = cellMap[`${j}_${cr}`] || []
        return `<td class="cell">${cells.map(c => `
          <div class="cours-card">
            <div class="cours-mat">${c.matiere}</div>
            <div class="cours-meta">${c.prof || ''}</div>
            <div class="cours-meta">${getSalle(c.salle_id)}${c.type ? ` · <span style="color:${typeColor[c.type]||'#333'}">${c.type}</span>` : ''}</div>
          </div>`).join('') || '<div class="empty-cell"></div>'}</td>`
      }).join('')}
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>EDT — ${filterFiliere} — ${filterAnnee}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;padding:20px 28px;color:#111}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #111}
    .header h1{font-size:16px;font-weight:800;margin-bottom:3px}
    .header p{font-size:11px;color:#555}
    table{width:100%;border-collapse:collapse;table-layout:fixed}
    th{padding:8px 6px;background:#1e293b;color:#fff;font-size:10px;text-align:center;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
    th.time-h{width:72px}
    .time{padding:8px 6px;background:#f8fafc;font-weight:700;font-size:10px;color:#475569;text-align:center;border:1px solid #e2e8f0;vertical-align:middle}
    .cell{padding:4px;border:1px solid #e2e8f0;vertical-align:top;min-height:60px}
    .cours-card{background:#f0f9ff;border-left:3px solid #185FA5;border-radius:4px;padding:5px 7px;margin-bottom:3px}
    .cours-mat{font-weight:700;font-size:11px;color:#1e293b;margin-bottom:2px}
    .cours-meta{font-size:9.5px;color:#64748b}
    .empty-cell{height:52px}
    .footer{margin-top:20px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    @media print{body{padding:8px 14px}@page{size:A4 landscape;margin:.8cm}}
  </style></head><body>
  <div class="header">
    <div>
      <h1>Emploi du temps — ${filterFiliere}</h1>
      <p>Année académique : ${filterAnnee}</p>
    </div>
    <div style="text-align:right;font-size:10px;color:#64748b">
      Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}<br>
      ${cours.length} cours planifié(s)
    </div>
  </div>
  <table>
    <thead><tr><th class="time-h">Heure</th>${JOURS.map(j=>`<th>${j}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer"><span>Document généré automatiquement</span><span>Page 1</span></div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

// ── Composant principal ──
export default function ScolariteEDT() {
  const { user } = useAuth()
  const tid = user?.tenant_id

  // Référentiels
  const [annees,   setAnnees]   = useState([])
  const [filieres, setFilieres] = useState([])
  const [salles,   setSalles]   = useState([])
  const [matieres, setMatieres] = useState([])   // matières filtrées par filière+année
  const [cours,    setCours]    = useState([])

  // Filtres principaux (sélection de contexte)
  const [filterAnnee,   setFilterAnnee]   = useState('')
  const [filterFiliere, setFilterFiliere] = useState('')

  // Filtres secondaires (affichage)
  const [filterSalle,      setFilterSalle]      = useState('all')
  const [filterEnseignant, setFilterEnseignant] = useState('all')
  const [viewMode,         setViewMode]         = useState('semaine')
  const [search,           setSearch]           = useState('')
  const dSearch = useDebounce(search, 300)

  // UI
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)   // null | 'add' | 'edit'
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [selected, setSelected] = useState(null)
  const [toast,    setToast]    = useState(null)
  const [saving,   setSaving]   = useState(false)

  const pf = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  // ── 1. Chargement initial des référentiels ──
  useEffect(() => {
    if (!tid) return
    const init = async () => {
      setLoading(true)
      const [rA, rF, rS] = await Promise.all([
        supabase.from('annees_academiques').select('label,active').eq('tenant_id', tid).order('label', { ascending: false }),
        supabase.from('filieres').select('id,nom').eq('tenant_id', tid).order('nom'),
        supabase.from('salles').select('id,nom,capacite').eq('tenant_id', tid).order('nom'),
      ])
      setAnnees(rA.data || [])
      setSalles(rS.data || [])
      setFilieres(rF.data || [])

      const active = (rA.data || []).find(a => a.active)
      if (active) setFilterAnnee(active.label)
      else if (rA.data?.length) setFilterAnnee(rA.data[0].label)

      setLoading(false)
    }
    init()
  }, [tid])

  // ── 2. Charger les matières quand filière + année changent ──
  useEffect(() => {
    if (!tid || !filterFiliere || !filterAnnee) { setMatieres([]); return }
    supabase.from('matieres')
      .select('id,nom,code,enseignant_id,enseignant_nom,heures_cm,heures_td,heures_tp')
      .eq('tenant_id', tid)
      .eq('filiere', filterFiliere)
      .eq('annee', filterAnnee)
      .order('nom')
      .then(({ data }) => setMatieres(data || []))
  }, [tid, filterFiliere, filterAnnee])

  // ── 3. Charger les cours EDT quand filière + année changent ──
  const fetchCours = useCallback(async () => {
    if (!tid || !filterFiliere || !filterAnnee) { setCours([]); return }
    const { data } = await supabase.from('edts')
      .select('*')
      .eq('tenant_id', tid)
      .eq('filiere', filterFiliere)
    setCours(data || [])
  }, [tid, filterFiliere, filterAnnee])

  useEffect(() => { fetchCours() }, [fetchCours])

  // ── Filtrage secondaire ──
  const filtered = useMemo(() => {
    let r = [...cours]
    if (filterSalle !== 'all')      r = r.filter(c => c.salle_id === filterSalle)
    if (filterEnseignant !== 'all') r = r.filter(c => c.prof === filterEnseignant)
    if (dSearch) {
      const q = dSearch.toLowerCase()
      r = r.filter(c => c.matiere?.toLowerCase().includes(q) || c.prof?.toLowerCase().includes(q))
    }
    return r
  }, [cours, filterSalle, filterEnseignant, dSearch])

  // ── Détection conflits ──
  const conflicts = useMemo(() => {
    const issues = []
    for (let i = 0; i < filtered.length; i++) {
      for (let j = i + 1; j < filtered.length; j++) {
        const a = filtered[i], b = filtered[j]
        if (a.jour === b.jour && a.heure === b.heure) {
          if (a.salle_id && b.salle_id && a.salle_id === b.salle_id)
            issues.push({ type: 'Salle', a, b, detail: getSalleName(a.salle_id) })
          if (a.prof && b.prof && a.prof === b.prof)
            issues.push({ type: 'Enseignant', a, b, detail: a.prof })
        }
      }
    }
    return issues
  }, [filtered])

  const getSalleName = id => salles.find(s => s.id === id)?.nom || '—'

  // ── Stats par module ──
  const moduleStats = useMemo(() => {
    const m = {}
    filtered.forEach(c => {
      if (!m[c.matiere]) m[c.matiere] = { matiere: c.matiere, prof: c.prof, seances: 0 }
      m[c.matiere].seances++
    })
    return Object.values(m).sort((a, b) => b.seances - a.seances)
  }, [filtered])

  // ── Vérifier conflit pour un nouveau cours ──
  const checkConflict = (f) => {
    const msgs = []
    cours.forEach(c => {
      if (selected && c.id === selected.id) return
      if (c.jour === f.jour && c.heure === f.heure) {
        if (f.salle_id && c.salle_id === f.salle_id) msgs.push(`Salle déjà occupée : ${getSalleName(f.salle_id)}`)
        if (f.prof && c.prof === f.prof) msgs.push(`Enseignant déjà planifié : ${f.prof}`)
      }
    })
    return msgs
  }

  // ── Quand on choisit une matière dans le formulaire ──
  const onSelectMatiere = (id) => {
    const m = matieres.find(x => x.id === id)
    if (!m) { pf('matiere_id', ''); return }
    setForm(p => ({
      ...p,
      matiere_id: m.id,
      matiere: m.nom,
      code: m.code || '',
      prof: m.enseignant_nom || '',
    }))
  }

  // ── Sauvegarde ──
  const handleSave = async () => {
    if (!form.matiere) return showToast('Sélectionnez une matière', 'error')
    if (!form.jour || !form.heure) return showToast('Jour et créneau requis', 'error')

    setSaving(true)
    const payload = {
      tenant_id: tid,
      filiere: filterFiliere,
      jour: form.jour,
      heure: form.heure,
      matiere: form.matiere,
      code: form.code || null,
      prof: form.prof || null,
      salle_id: form.salle_id || null,
      type: form.type || 'CM',
    }

    try {
      let err
      if (modal === 'add') {
        ({ error: err } = await supabase.from('edts').insert([payload]))
      } else {
        ({ error: err } = await supabase.from('edts').update(payload).eq('id', selected.id))
      }
      if (err) {
        if (err.code === '23505') throw new Error('Conflit : cette salle est déjà occupée sur ce créneau')
        throw err
      }
      showToast(modal === 'add' ? 'Cours ajouté' : 'Modifications enregistrées')
      setModal(null)
      fetchCours()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce cours ?')) return
    await supabase.from('edts').delete().eq('id', id)
    showToast('Cours supprimé')
    setModal(null)
    fetchCours()
  }

  const handleExportCSV = () => {
    if (!filtered.length) return showToast('Aucun cours à exporter', 'error')
    const h = ['Jour', 'Heure', 'Matière', 'Code', 'Enseignant', 'Salle', 'Type']
    const rows = filtered.map(c => [c.jour, c.heure, c.matiere, c.code || '', c.prof || '', getSalleName(c.salle_id), c.type || ''])
    const csv = [h, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `EDT_${filterFiliere}_${filterAnnee}.csv`
    a.click()
  }

  const openAdd = (jour = 'Lundi', heure = '07h-09h') => {
    setSelected(null)
    setForm({ ...EMPTY_FORM, jour, heure, filiere: filterFiliere })
    setModal('add')
  }

  const openEdit = (c) => {
    setSelected(c)
    setForm({ ...c, matiere_id: '' })
    setModal('edit')
  }

  const liveConflicts = checkConflict(form)
  const enseignants   = [...new Set(cours.map(c => c.prof).filter(Boolean))]

  if (loading) return <DashLayout title="Emplois du temps"><SkeletonLoader /></DashLayout>

  // ── RENDER ──
  return (
    <DashLayout title="Emplois du temps">
      <style>{`
        .edt-cell { transition: background .15s; }
        .edt-cell:hover { background: #f8fafc; }
        .cours-chip { cursor: pointer; transition: box-shadow .15s; }
        .cours-chip:hover { box-shadow: 0 2px 8px rgba(0,0,0,.12); }
        .add-slot { opacity: 0; transition: opacity .15s; cursor: pointer; }
        .edt-cell:hover .add-slot { opacity: 1; }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.12)', background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', color: toast.type === 'error' ? '#A32D2D' : '#3B6D11', border: `1px solid ${toast.type === 'error' ? '#F7C1C1' : '#C0DD97'}` }}>
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{ marginBottom: 20 }}>
        <div className="dash-page-title">Emplois du temps</div>
        <div className="dash-page-sub">Planification par filière et année académique</div>
      </div>

      {/* ── Sélecteurs principaux ── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Contexte de l'emploi du temps</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Année académique *</label>
            <select className="form-input form-select" value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {annees.map(a => <option key={a.label} value={a.label}>{a.label}{a.active ? ' (active)' : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Filière / Classe *</label>
            <select className="form-input form-select" value={filterFiliere} onChange={e => setFilterFiliere(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {filieres.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
            </select>
          </div>
        </div>

        {filterFiliere && filterAnnee && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#EAF3DE', borderRadius: 8, fontSize: 12, color: '#3B6D11', fontWeight: 600, display: 'inline-block' }}>
            {matieres.length} matière(s) disponible(s) pour cette filière
          </div>
        )}
      </div>

      {/* ── Contenu principal (uniquement si contexte sélectionné) ── */}
      {!filterFiliere || !filterAnnee ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--slate)' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 8 }}>Sélectionnez une filière et une année</div>
          <div style={{ fontSize: 13 }}>L'emploi du temps s'affichera ici</div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Cours planifiés', value: cours.length,           color: '#185FA5' },
              { label: 'Matières',        value: new Set(cours.map(c => c.matiere)).size, color: '#0F6E56' },
              { label: 'Salles utilisées',value: new Set(cours.map(c => c.salle_id).filter(Boolean)).size, color: '#854F0B' },
              { label: 'Conflits',        value: conflicts.length,       color: conflicts.length > 0 ? '#A32D2D' : '#3B6D11' },
            ].map((k, i) => (
              <div key={i} className="kpi-card">
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Conflits */}
          {conflicts.length > 0 && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#A32D2D', fontSize: 13, marginBottom: 10 }}>{conflicts.length} conflit(s) détecté(s)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                {conflicts.map((c, i) => (
                  <div key={i} style={{ background: '#fff', borderLeft: '3px solid #A32D2D', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                    <span style={{ background: '#FCEBEB', color: '#A32D2D', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginBottom: 4, display: 'inline-block' }}>{c.type}</span>
                    <div style={{ color: 'var(--ink)', marginTop: 4 }}><strong>{c.a.matiere}</strong> vs <strong>{c.b.matiere}</strong></div>
                    <div style={{ color: 'var(--slate)', fontSize: 11 }}>{c.a.jour} {c.a.heure} · {c.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barre d'outils */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }} onClick={() => openAdd()}>
              <IcPlus /> Ajouter un cours
            </button>
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }} onClick={handleExportCSV}>
              <IcDownload /> Exporter CSV
            </button>
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              onClick={() => printEDT({ cours: filtered, salles, filterFiliere, filterAnnee })}>
              <IcPrint /> Imprimer l'EDT
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {['semaine', 'liste'].map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: viewMode === m ? 'var(--ink)' : 'var(--mist)', color: viewMode === m ? '#fff' : 'var(--slate)' }}>
                  {m === 'semaine' ? 'Vue semaine' : 'Vue liste'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres secondaires */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input className="form-input" placeholder="Rechercher matière ou enseignant…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ width: 240, fontSize: 12 }} />
            <select className="form-input form-select" value={filterEnseignant} onChange={e => setFilterEnseignant(e.target.value)} style={{ width: 180, fontSize: 12 }}>
              <option value="all">Tous les enseignants</option>
              {enseignants.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select className="form-input form-select" value={filterSalle} onChange={e => setFilterSalle(e.target.value)} style={{ width: 160, fontSize: 12 }}>
              <option value="all">Toutes les salles</option>
              {salles.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            {(filterEnseignant !== 'all' || filterSalle !== 'all' || search) && (
              <span style={{ fontSize: 12, color: 'var(--slate)', alignSelf: 'center' }}>{filtered.length} résultat(s)</span>
            )}
          </div>

          {/* ── Vue semaine ── */}
          {viewMode === 'semaine' && (
            <div className="card" style={{ overflow: 'auto', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ width: 80, padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textAlign: 'left', background: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Heure</th>
                    {JOURS.map(j => (
                      <th key={j} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--ink)', textAlign: 'left', background: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '.06em', minWidth: 130 }}>{j}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CRENEAUX.map((cr, ri) => (
                    <tr key={cr} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--slate)', background: 'var(--mist)', whiteSpace: 'nowrap', verticalAlign: 'top', paddingTop: 12 }}>{cr}</td>
                      {JOURS.map(j => {
                        const cells = filtered.filter(c => c.jour === j && c.heure === cr)
                        const hasConflict = conflicts.some(cf => (cf.a.jour === j && cf.a.heure === cr) || (cf.b.jour === j && cf.b.heure === cr))
                        return (
                          <td key={j} className="edt-cell" style={{ padding: 6, verticalAlign: 'top', background: hasConflict ? '#FFF5F5' : undefined, position: 'relative' }}>
                            {cells.map((c, i) => (
                              <div key={i} className="cours-chip" onClick={() => openEdit(c)}
                                style={{ background: TYPE_BG[c.type] || '#E6F1FB', borderLeft: `3px solid ${TYPE_COLOR[c.type] || '#185FA5'}`, borderRadius: 6, padding: '7px 9px', marginBottom: 4, fontSize: 11 }}>
                                <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{c.matiere}</div>
                                {c.prof && <div style={{ color: 'var(--slate)', fontSize: 10 }}>{c.prof}</div>}
                                <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                                  {c.salle_id && <span style={{ fontSize: 10, color: 'var(--slate)' }}>{getSalleName(c.salle_id)}</span>}
                                  {c.type && <span style={{ fontSize: 9, fontWeight: 700, color: TYPE_COLOR[c.type], background: TYPE_BG[c.type], padding: '1px 5px', borderRadius: 3 }}>{c.type}</span>}
                                </div>
                              </div>
                            ))}
                            <div className="add-slot" onClick={() => openAdd(j, cr)}
                              style={{ height: 36, border: '1px dashed var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', fontSize: 16 }}>
                              +
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Vue liste ── */}
          {viewMode === 'liste' && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="table-wrap">
                <table role="table">
                  <thead>
                    <tr>
                      <th>Jour</th><th>Heure</th><th>Matière</th><th>Enseignant</th><th>Salle</th><th>Type</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Aucun cours planifié</td></tr>
                    ) : filtered.map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{c.jour}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.heure}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.matiere}</div>
                          {c.code && <div style={{ fontSize: 11, color: 'var(--slate)' }}>{c.code}</div>}
                        </td>
                        <td style={{ fontSize: 13 }}>{c.prof || '—'}</td>
                        <td style={{ fontSize: 13 }}>{getSalleName(c.salle_id)}</td>
                        <td>
                          {c.type && <span style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLOR[c.type], background: TYPE_BG[c.type], padding: '3px 8px', borderRadius: 4 }}>{c.type}</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-secondary" style={{ fontSize: 11 }} onClick={() => openEdit(c)}>Modifier</button>
                            <button onClick={() => handleDelete(c.id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#FCEBEB', color: '#A32D2D', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal ajouter / modifier ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, borderRadius: 14, padding: 0, maxHeight: '90vh', overflow: 'auto' }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                {modal === 'add' ? 'Ajouter un cours' : 'Modifier le cours'}
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--slate)', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: 20 }}>

              {/* Conflits live */}
              {liveConflicts.length > 0 && (
                <div style={{ background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#A32D2D', fontWeight: 600 }}>
                  {liveConflicts.map((m, i) => <div key={i}>{m}</div>)}
                </div>
              )}

              {/* Sélection matière depuis la liste */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Matière *</div>
              {modal === 'add' ? (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <select className="form-input form-select" value={form.matiere_id}
                    onChange={e => onSelectMatiere(e.target.value)}
                    style={{ fontSize: 13 }}>
                    <option value="">— Choisir une matière —</option>
                    {matieres.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nom}{m.code ? ` (${m.code})` : ''}{m.enseignant_nom ? ` · ${m.enseignant_nom}` : ''}
                      </option>
                    ))}
                  </select>
                  {matieres.length === 0 && (
                    <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 4, fontWeight: 600 }}>
                      Aucune matière pour {filterFiliere} — {filterAnnee}. Ajoutez d'abord des matières.
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <input className="form-input" value={form.matiere} readOnly style={{ background: 'var(--mist)', fontWeight: 600 }} />
                </div>
              )}

              {/* Jour + Créneau */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Jour *</label>
                  <select className="form-input form-select" value={form.jour} onChange={e => pf('jour', e.target.value)}>
                    {JOURS.map(j => <option key={j}>{j}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Créneau *</label>
                  <select className="form-input form-select" value={form.heure} onChange={e => pf('heure', e.target.value)}>
                    {CRENEAUX.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Salle + Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Salle</label>
                  <select className="form-input form-select" value={form.salle_id || ''} onChange={e => pf('salle_id', e.target.value)}>
                    <option value="">— Aucune —</option>
                    {salles.map(s => <option key={s.id} value={s.id}>{s.nom}{s.capacite ? ` (${s.capacite} pl.)` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input form-select" value={form.type || 'CM'} onChange={e => pf('type', e.target.value)}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Enseignant (pré-rempli mais modifiable) */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Enseignant</label>
                <input className="form-input" value={form.prof || ''} onChange={e => pf('prof', e.target.value)}
                  placeholder="Nom de l'enseignant" />
                <div style={{ fontSize: 10, color: 'var(--slate)', marginTop: 3 }}>Pré-rempli depuis la matière — modifiable si besoin</div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>Annuler</button>
                {modal === 'edit' && (
                  <button onClick={() => handleDelete(selected.id)} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#FCEBEB', color: '#A32D2D', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    <IcTrash /> Supprimer
                  </button>
                )}
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.matiere} style={{ flex: 1 }}>
                  {saving ? 'Enregistrement…' : modal === 'add' ? 'Ajouter' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}