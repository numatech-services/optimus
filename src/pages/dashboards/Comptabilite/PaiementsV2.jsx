import { useState, useEffect, useCallback } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import useDebounce from '../../../hooks/useDebounce'

export default function PaiementsManager() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  
  const [loading, setLoading] = useState(false)
  const [paiements, setPaiements] = useState([])
  const [students, setStudents] = useState([])
  const [filieres, setFilieres] = useState([])
  const [classes, setClasses] = useState([])
  
  // Filtres
  const [filterFil, setFilterFil] = useState('ALL')
  const [filterCls, setFilterCls] = useState('ALL')
  const [filterStat, setFilterStat] = useState('ALL')
  const [search, setSearch] = useState('')
  const debSearch = useDebounce(search, 300)
  
  // UI
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ student_id: '', desc: '', mont: '', meth: 'ESPÈCES', stat: 'EN ATTENTE' })
  const [importing, setImporting] = useState(false)
  const [stats, setStats] = useState({ payé: 0, attente: 0, total: 0, étuds: 0 })

  // Charger données initiales
  useEffect(() => {
    if (!tid) return
    
    const init = async () => {
      try {
        const [studs, fils, cls] = await Promise.all([
          supabase.from('students').select('id,nom,prenom,matricule,filiere,classe').eq('tenant_id', tid).order('nom'),
          supabase.from('filieres').select('nom').eq('tenant_id', tid).order('nom'),
          supabase.from('classes').select('nom').eq('tenant_id', tid).order('nom')
        ])
        
        setStudents(studs.data || [])
        setFilieres(studs.data ? [...new Set(studs.data.map(s => s.filiere))].sort() : [])
        setClasses(cls.data || [])
      } catch (e) {
        console.error('Init error:', e)
      }
    }
    
    init()
  }, [tid])

  // Charger paiements avec filtres
  const loadPaiements = useCallback(async () => {
    if (!tid) return
    setLoading(true)
    
    try {
      let q = supabase.from('paiements').select('*').eq('tenant_id', tid)
      
      if (filterStat !== 'ALL') q = q.eq('statut', filterStat)
      if (debSearch) q = q.ilike('student_name', `%${debSearch}%`)
      
      const { data } = await q.order('date', { ascending: false }).limit(1000)
      
      // Filtrer par filière et classe côté client
      let filtered = data || []
      if (filterFil !== 'ALL') filtered = filtered.filter(p => p.filiere === filterFil)
      if (filterCls !== 'ALL') filtered = filtered.filter(p => p.classe === filterCls)
      
      setPaiements(filtered)
      
      // Stats
      const payés = filtered.filter(p => p.statut === 'PAYÉ').reduce((s, p) => s + p.montant, 0)
      const attentes = filtered.filter(p => p.statut === 'EN ATTENTE').reduce((s, p) => s + p.montant, 0)
      const studs = new Set(filtered.map(p => p.student_id)).size
      
      setStats({ payé: payés, attente: attentes, total: payés + attentes, étuds: studs })
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }, [tid, filterStat, debSearch, filterFil, filterCls])

  useEffect(() => { loadPaiements() }, [loadPaiements])

  // Sauvegarder paiement
  const handleSave = async () => {
    if (!form.student_id || !form.mont) return alert('Étudiant et montant requis')
    
    try {
      const std = students.find(s => s.id === form.student_id)
      const data = {
        student_id: form.student_id,
        student_name: std ? `${std.prenom} ${std.nom}` : '',
        filiere: std?.filiere,
        classe: std?.classe,
        description: form.desc,
        montant: parseInt(form.mont),
        methode: form.meth,
        statut: form.stat,
        date: new Date().toISOString().split('T')[0],
        tenant_id: tid
      }

      if (editId) {
        const { error } = await supabase.from('paiements').update(data).eq('id', editId).eq('tenant_id', tid)
        if (error) throw error
      } else {
        const { error } = await supabase.from('paiements').insert([data])
        if (error) throw error
      }

      setModal(null)
      setEditId(null)
      setForm({ student_id: '', desc: '', mont: '', meth: 'ESPÈCES', stat: 'EN ATTENTE' })
      loadPaiements()
    } catch (e) {
      alert('Erreur: ' + e.message)
    }
  }

  // Import en masse
  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').slice(1).filter(l => l.trim())
      
      const batch = lines.map(line => {
        const [name, fil, montant, meth = 'ESPÈCES'] = line.split(',').map(s => s.trim())
        const std = students.find(s => s.nom.toLowerCase().includes(name.toLowerCase()))
        
        return {
          student_id: std?.id || null,
          student_name: name,
          filiere: fil || std?.filiere,
          classe: std?.classe,
          description: 'Import masse',
          montant: parseInt(montant) || 0,
          methode: meth,
          statut: 'EN ATTENTE',
          date: new Date().toISOString().split('T')[0],
          tenant_id: tid
        }
      }).filter(b => b.student_id)
      
      if (batch.length === 0) return alert('Aucun étudiant trouvé')
      
      // Insérer par chunks de 100
      for (let i = 0; i < batch.length; i += 100) {
        const { error } = await supabase.from('paiements').insert(batch.slice(i, i + 100))
        if (error) throw error
      }
      
      alert(`${batch.length} paiements importés`)
      loadPaiements()
    } catch (e) {
      alert('Erreur import: ' + e.message)
    } finally {
      setImporting(false)
    }
  }

  // Sélection multiple
  const handleBulkCreate = async () => {
    const selected = students.filter((_, i) => document.querySelector(`input[data-idx="${i}"]`)?.checked)
    if (!selected.length) return alert('Sélectionnez au moins un étudiant')
    
    try {
      const batch = selected.map(s => ({
        student_id: s.id,
        student_name: `${s.prenom} ${s.nom}`,
        filiere: s.filiere,
        classe: s.classe,
        description: 'Frais inscription',
        montant: 0,
        methode: 'ESPÈCES',
        statut: 'EN ATTENTE',
        date: new Date().toISOString().split('T')[0],
        tenant_id: tid
      }))
      
      for (let i = 0; i < batch.length; i += 100) {
        const { error } = await supabase.from('paiements').insert(batch.slice(i, i + 100))
        if (error) throw error
      }
      
      alert(`${batch.length} dossiers créés`)
      setModal(null)
      loadPaiements()
    } catch (e) {
      alert('Erreur: ' + e.message)
    }
  }

  // Export CSV
  const handleExport = () => {
    if (!paiements.length) return alert('Aucune donnée')
    
    const csv = ['Étudiant,Filière,Montant,Méthode,Statut,Date', ...paiements.map(p => 
      `${p.student_name},${p.filiere},${p.montant},${p.methode},${p.statut},${p.date}`
    )].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const STAT_COLORS = { 'PAYÉ': '#10b981', 'EN ATTENTE': '#f59e0b', 'EN RETARD': '#ef4444', 'ANNULÉ': '#6b7280' }

  return (
    <DashLayout title="Gestion des Paiements">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Gestion des Paiements</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0 0' }}>Suivi financier et facturation étudiants</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} style={{ padding: '8px 14px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>↓ Export</button>
          <button onClick={() => setModal('bulk')} style={{ padding: '8px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ Masse</button>
          <button onClick={() => setModal('add')} style={{ padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ Nouveau</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Encaissé', val: stats.payé, col: '#10b981' },
          { label: 'En attente', val: stats.attente, col: '#f59e0b' },
          { label: 'Total', val: stats.total, col: '#3b82f6' },
          { label: 'Étudiants', val: stats.étuds, col: '#8b5cf6' }
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.col, marginTop: 6 }}>{s.val.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <input type="text" placeholder="Chercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }} />
        <select value={filterFil} onChange={e => setFilterFil(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}>
          <option value="ALL">Toutes filières</option>
          {filieres.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterCls} onChange={e => setFilterCls(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}>
          <option value="ALL">Toutes classes</option>
          {classes.map(c => <option key={c.nom} value={c.nom}>{c.nom}</option>)}
        </select>
        <select value={filterStat} onChange={e => setFilterStat(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}>
          <option value="ALL">Tous statuts</option>
          <option value="PAYÉ">Payé</option>
          <option value="EN ATTENTE">En attente</option>
          <option value="EN RETARD">En retard</option>
          <option value="ANNULÉ">Annulé</option>
        </select>
      </div>

      {/* Tableau */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>Étudiant</th>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>Filière</th>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>Classe</th>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>Description</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#475569' }}>Montant</th>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>Statut</th>
              <th style={{ padding: 10, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center' }}>Chargement...</td></tr> : paiements.length ? paiements.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: 10, fontSize: 13, fontWeight: 600 }}>{p.student_name}</td>
                <td style={{ padding: 10, fontSize: 12, color: '#64748b' }}>{p.filiere}</td>
                <td style={{ padding: 10, fontSize: 12, color: '#64748b' }}>{p.classe}</td>
                <td style={{ padding: 10, fontSize: 12 }}>{p.description}</td>
                <td style={{ padding: 10, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{p.montant.toLocaleString()} F</td>
                <td style={{ padding: 10 }}><span style={{ background: STAT_COLORS[p.statut], color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{p.statut}</span></td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button onClick={() => {setEditId(p.id); setForm({student_id: p.student_id, desc: p.description, mont: p.montant, meth: p.methode, stat: p.statut}); setModal('add')}} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, marginRight: 4 }}>Edit</button>
                  <button onClick={async () => {if(confirm('Supprimer?')) {await supabase.from('paiements').delete().eq('id', p.id); loadPaiements()}}} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>X</button>
                </td>
              </tr>
            )) : <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Aucun paiement</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal Ajouter */}
      {modal === 'add' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: '90%', maxWidth: 450 }}>
            <h3>{editId ? 'Modifier' : 'Ajouter'} Paiement</h3>
            <select value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 12, fontSize: 13 }} disabled={editId}>
              <option value="">Sélectionner étudiant...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.nom} {s.prenom} - {s.filiere}</option>)}
            </select>
            <input type="text" placeholder="Description" value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 12, fontSize: 13, boxSizing: 'border-box' }} />
            <input type="number" placeholder="Montant" value={form.mont} onChange={e => setForm({...form, mont: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 12, fontSize: 13, boxSizing: 'border-box' }} />
            <select value={form.stat} onChange={e => setForm({...form, stat: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 20, fontSize: 13 }}>
              <option value="EN ATTENTE">En attente</option>
              <option value="PAYÉ">Payé</option>
              <option value="EN RETARD">En retard</option>
              <option value="ANNULÉ">Annulé</option>
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 10, background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSave} style={{ flex: 1, padding: 10, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import masse */}
      {modal === 'bulk' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: '90%', maxWidth: 450 }}>
            <h3>Import en Masse</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Option 1: Importer depuis CSV (Nom,Filière,Montant,Méthode)</p>
            <input type="file" accept=".csv" onChange={handleImportCSV} disabled={importing} style={{ marginBottom: 20, width: '100%', fontSize: 13 }} />
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Option 2: Créer pour les étudiants sélectionnés</p>
            <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, marginBottom: 20 }}>
              {students.slice(0, 50).map((s, i) => <label key={s.id} style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                <input type="checkbox" data-idx={i} style={{ marginRight: 6 }} /> {s.nom} {s.prenom} - {s.filiere}
              </label>)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 10, background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleBulkCreate} style={{ flex: 1, padding: 10, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
