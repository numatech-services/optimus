import { useState, useRef, useEffect } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import useEscapeKey from '../../../hooks/useEscapeKey'
import useDebounce from '../../../hooks/useDebounce'
import { supabase } from '../../../lib/supabase'
import { uploadStudentPhoto } from '../../../utils/storageService'
import Pagination from '../../../components/UI/Pagination'

// ── Configuration ─────────────────────────────────────────
const EMPTY_FORM = { 
  id: '', // Le matricule saisi servira d'ID
  nom: '', prenom: '', email: '', telephone: '', 
  filiere: '', grade: '', annee: '', status: 'ACTIF', 
  photo: null, photoPreview: null 
};

// ── Sous-Composants ───────────────────────────────────────
function Modal({ title, onClose, width = 560, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: width, borderRadius: 14, padding: 0, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 24, maxHeight: '75vh', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, name, form, setForm, type = 'text', options, required, disabled }) {
  const val = form[name] ?? '';
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
      {options ? (
        <select className="form-input form-select" value={val} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} disabled={disabled}>
          <option value="">Sélectionner...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="form-input" type={type} value={val} placeholder={label} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} disabled={disabled} />
      )}
    </div>
  )
}

function StudentForm({ form, setForm, filieres, statuses, years, isEdit }) {
  const photoRef = useRef();
  const grades = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'];

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024) return alert('Fichier max 2Mo');
    const reader = new FileReader();
    reader.onload = ev => setForm(p => ({ ...p, photoFile: file, photoPreview: ev.target.result }));
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: 'var(--mist)', borderRadius: 10 }}>
        <div onClick={() => photoRef.current?.click()} style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: '#e0e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed #cdd7e2' }}>
          {(form.photoPreview || form.photo) ? <img src={form.photoPreview || form.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📷'}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => photoRef.current?.click()}>Photo</button>
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
      </div>

      {/* CHAMP MATRICULE : Manuel à l'ajout, bloqué en édition */}
      <Field label="Matricule (Identifiant unique)" name="id" form={form} setForm={setForm} required disabled={isEdit} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Nom" name="nom" form={form} setForm={setForm} required />
        <Field label="Prénom" name="prenom" form={form} setForm={setForm} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Filière" name="filiere" form={form} setForm={setForm} options={filieres} required />
        <Field label="Niveau" name="grade" form={form} setForm={setForm} options={grades} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Année académique" name="annee" form={form} setForm={setForm} options={years} required />
        <Field label="Statut" name="status" form={form} setForm={setForm} options={statuses} required />
      </div>
      <Field label="Email" name="email" form={form} setForm={setForm} type="email" />
    </div>
  )
}

// ── Page Principale ───────────────────────────────────────
export default function UniAdminStudents() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id || user?.tenant;

  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, actifs: 0, nouveaux: 0 });
  const [filieres, setFilieres] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PER_PAGE = 25;

  const debouncedSearch = useDebounce(search, 350);
  useEscapeKey(() => setModal(null));

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const fetchMeta = async () => {
    if (!tenantId) return;
    try {
      const [resFil, resSts, resYrs] = await Promise.all([
        supabase.from('filieres').select('nom').eq('tenant_id', tenantId).order('nom'),
        supabase.from('student_statuses').select('label').order('label'),
        supabase.from('annees_academiques').select('label').eq('tenant_id', tenantId).order('label', { ascending: false }),
      ]);
      if (resFil.data) setFilieres([...new Set(resFil.data.map(f => f.nom))]);
      if (resSts.data) setStatuses(resSts.data.map(s => s.label));
      if (resYrs.data) setYears(resYrs.data.map(y => y.label));
    } catch (err) { console.error(err); }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*', { count: 'exact' }).eq('tenant_id', tenantId).order('nom');
      if (filterStatus !== 'ALL') query = query.eq('status', filterStatus);
      if (debouncedSearch) query = query.or(`nom.ilike.%${debouncedSearch}%,prenom.ilike.%${debouncedSearch}%,id.ilike.%${debouncedSearch}%`);

      const from = (page - 1) * PER_PAGE;
      const { data, count, error } = await query.range(from, from + PER_PAGE - 1);
      if (error) throw error;
      setStudents(data);
      setTotalCount(count || 0);

      const { data: allStats } = await supabase.from('students').select('status, created_at').eq('tenant_id', tenantId);
      if (allStats) {
        setStats({
          total: allStats.length,
          actifs: allStats.filter(s => s.status === 'ACTIF').length,
          nouveaux: allStats.filter(s => new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 3600 * 1000)).length
        });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMeta(); }, [tenantId]);
  useEffect(() => { if (tenantId) fetchStudents(); }, [tenantId, page, debouncedSearch, filterStatus]);

  const handleSave = async () => {
    if (!form.id || !form.nom || !form.prenom || !form.filiere) return showToast("Matricule, Nom, Prénom et Filière requis", "error");
    
    try {
      let photoUrl = form.photo;
      if (form.photoFile) {
        const { url } = await uploadStudentPhoto(form.photoFile, form.id);
        if (url) photoUrl = url;
      }

      const payload = {
        nom: form.nom, prenom: form.prenom, email: form.email, tel: form.telephone,
        filiere: form.filiere, grade: form.grade, annee: form.annee, 
        status: form.status, tenant_id: tenantId, photo: photoUrl
      };

      const { error } = modal === 'add' 
        ? await supabase.from('students').insert([{ id: form.id, ...payload }])
        : await supabase.from('students').update(payload).eq('id', form.id);

      if (error) throw error;
      setModal(null); fetchStudents(); showToast("Dossier mis à jour");
    } catch (err) { showToast(err.message, "error"); }
  };

  return (
    <DashLayout title="Gestion Étudiants">
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 3000, padding: '12px 20px', background: toast.type === 'error' ? '#e10600' : '#18753c', color: '#fff', borderRadius: 8 }}>{toast.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--blue)' }}>
          <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700 }}>EFFECTIF TOTAL</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700 }}>ÉTUDIANTS ACTIFS</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{stats.actifs}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input className="form-input" placeholder="Chercher matricule ou nom..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
          <select className="form-input form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 150 }}>
            <option value="ALL">Tous les statuts</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal('add'); }}>+ Inscrire un étudiant</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table role="table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom & Prénom</th>
              <th>Filière / Niveau</th>
              <th>Année</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>Chargement...</td></tr>
            ) : students.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{s.id}</td>
                <td style={{ fontWeight: 600 }}>{s.prenom} {s.nom}</td>
                <td><span className="badge badge-blue">{s.filiere}</span> <small>{s.grade}</small></td>
                <td>{s.annee}</td>
                <td><span className={`badge ${s.status === 'ACTIF' ? 'badge-green' : 'badge-slate'}`}>{s.status}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm" onClick={() => { setForm(s); setModal('edit'); }}>✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(totalCount / PER_PAGE)} onGoTo={setPage} />
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Nouvelle Inscription' : 'Modifier dossier'} onClose={() => setModal(null)}>
          <StudentForm 
            form={form} 
            setForm={setForm} 
            filieres={filieres} 
            statuses={statuses} 
            years={years} 
            isEdit={modal === 'edit'} 
          />
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </div>
        </Modal>
      )}
    </DashLayout>
  )
}