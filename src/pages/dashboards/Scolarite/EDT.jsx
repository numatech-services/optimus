import { useState, useEffect, useMemo } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import useDebounce from '../../../hooks/useDebounce'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const CRENEAUX = ['07h-09h', '09h-11h', '11h-13h', '14h-16h', '16h-18h']
const EMPTY = { jour: 'Lundi', creneau: '07h-09h', matiere: '', salle_id: '', filiere: '', enseignant: '', groupe: '', heures_module: 2 }

// Icônes
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>

export default function ScolariteEDT() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  const [cours, setCours] = useState([])
  const [salles, setSalles] = useState([])
  const [teachers, setTeachers] = useState([])
  const [filieres, setFilieres] = useState([])
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [selected, setSelected] = useState(null)
  const [filterFiliere, setFilterFiliere] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [filterEnseignant, setFilterEnseignant] = useState('all')
  const [filterSalle, setFilterSalle] = useState('all')
  const [viewMode, setViewMode] = useState('semaine') // 'semaine' or 'stat'
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  // Chargement initial
  useEffect(() => {
    async function init() {
      setLoading(true)
      const [resY, resF, resS, resT, resC] = await Promise.all([
        supabase.from('annees_academiques').select('label, active').eq('tenant_id', tid).order('label', { ascending: false }),
        supabase.from('filieres').select('id, nom').eq('tenant_id', tid),
        supabase.from('salles').select('id, nom, capacite, type').eq('tenant_id', tid),
        supabase.from('teachers').select('id, nom, prenom').eq('tenant_id', tid),
        supabase.from('edts').select('*').eq('tenant_id', tid)
      ])
      
      if (resY.data) {
        setYears(resY.data)
        const act = resY.data.find(y => y.active)
        if (act) setFilterYear(act.label)
      }
      if (resF.data) setFilieres(resF.data)
      if (resS.data) setSalles(resS.data)
      if (resT.data) setTeachers(resT.data)
      if (resC.data) setCours(resC.data)
      
      setLoading(false)
    }
    if (tid) init()
  }, [tid])

  // Filtrage des cours
const filteredCours = useMemo(() => {
  if (!cours) return [];
  let result = [...cours];
  
  // 1. Filtre par Année (Attention: vérifie si tu as cette colonne, sinon commente ce bloc)
  if (filterYear !== 'all') {
    result = result.filter(c => c.annee_inscription === filterYear);
  }

  // 2. Filtre par Filière
  if (filterFiliere !== 'all') {
    result = result.filter(c => c.filiere === filterFiliere);
  }

  // 3. Filtre par Enseignant (On utilise 'prof' comme dans ton SQL)
  if (filterEnseignant !== 'all') {
    result = result.filter(c => c.prof === filterEnseignant);
  }

  // 4. Filtre par Salle
  if (filterSalle !== 'all') {
    result = result.filter(c => c.salle_id === filterSalle);
  }

  // 5. Recherche textuelle
  if (debouncedSearch) {
    const s = debouncedSearch.toLowerCase();
    result = result.filter(c => 
      c.matiere?.toLowerCase().includes(s) ||
      c.prof?.toLowerCase().includes(s) ||
      c.filiere?.toLowerCase().includes(s)
    );
  }
  
  return result;
}, [cours, filterYear, filterFiliere, filterEnseignant, filterSalle, debouncedSearch]);
// ═══ MOTEUR DE DÉTECTION DE CONFLITS ═══
  const detectConflicts = useMemo(() => {
    const issues = []
    for (let i = 0; i < filteredCours.length; i++) {
      for (let j = i + 1; j < filteredCours.length; j++) {
        const a = filteredCours[i], b = filteredCours[j]
        if (a.jour === b.jour && a.creneau === b.creneau) {
          // Conflit de salle
          if (a.salle_id && b.salle_id && a.salle_id === b.salle_id) {
            issues.push({ type: 'SALLE', severity: 'CRITICAL', a, b, detail: `Même salle: ${getSalleName(a.salle_id)}` })
          }
          // Conflit d'enseignant
          if (a.enseignant && b.enseignant && a.enseignant === b.enseignant) {
            issues.push({ type: 'ENSEIGNANT', severity: 'CRITICAL', a, b, detail: `Enseignant: ${a.enseignant}` })
          }
          // Conflit de groupe/filière
          if (a.filiere === b.filiere && a.groupe === b.groupe) {
            issues.push({ type: 'GROUPE', severity: 'HIGH', a, b, detail: `${a.filiere} - ${a.groupe}` })
          }
        }
      }
    }
    return issues
  }, [filteredCours])

  // ═══ STATISTIQUES HEURES PAR MODULE ═══
  const moduleStats = useMemo(() => {
    const stats = {}
    filteredCours.forEach(c => {
      const key = c.matiere || 'Sans nom'
      if (!stats[key]) stats[key] = { matiere: key, heures: 0, seances: 0, enseignant: c.enseignant, filiere: c.filiere }
      stats[key].heures += (c.heures_module || 2)
      stats[key].seances += 1
    })
    return Object.values(stats).sort((a, b) => b.heures - a.heures)
  }, [filteredCours])

  const checkConflictsForNew = (newCours) => {
    const conflicts = []
    filteredCours.forEach(existing => {
      if (selected && existing.id === selected.id) return
      if (existing.jour === newCours.jour && existing.creneau === newCours.creneau) {
        if (newCours.salle_id && existing.salle_id === newCours.salle_id) conflicts.push('⚠️ Salle déjà occupée à ce créneau')
        if (newCours.enseignant && existing.enseignant === newCours.enseignant) conflicts.push('⚠️ Enseignant déjà pris à ce créneau')
        if (newCours.filiere === existing.filiere && newCours.groupe === existing.groupe) conflicts.push('⚠️ Même groupe déjà planifié')
      }
    })
    return conflicts
  }

  const getSalleName = (id) => salles.find(s => s.id === id)?.nom || id || '—'
const handleSave = async () => {
  if (!form.matiere) return showToast('Matière requise', 'error');

  // Préparation du payload selon ton schéma SQL
  const payload = { 
    tenant_id: tid,
    jour: form.jour,
    heure: form.creneau, // Ton SQL utilise 'heure'
    matiere: form.matiere,
    filiere: form.filiere || null,
    prof: form.enseignant || null, // Ton SQL utilise 'prof'
    salle_id: form.salle_id || null, // Important pour l'index unique
    type: form.type || 'CM'
  };

  try {
    let result;
    if (modal === 'add') {
      result = await supabase.from('edts').insert([payload]);
    } else {
      result = await supabase.from('edts').update(payload).eq('id', selected.id);
    }

    if (result.error) {
      // Gestion spécifique de l'index unique (conflit de salle)
      if (result.error.code === '23505') {
        throw new Error('Cette salle est déjà occupée sur ce créneau (conflit base de données).');
      }
      throw result.error;
    }

    showToast(modal === 'add' ? 'Cours planifié ✓' : 'Modifications enregistrées ✓');
    setModal(null);
    
    // Rafraîchir la liste
    const { data } = await supabase.from('edts').select('*').eq('tenant_id', tid);
    if (data) setCours(data);

  } catch (err) {
    console.error("Erreur SQL:", err);
    showToast(err.message, 'error');
  }
};

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) return
    try {
      await supabase.from('edts').delete().eq('id', id)
      const { data } = await supabase.from('edts').select('*').eq('tenant_id', tid)
      if (data) setCours(data)
      showToast('Cours supprimé ✓')
      setModal(null)
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error')
    }
  }

const handleExportCSV = () => {
  if (filteredCours.length === 0) return showToast('Aucun cours à exporter', 'error');
  
  const headers = ['Jour', 'Heure', 'Matiere', 'Enseignant', 'Filiere', 'Salle'];
  const rows = filteredCours.map(c => [
    c.jour,
    c.heure, // Colonne SQL
    c.matiere,
    c.prof || '-', // Colonne SQL
    c.filiere || '-',
    getSalleName(c.salle_id)
  ]);
  
  const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `EDT_Export.csv`;
  link.click();
};
  if (loading) return <DashLayout title="Emplois du temps"><div style={{padding: 60, textAlign: 'center'}}><SkeletonLoader /></div></DashLayout>

  return (
    <DashLayout title="Emplois du temps">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#FEE8E7' : '#E6F0E9', color: toast.type === 'error' ? '#E10600' : '#18753C', padding: '14px 22px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Emplois du temps</div>
        <div style={{ color: 'var(--slate)', fontSize: 14 }}>Planification des cours avec détection automatique de conflits</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Cours planifiés</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{filteredCours.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Heures totales</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{filteredCours.reduce((s, c) => s + (c.heures_module || 2), 0)}h</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Salles utilisées</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{new Set(filteredCours.map(c => c.salle_id).filter(Boolean)).size}</div>
        </div>
        <div style={{ background: detectConflicts.length > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Conflits</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{detectConflicts.length}</div>
        </div>
      </div>

      {/* Conflits banner */}
      {detectConflicts.length > 0 && (
        <div style={{ background: '#FEE8E7', border: '1px solid #FDBA74', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: '#E10600', marginBottom: 12 }}>⚠️ {detectConflicts.length} conflit(s) détecté(s)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            {detectConflicts.slice(0, 6).map((c, i) => (
              <div key={i} style={{ background: 'white', padding: 10, borderRadius: 8, borderLeft: '3px solid #E10600', fontSize: 13 }}>
                <div><span style={{ background: c.severity === 'CRITICAL' ? '#FEE8E7' : '#FEF3C7', color: c.severity === 'CRITICAL' ? '#E10600' : '#EA580C', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{c.type}</span></div>
                <div style={{ marginTop: 6, color: 'var(--ink)' }}><strong>{c.a.matiere}</strong> vs <strong>{c.b.matiere}</strong> — {c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Année académique</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', fontSize: 13 }}>
              <option value="all">Toutes les années</option>
              {years.map(y => <option key={y.label} value={y.label}>📅 {y.label} {y.active ? '(active)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Filière</label>
            <select value={filterFiliere} onChange={e => setFilterFiliere(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', fontSize: 13 }}>
              <option value="all">Toutes les filières</option>
              {filieres.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Enseignant</label>
            <select value={filterEnseignant} onChange={e => setFilterEnseignant(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', fontSize: 13 }}>
              <option value="all">Tous les enseignants</option>
              {[...new Set(filteredCours.map(c => c.enseignant).filter(Boolean))].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Salle</label>
            <select value={filterSalle} onChange={e => setFilterSalle(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', fontSize: 13 }}>
              <option value="all">Toutes les salles</option>
              {salles.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
        </div>
        <input 
          type="text"
          placeholder="Rechercher matière ou groupe..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
        />
      </div>

      {/* Boutons d'actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => { setForm({...EMPTY, annee_inscription: filterYear}); setModal('add') }} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <IconPlus /> Ajouter un cours
        </button>
        <button onClick={handleExportCSV} style={{ background: '#e2e8f0', color: 'var(--ink)', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <IconDownload /> Exporter CSV
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setViewMode('semaine')} style={{ background: viewMode === 'semaine' ? 'var(--primary)' : '#e2e8f0', color: viewMode === 'semaine' ? 'white' : 'var(--ink)', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            📅 Vue semaine
          </button>
          <button onClick={() => setViewMode('stat')} style={{ background: viewMode === 'stat' ? 'var(--primary)' : '#e2e8f0', color: viewMode === 'stat' ? 'white' : 'var(--ink)', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            📊 Statistiques
          </button>
        </div>
      </div>

      {/* Vue Semaine */}
      {viewMode === 'semaine' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px', textAlign: 'left', fontWeight: 700, fontSize: 13, width: 80 }}>Créneau</th>
                {JOURS.map(j => <th key={j} style={{ padding: '14px', textAlign: 'left', fontWeight: 700, fontSize: 13, minWidth: 140 }}>{j}</th>)}
              </tr>
            </thead>
            <tbody>
              {CRENEAUX.map(cr => (
                <tr key={cr} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12, color: 'var(--slate)', background: '#f8fafc' }}>{cr}</td>
                 {JOURS.map(j => {
  // Correction : On filtre sur 'heure' (nom de ta colonne SQL)
  const cellCours = filteredCours.filter(c => c.jour === j && c.heure === cr)
  
  // Correction : On vérifie les conflits sur 'heure'
  const hasConflict = detectConflicts.some(cf =>
    (cf.a.jour === j && cf.a.heure === cr) || (cf.b.jour === j && cf.b.heure === cr)
  )

  return (
    <td key={j} style={{ padding: '8px', background: hasConflict ? '#FEE8E7' : undefined, verticalAlign: 'top' }}>
      {cellCours.map((c, i) => (
        <div 
          key={i} 
          onClick={() => { 
            setSelected(c); 
            // Important : on remap 'heure' vers 'creneau' et 'prof' vers 'enseignant' pour ton formulaire
            setForm({ 
              ...c, 
              creneau: c.heure, 
              enseignant: c.prof 
            }); 
            setModal('edit'); 
          }}
          style={{ 
            background: 'var(--primary-light)', 
            border: hasConflict ? '2px solid #E10600' : '1px solid var(--border)', 
            borderRadius: 6, 
            padding: '8px', 
            marginBottom: 6, 
            cursor: 'pointer', 
            fontSize: 12, 
            fontWeight: 600 
          }}
        >
          <div style={{ color: 'var(--primary)', marginBottom: 4 }}>{c.matiere}</div>
          {/* Correction : on affiche 'prof' */}
          <div style={{ color: 'var(--slate)', fontSize: 11, marginBottom: 2 }}>{c.prof || '-'}</div>
          <div style={{ color: 'var(--slate)', fontSize: 11 }}>
            {getSalleName(c.salle_id)} {c.groupe ? `• ${c.groupe}` : ''}
          </div>
        </div>
      ))}

      {cellCours.length === 0 && (
        <div 
          onClick={() => { 
            setForm({ ...EMPTY, jour: j, creneau: cr }); 
            setModal('add'); 
          }}
          style={{ 
            height: 60, 
            borderRadius: 6, 
            border: '1px dashed var(--border)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer', 
            color: 'var(--slate)', 
            fontSize: 18 
          }}
        >
          +
        </div>
      )}
    </td>
  )
})}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vue Statistiques */}
      {viewMode === 'stat' && moduleStats.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px', textAlign: 'left', fontWeight: 700, fontSize: 13 }}>Module</th>
                <th style={{ padding: '14px', textAlign: 'left', fontWeight: 700, fontSize: 13 }}>Enseignant</th>
                <th style={{ padding: '14px', textAlign: 'left', fontWeight: 700, fontSize: 13 }}>Filière</th>
                <th style={{ padding: '14px', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>Séances</th>
                <th style={{ padding: '14px', textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>Heures</th>
              </tr>
            </thead>
            <tbody>
              {moduleStats.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px', fontWeight: 600 }}>{m.matiere}</td>
                  <td style={{ padding: '14px' }}>{m.enseignant || '-'}</td>
                  <td style={{ padding: '14px' }}>{m.filiere || '-'}</td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>{m.seances}</td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{m.heures}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal add/edit */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{modal === 'add' ? '➕ Ajouter un cours' : '✏️ Modifier le cours'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', color: 'var(--slate)' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              {(() => {
                const liveConflicts = checkConflictsForNew(form)
                return liveConflicts.length > 0 ? (
                  <div style={{ padding: '12px 14px', background: '#FEE8E7', borderRadius: 8, fontSize: 13, color: '#E10600', marginBottom: 16, border: '1px solid #FDBA74' }}>
                    {liveConflicts.map((c, i) => <div key={i}>{c}</div>)}
                  </div>
                ) : null
              })()}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Matière *</label>
                <input type="text" value={form.matiere} onChange={e => setForm(p => ({ ...p, matiere: e.target.value }))} placeholder="Ex: Algorithmique avancée" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Jour</label>
                  <select value={form.jour} onChange={e => setForm(p => ({ ...p, jour: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>
                    {JOURS.map(j => <option key={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Créneau</label>
                  <select value={form.creneau} onChange={e => setForm(p => ({ ...p, creneau: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>
                    {CRENEAUX.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Salle</label>
                  <select value={form.salle_id || ''} onChange={e => setForm(p => ({ ...p, salle_id: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Sélectionner...</option>
                    {salles.map(s => <option key={s.id} value={s.id}>{s.nom} ({s.capacite}pl.)</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Enseignant</label>
                  <select value={form.enseignant || ''} onChange={e => setForm(p => ({ ...p, enseignant: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Sélectionner...</option>
                    {teachers.map(t => <option key={t.id} value={`${t.prenom} ${t.nom}`}>{t.prenom} {t.nom}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Filière</label>
                  <select value={form.filiere || ''} onChange={e => setForm(p => ({ ...p, filiere: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Sélectionner...</option>
                    {filieres.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Groupe</label>
                  <input type="text" value={form.groupe || ''} onChange={e => setForm(p => ({ ...p, groupe: e.target.value }))} placeholder="TD1, TP2, CM..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Heures (par séance)</label>
                <input type="number" value={form.heures_module || 2} onChange={e => setForm(p => ({ ...p, heures_module: parseInt(e.target.value) || 2 }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Annuler</button>
                {modal === 'edit' && (
                  <button onClick={() => { handleDelete(selected.id); }} style={{ padding: '10px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconTrash /> Supprimer
                  </button>
                )}
                <button onClick={handleSave} style={{ flex: 1, padding: '10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {modal === 'add' ? 'Ajouter' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-weight: 700; }
        td { font-size: 13px; }
      `}</style>
    </DashLayout>
  )
}
