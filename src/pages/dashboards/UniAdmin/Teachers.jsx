import { useState, useEffect, useMemo, useRef } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { uploadTeacherPhoto } from '../../../utils/storageService'
import useDebounce from '../../../hooks/useDebounce'
import useEscapeKey from '../../../hooks/useEscapeKey'

// ── COMPOSANT DE CHAMP REUTILISABLE ──
const F = ({ label, name, form, setForm, type = 'text', options, required }) => {
  const val = form[name] || '';
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{color: 'var(--red)'}}> *</span>}</label>
      {options ? (
        <select className="form-input form-select" value={val} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}>
          <option value="">Sélectionner...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="form-input" type={type} value={val} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} placeholder={label} />
      )}
    </div>
  );
};

// ── CONFIGURATION & CONSTANTES ──
const EMPTY_FORM = { 
  nom: '', prenom: '', email: '', tel: '', specialite: '', grade: '', heures: 240, status: 'ACTIF', photo: null, photoPreview: null 
};

const genId = () => `ENS-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;

export default function UniAdminTeachers() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id || user?.tenant;

  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalHeures: 0, vacataires: 0 });
  const [specialities, setSpecialities] = useState([]);
  const [grades, setGrades] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  
  const photoRef = useRef();
  const debouncedSearch = useDebounce(search, 350);
  useEscapeKey(() => setModal(null));

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  // ── CHARGEMENT DES DONNÉES & CALCUL STATS ──
  const fetchAllData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [resT, resS, resG, resSt] = await Promise.all([
        supabase.from('teachers').select('*').eq('tenant_id', tenantId).order('nom'),
        supabase.from('teacher_specialities').select('label').eq('tenant_id', tenantId),
        supabase.from('teacher_grades').select('label').eq('tenant_id', tenantId),
        supabase.from('teacher_statuses').select('*')
      ]);

      if (resT.data) {
        setTeachers(resT.data);
        // Calcul des stats
        const hTotal = resT.data.reduce((acc, curr) => acc + (Number(curr.heures) || 0), 0);
        const vacs = resT.data.filter(t => t.status !== 'ACTIF' || t.grade?.toLowerCase().includes('vacataire')).length;
        setStats({ total: resT.data.length, totalHeures: hTotal, vacataires: vacs });
      }
      if (resS.data) setSpecialities(resS.data.map(s => s.label));
      if (resG.data) setGrades(resG.data.map(g => g.label));
      if (resSt.data) setStatuses(resSt.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, [tenantId]);

  // ── GESTION PHOTO ──
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('Max 2 Mo');
    const reader = new FileReader();
    reader.onload = ev => setForm(p => ({ ...p, photoFile: file, photoPreview: ev.target.result }));
    reader.readAsDataURL(file);
  };

  // ── SAUVEGARDE ──
  const handleSave = async () => {
    if (!form.nom || !form.prenom || !form.email) return showToast("Champs obligatoires manquants", "error");
    try {
      const teacherId = modal === 'add' ? genId() : selected.id;
      let photoUrl = form.photo;
      if (form.photoFile) {
        const { url } = await uploadTeacherPhoto(form.photoFile, teacherId);
        if (url) photoUrl = url;
      }

      const payload = {
        nom: form.nom, prenom: form.prenom, email: form.email, tel: form.tel,
        specialite: form.specialite, grade: form.grade, status: form.status,
        heures: Number(form.heures), photo: photoUrl, tenant_id: tenantId
      };

      const { error } = modal === 'add' 
        ? await supabase.from('teachers').insert([{ id: teacherId, ...payload, effectuees: 0 }])
        : await supabase.from('teachers').update(payload).eq('id', teacherId);

      if (error) throw error;
      showToast(modal === 'add' ? "Enseignant ajouté" : "Modifications enregistrées");
      setModal(null); fetchAllData();
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer définitivement cet enseignant ?")) return;
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (!error) { showToast("Enseignant supprimé", "error"); fetchAllData(); }
  };

  const filtered = useMemo(() => {
    return teachers.filter(t => `${t.prenom} ${t.nom} ${t.specialite}`.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [teachers, debouncedSearch]);

  return (
    <DashLayout title="Corps Enseignant">
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 8, background: toast.type === 'error' ? '#e11d48' : '#10b981', color: '#fff', fontWeight: 700 }}>
          {toast.msg}
        </div>
      )}

      {/* ── STATS DASHBOARD ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--blue)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>TOTAL ENSEIGNANTS</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>CHARGE HORAIRE TOTALE</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{stats.totalHeures}h <span style={{ fontSize: 14, fontWeight: 400 }}>/ an</span></div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--orange)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>VACATAIRES / EXTERNES</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{stats.vacataires}</div>
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{fontWeight: 800}}>{modal === 'add' ? 'Nouvel Enseignant' : 'Modifier le profil'}</span>
              <button onClick={() => setModal(null)} style={{background:'none', border:'none', fontSize: 24, cursor:'pointer'}}>×</button>
            </div>
            
            <div style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20, background: 'var(--mist)', padding: 12, borderRadius: 10 }}>
                <div onClick={() => photoRef.current.click()} style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', cursor: 'pointer', overflow: 'hidden', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {form.photoPreview || form.photo ? <img src={form.photoPreview || form.photo} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : '📷'}
                </div>
                <input type="file" ref={photoRef} hidden onChange={handlePhotoChange} accept="image/*" />
                <button className="btn btn-secondary btn-sm" onClick={() => photoRef.current.click()}>Changer la photo</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Nom" name="nom" form={form} setForm={setForm} required />
                <F label="Prénom" name="prenom" form={form} setForm={setForm} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Email" name="email" type="email" form={form} setForm={setForm} required />
                <F label="Téléphone" name="tel" form={form} setForm={setForm} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Spécialité" name="specialite" options={specialities} form={form} setForm={setForm} />
                <F label="Grade" name="grade" options={grades} form={form} setForm={setForm} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Volume annuel (h)" name="heures" type="number" form={form} setForm={setForm} />
                <F label="Statut" name="status" options={statuses.map(s => s.label)} form={form} setForm={setForm} />
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <input className="form-input" placeholder="🔍 Rechercher un nom ou une spécialité..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 350 }} />
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal('add'); }}>+ Ajouter un enseignant</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table role="table">
          <thead>
            <tr>
              <th>Identité</th>
              <th>Spécialité / Grade</th>
              <th>Charge Horaire</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="5" style={{textAlign:'center', padding:40}}>Chargement...</td></tr> : 
             filtered.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <div style={{width:36, height:36, borderRadius:'50%', background:'var(--mist)', overflow:'hidden', border: '1px solid var(--border)'}}>
                      {t.photo && <img src={t.photo} style={{width:'100%', height:'100%', objectFit:'cover'}} />}
                    </div>
                    <div>
                      <div style={{fontWeight:600}}>{t.prenom} {t.nom}</div>
                      <div style={{fontSize:12, color:'var(--slate)'}}>{t.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-blue" style={{display:'block', marginBottom:4}}>{t.specialite}</span>
                  <span style={{fontSize:11, color:'var(--slate)'}}>{t.grade}</span>
                </td>
                <td>
                  <div style={{fontWeight:600}}>{t.effectuees || 0}h / {t.heures}h</div>
                  <div style={{width: 80, height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4}}>
                    <div style={{width: `${Math.min((t.effectuees/t.heures)*100, 100)}%`, height: '100%', background: 'var(--blue)', borderRadius: 2}} />
                  </div>
                </td>
                <td><span className={`badge ${t.status === 'ACTIF' ? 'badge-green' : 'badge-slate'}`}>{t.status}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm" onClick={() => { setSelected(t); setForm(t); setModal('edit'); }}>✏️</button>
                  <button className="btn btn-sm" style={{marginLeft:5, color:'var(--red)'}} onClick={() => handleDelete(t.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashLayout>
  );
}