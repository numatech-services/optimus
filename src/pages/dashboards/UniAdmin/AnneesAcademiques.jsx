import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

const SEMESTRES_LMD = [
  { niveau: 'L1', semestres: [{ code: 'S1', label: 'Semestre 1' }, { code: 'S2', label: 'Semestre 2' }] },
  { niveau: 'L2', semestres: [{ code: 'S3', label: 'Semestre 3' }, { code: 'S4', label: 'Semestre 4' }] },
  { niveau: 'L3', semestres: [{ code: 'S5', label: 'Semestre 5' }, { code: 'S6', label: 'Semestre 6' }] },
  { niveau: 'M1', semestres: [{ code: 'S1', label: 'Semestre 1' }, { code: 'S2', label: 'Semestre 2' }] },
  { niveau: 'M2', semestres: [{ code: 'S3', label: 'Semestre 3' }, { code: 'S4', label: 'Semestre 4' }] },
  { niveau: 'D1', semestres: [{ code: 'D1', label: 'Doctorat 1ère année' }] },
  { niveau: 'D2', semestres: [{ code: 'D2', label: 'Doctorat 2ème année' }] },
  { niveau: 'D3', semestres: [{ code: 'D3', label: 'Doctorat 3ème année' }] },
  { niveau: 'D4', semestres: [{ code: 'D4', label: 'Doctorat 4ème année' }] },
  { niveau: 'D5', semestres: [{ code: 'D5', label: 'Doctorat 5ème année' }] },
]

export default function AnneesAcademiques() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  const [annees, setAnnees] = useState([])
  const [semestres, setSemestres] = useState([])
  const [parcours, setParcours] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ label: '', date_debut: '', date_fin: '' })
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState([])

  const load = async () => {
    setLoading(true)
    const [rA, rS, rP, rStu] = await Promise.all([
      supabase.from('annees_academiques').select('*').eq('tenant_id', tid).order('date_debut', { ascending: false }).limit(500),
      supabase.from('semestres').select('*').eq('tenant_id', tid).order('code').limit(500),
      supabase.from('parcours_academique').select('*').eq('tenant_id', tid).order('annee_label').limit(500),
      supabase.from('students').select('id, nom, prenom, matricule, niveau, filiere, annee_inscription').eq('tenant_id', tid).limit(500),
    ])
    if (rA.data) setAnnees(rA.data)
    if (rS.data) setSemestres(rS.data)
    if (rP.data) setParcours(rP.data)
    if (rStu.data) setStudents(rStu.data)
    setLoading(false)
  }

  useEffect(() => { if (tid) load() }, [tid])

  const activeYear = annees.find(a => a.active)

const handleCreateYear = async () => {
  // Validations
  if (!form.label || !form.date_debut || !form.date_fin) return alert("Champs vides");
  
  try {
    console.log("Début de la création pour :", form.label);

    // 1. Création de l'année
    const { data: newYear, error: yearError } = await supabase
      .from('annees_academiques')
      .insert([{
        label: form.label,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        active: annees.length === 0,
        tenant_id: tid,
      }])
      .select() // Crucial pour récupérer l'ID
      .single();

    if (yearError) throw yearError;
    console.log("Année créée avec ID :", newYear.id);

    // 2. Création des semestres
    const sems = SEMESTRES_LMD.flatMap(n =>
      n.semestres.map(s => ({
        code: s.code,
        label: `${s.label} — ${n.niveau}`,
        niveau: n.niveau,
        annee_academique_id: newYear.id, // On utilise l'ID tout juste récupéré
        tenant_id: tid,
      }))
    );

    const { error: semError } = await supabase
      .from('semestres')
      .insert(sems);

    if (semError) {
      console.error("Erreur insertion semestres :", semError);
      throw semError;
    }

    console.log("Semestres créés avec succès");
    
    // 3. Reset UI
    setModal(null);
    setForm({ label: '', date_debut: '', date_fin: '' });
    load();
    alert("Année académique créée !");

  } catch (err) {
    console.error("ERREUR COMPLETE :", err);
    alert("Erreur de création : " + (err.message || "Erreur inconnue"));
  }
};

  const handleSwitchYear = async (newYearId) => {
    if (!activeYear || !confirm('Basculer vers cette année académique ? L\'ancienne sera archivée.')) return
    try {
      await supabase.rpc('basculer_annee_academique', {
        p_old_id: activeYear.id, p_new_id: newYearId, p_tenant_id: tid,
      })
    } catch (err) {
      console.error("[Error]", err.message)
    }
    load()
  }

  const studentParcours = selectedStudent
    ? parcours.filter(p => p.student_id === selectedStudent.id).sort((a, b) => a.annee_label.localeCompare(b.annee_label))
    : []

  const searchedStudents = studentSearch.length >= 2
    ? students.filter(s => `${s.prenom} ${s.nom} ${s.matricule}`.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 8)
    : []

  if (loading) return <DashLayout title="Années académiques"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Années académiques">
      <div className="dash-page-title">Années académiques & Promotions</div>
      <div className="dash-page-sub">Semestres, basculement d'année et parcours des étudiants</div>

      {/* Active year banner */}
      {activeYear && (
        <div className="card card-p" style={{ marginBottom: 24, borderLeft: '3px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase' }}>Année en cours</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{activeYear.label}</div>
              <div style={{ fontSize: 14, color: 'var(--slate)' }}>
                {new Date(activeYear.date_debut).toLocaleDateString('fr-FR')} → {new Date(activeYear.date_fin).toLocaleDateString('fr-FR')}
                {' · '}{semestres.filter(s => s.annee_academique_id === activeYear.id).length} semestres
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setModal('create')}>+ Nouvelle année</button>
          </div>
        </div>
      )}
      {!activeYear && (
        <div className="card card-p" style={{ marginBottom: 24, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 16 }}>Aucune année académique active</div>
          <button className="btn btn-primary" onClick={() => setModal('create')}>Créer la première année</button>
        </div>
      )}

      {/* Years list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {annees.map(a => (
          <div key={a.id} className="card card-p" style={{ borderLeft: a.active ? '3px solid var(--primary)' : a.archivee ? '3px solid var(--border)' : '3px solid #F3812B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{a.label}</div>
              <span className={`badge ${a.active ? 'badge-green' : a.archivee ? 'badge-slate' : 'badge-amber'}`}>
                {a.active ? 'Active' : a.archivee ? 'Archivée' : 'Prête'}
              </span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--slate)', marginTop: 8 }}>
              {semestres.filter(s => s.annee_academique_id === a.id).length} semestres
            </div>
            {!a.active && !a.archivee && (
              <button className="btn btn-sm btn-secondary" style={{ marginTop: 12 }} onClick={() => handleSwitchYear(a.id)}>
                ↗ Basculer vers cette année
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Student timeline search */}
      <div className="card card-p" style={{ marginBottom: 24 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>📜 Parcours académique d'un étudiant</div>
        <input className="form-input" placeholder="Rechercher un étudiant (nom ou matricule)..." value={studentSearch}
          onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null) }} style={{ maxWidth: 400 }} />

        {searchedStudents.length > 0 && !selectedStudent && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {searchedStudents.map(s => (
              <button key={s.id} onClick={() => { setSelectedStudent(s); setStudentSearch(`${s.prenom} ${s.nom}`) }}
                className="btn btn-sm btn-secondary">{s.prenom} {s.nom} ({s.matricule})</button>
            ))}
          </div>
        )}

        {selectedStudent && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedStudent.prenom} {selectedStudent.nom}</div>
            <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 20 }}>
              {selectedStudent.matricule} · {selectedStudent.niveau} · {selectedStudent.filiere} · Inscrit en {selectedStudent.annee_inscription || '—'}
            </div>

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />

              {studentParcours.length === 0 ? (
                <div style={{ padding: '20px 0', color: 'var(--slate)', fontSize: 14 }}>
                  Aucun historique trouvé. Le parcours se construira au fil des basculements d'années.
                </div>
              ) : studentParcours.map((p, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 20, paddingBottom: 8 }}>
                  {/* Dot */}
                  <div style={{ position: 'absolute', left: -23, top: 4, width: 10, height: 10, borderRadius: '50%', background: p.resultat === 'VALIDÉ' ? '#18753C' : p.resultat === 'AJOURNÉ' ? '#E10600' : 'var(--primary)' }} />
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.annee_label} — {p.niveau}</div>
                  <div style={{ fontSize: 14, color: 'var(--slate)' }}>
                    {p.filiere} {p.departement ? `· ${p.departement}` : ''} {p.faculte ? `· ${p.faculte}` : ''}
                  </div>
                  {p.moyenne && <div style={{ fontSize: 14, marginTop: 4 }}>Moyenne : <strong>{p.moyenne}/20</strong> · Crédits : {p.credits_valides}/{p.credits_requis}</div>}
                  <span className={`badge ${p.resultat === 'VALIDÉ' ? 'badge-green' : p.resultat === 'AJOURNÉ' ? 'badge-red' : p.resultat === 'RATTRAPAGE' ? 'badge-amber' : 'badge-blue'}`} style={{ marginTop: 4 }}>
                    {p.resultat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create year modal */}
      {modal === 'create' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 16, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="section-title">Nouvelle année académique</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Label *</label>
                <input className="form-input" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="2026-2027" />
              </div>
              <div className="grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group"><label className="form-label">Début</label><input className="form-input" type="date" value={form.date_debut} onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Fin</label><input className="form-input" type="date" value={form.date_fin} onChange={e => setForm(p => ({ ...p, date_fin: e.target.value }))} /></div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--mist)', borderRadius: 8, fontSize: 14, color: 'var(--slate)', marginBottom: 16 }}>
                Les semestres S1→S6 (Licence), S1→S4 (Master) et D1→D5 (Doctorat) seront créés automatiquement.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleCreateYear} style={{ flex: 1 }}>Créer l'année</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
