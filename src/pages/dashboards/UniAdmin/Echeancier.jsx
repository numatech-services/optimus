import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { notifyEvent } from '../../../utils/pushService'

const STATUTS = [
  { id: 'all', label: 'Toutes', color: 'var(--primary)' },
  { id: 'A_VENIR', label: 'À venir', color: 'var(--primary)' },
  { id: 'EN_COURS', label: 'En cours', color: '#F3812B' },
  { id: 'EN_RETARD', label: 'En retard', color: '#E10600' },
  { id: 'PAYÉ', label: 'Payé', color: '#18753C' },
]

export default function Echeancier() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  const [echeances, setEcheances] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ description: '', montant: 0, date_limite: '', student_id: '' })
  const [students, setStudents] = useState([])

  const load = async () => {
    setLoading(true)
    const [{ data: ech }, { data: stu }] = await Promise.all([
      supabase.from('echeances').select('*, students(nom, prenom, matricule)').eq('tenant_id', tid).order('date_limite').limit(500),
      supabase.from('students').select('id, nom, prenom, matricule').eq('tenant_id', tid).limit(500),
    ])
    if (ech) setEcheances(ech)
    if (stu) setStudents(stu)
    setLoading(false)
  }

  useEffect(() => { if (tid) load() }, [tid])

  const filtered = filter === 'all' ? echeances : echeances.filter(e => e.statut === filter)

  const stats = {
    total: echeances.length,
    avenir: echeances.filter(e => e.statut === 'A_VENIR').length,
    encours: echeances.filter(e => e.statut === 'EN_COURS').length,
    retard: echeances.filter(e => e.statut === 'EN_RETARD').length,
    paye: echeances.filter(e => e.statut === 'PAYÉ').length,
    montantRetard: echeances.filter(e => e.statut === 'EN_RETARD').reduce((s, e) => s + (e.montant || 0), 0),
  }

  const handleCreate = async () => {
  // Validation
  if (!form.description || !form.date_limite || !form.student_id) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }
  if (form.montant <= 0) return;

  try {
    // AJOUT DE AWAIT ICI
    const { error } = await supabase.from('echeances').insert([{ 
      description: form.description,
      montant: form.montant,
      date_limite: form.date_limite,
      student_id: form.student_id,
      tenant_id: tid, 
      statut: 'A_VENIR' 
    }]);

    if (error) throw error;

    // Notification (optionnel)
    if (notifyEvent) {
      notifyEvent('deadline_approaching', { description: form.description, date: form.date_limite });
    }

    setModal(null);
    setForm({ description: '', montant: 0, date_limite: '', student_id: '' }); // Reset form
    await load(); // Attendre que les données soient rechargées
    
  } catch (err) {
    console.error("[Error Create]", err.message);
    alert("Erreur lors de la création : " + err.message);
  }
}

  const handleMarkPaid = async (id) => {
  try {
    const { error } = await supabase
      .from('echeances')
      .update({ statut: 'PAYÉ' })
      .eq('id', id);

    if (error) {
      // ICI : On affiche l'erreur réelle de Supabase dans la console
      console.error("Erreur détaillée Supabase :", error);
      alert(`Erreur : ${error.message} (Code: ${error.code})`);
      return;
    }

    await load();
  } catch (err) {
    console.error("Erreur système :", err);
  }
};
  if (loading) return <DashLayout title="Échéancier"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Échéancier financier">
      <div className="dash-page-title">Échéancier financier</div>
      <div className="dash-page-sub">Échéances à venir, en cours et en retard</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card"><div className="kpi-label">À venir</div><div className="kpi-value">{stats.avenir}</div></div>
        <div className="kpi-card"><div className="kpi-label">En cours (&lt;30j)</div><div className="kpi-value" style={{ color: '#F3812B' }}>{stats.encours}</div></div>
        <div className="kpi-card"><div className="kpi-label">En retard</div><div className="kpi-value" style={{ color: '#E10600' }}>{stats.retard}</div></div>
        <div className="kpi-card"><div className="kpi-label">Montant en retard</div><div className="kpi-value" style={{ color: '#E10600' }}>{stats.montantRetard.toLocaleString('fr')} FCFA</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {STATUTS.map(s => (
          <button key={s.id} onClick={() => setFilter(s.id)} className={`btn btn-sm ${filter === s.id ? 'btn-primary' : 'btn-secondary'}`}>
            {s.label} {s.id !== 'all' && `(${echeances.filter(e => e.statut === s.id).length})`}
          </button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setModal('add')}>+ Nouvelle échéance</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Étudiant</th><th>Description</th><th>Montant</th><th>Date limite</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Aucune échéance</td></tr>
              ) : filtered.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{e.students ? `${e.students.prenom} ${e.students.nom}` : '—'}</td>
                  <td>{e.description}</td>
                  <td style={{ fontWeight: 600 }}>{(e.montant || 0).toLocaleString('fr')} FCFA</td>
                  <td>{new Date(e.date_limite).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <span className={`badge ${e.statut === 'PAYÉ' ? 'badge-green' : e.statut === 'EN_RETARD' ? 'badge-red' : e.statut === 'EN_COURS' ? 'badge-amber' : 'badge-blue'}`}>
                      {e.statut}
                    </span>
                  </td>
                  <td>
                    {e.statut !== 'PAYÉ' && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleMarkPaid(e.id)}>✓ Payé</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'add' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 16, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="section-title">Nouvelle échéance</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Étudiant</label>
                <select className="form-input form-select" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
                  <option value="">Sélectionner...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.matricule})</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Description *</label><input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Frais de scolarité S2" /></div>
              <div className="grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group"><label className="form-label">Montant (FCFA)</label><input className="form-input" type="number" value={form.montant} onChange={e => setForm(p => ({ ...p, montant: parseInt(e.target.value) || 0 }))} /></div>
                <div className="form-group"><label className="form-label">Date limite *</label><input className="form-input" type="date" value={form.date_limite} onChange={e => setForm(p => ({ ...p, date_limite: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1 }}>Créer l'échéance</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
