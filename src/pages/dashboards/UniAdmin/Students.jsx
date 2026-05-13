import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import useEscapeKey from '../../../hooks/useEscapeKey'
import useDebounce from '../../../hooks/useDebounce'
import { supabase } from '../../../lib/supabase'
import { uploadStudentPhoto } from '../../../utils/storageService'
import Pagination from '../../../components/UI/Pagination'

// ── Configuration ─────────────────────────────────────────
const EMPTY_FORM = {
  id: '',
  nom: '', prenom: '', email: '', telephone: '',
  filiere: '', grade: '', annee: '', status: 'ACTIF',
  photo: null, photoPreview: null
}

// Colonnes attendues dans le fichier Excel (insensible à la casse)
const EXCEL_COLUMN_MAP = {
  matricule: 'id',
  id: 'id',
  nom: 'nom',
  prenom: 'prenom',
  prénom: 'prenom',
  email: 'email',
  telephone: 'telephone',
  téléphone: 'telephone',
  tel: 'telephone',
  filiere: 'filiere',
  filière: 'filiere',
  grade: 'grade',
  niveau: 'grade',
  annee: 'annee',
  année: 'annee',
  statut: 'status',
  status: 'status',
}

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
  const val = form[name] ?? ''
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
  const photoRef = useRef()
  const grades = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3']

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file || file.size > 2 * 1024 * 1024) return alert('Fichier max 2Mo')
    const reader = new FileReader()
    reader.onload = ev => setForm(p => ({ ...p, photoFile: file, photoPreview: ev.target.result }))
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: 'var(--mist)', borderRadius: 10 }}>
        <div onClick={() => photoRef.current?.click()} style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: '#e0e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed #cdd7e2', fontSize: 24 }}>
          {(form.photoPreview || form.photo) ? <img src={form.photoPreview || form.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📷'}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => photoRef.current?.click()}>Photo</button>
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
      </div>
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

// ── Modal Import Excel ────────────────────────────────────
function ImportModal({ onClose, tenantId, onDone, showToast }) {
  const fileRef = useRef()
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null) // { inserted, skipped }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      const parsed = []
      const errs = []

      raw.forEach((row, idx) => {
        // Normalise les clés de la ligne
        const normalized = {}
        Object.entries(row).forEach(([k, v]) => {
          const mapped = EXCEL_COLUMN_MAP[k.toLowerCase().trim()]
          if (mapped) normalized[mapped] = String(v).trim()
        })

        const lineNum = idx + 2 // ligne Excel (header = 1)
        if (!normalized.id)  errs.push(`Ligne ${lineNum} : matricule manquant`)
        if (!normalized.nom) errs.push(`Ligne ${lineNum} : nom manquant`)
        if (!normalized.prenom) errs.push(`Ligne ${lineNum} : prénom manquant`)

        if (normalized.id && normalized.nom && normalized.prenom) {
          parsed.push({ ...normalized, status: normalized.status || 'ACTIF', tenant_id: tenantId })
        }
      })

      setRows(parsed)
      setErrors(errs)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (!rows.length) return
    setImporting(true)
    let inserted = 0, skipped = 0

    for (const row of rows) {
      const { error } = await supabase.from('students').upsert(row, { onConflict: 'id', ignoreDuplicates: false })
      if (error) { skipped++; console.warn(error.message) } else { inserted++ }
    }

    setDone({ inserted, skipped })
    setImporting(false)
    showToast(`${inserted} étudiant(s) importé(s)${skipped ? `, ${skipped} ignoré(s)` : ''}`)
    onDone()
  }

  const downloadTemplate = () => {
    const headers = [['matricule', 'nom', 'prenom', 'email', 'telephone', 'filiere', 'grade', 'annee', 'statut']]
    const example  = [['ETU-001', 'Diallo', 'Aminata', 'a.diallo@univ.ne', '+227 90 00 00 00', 'Informatique', 'L1', '2025-2026', 'ACTIF']]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example])
    ws['!cols'] = headers[0].map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Étudiants')
    XLSX.writeFile(wb, 'modele_import_etudiants.xlsx')
  }

  return (
    <Modal title="Import depuis Excel" onClose={onClose} width={600}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{done.inserted} étudiant(s) importé(s)</div>
          {done.skipped > 0 && <div style={{ color: 'var(--slate)', fontSize: 13 }}>{done.skipped} ligne(s) ignorée(s) (erreurs)</div>}
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Fermer</button>
        </div>
      ) : (
        <>
          {/* Étape 1 : télécharger le modèle */}
          <div style={{ background: 'var(--mist)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Modèle Excel</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>Colonnes : matricule, nom, prénom, email, filière, grade, année, statut</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>Télécharger le modèle</button>
          </div>

          {/* Étape 2 : choisir le fichier */}
          <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
            <div style={{ fontSize: 13, color: 'var(--slate)' }}>
              {rows.length > 0
                ? <><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{rows.length} ligne(s)</span> prête(s) à importer</>
                : 'Cliquer pour choisir un fichier Excel (.xlsx, .xls, .csv)'}
            </div>
          </div>

          {/* Erreurs de validation */}
          {errors.length > 0 && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 12, marginBottom: 6 }}>Erreurs détectées ({errors.length})</div>
              {errors.slice(0, 5).map((e, i) => <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 2 }}>{e}</div>)}
              {errors.length > 5 && <div style={{ fontSize: 12, color: '#7f1d1d' }}>...et {errors.length - 5} autre(s)</div>}
            </div>
          )}

          {/* Aperçu des premières lignes */}
          {rows.length > 0 && (
            <div style={{ marginBottom: 16, overflowX: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Aperçu ({Math.min(rows.length, 3)} / {rows.length})</div>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['id','nom','prenom','filiere','grade','annee','status'].map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)', color: 'var(--slate)', fontWeight: 600 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((r, i) => (
                    <tr key={i}>
                      {['id','nom','prenom','filiere','grade','annee','status'].map(col => (
                        <td key={col} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', color: 'var(--ink)' }}>{r[col] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={!rows.length || importing}>
              {importing ? 'Import en cours…' : `Importer ${rows.length} étudiant(s)`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ── Page Principale ───────────────────────────────────────
export default function UniAdminStudents() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.tenant

  const [students, setStudents]       = useState([])
  const [stats, setStats]             = useState({ total: 0, actifs: 0, nouveaux: 0 })
  const [filieres, setFilieres]       = useState([])
  const [statuses, setStatuses]       = useState([])
  const [years, setYears]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null) // null | 'add' | 'edit' | 'import'
  const [form, setForm]               = useState(EMPTY_FORM)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [toast, setToast]             = useState(null)
  const [page, setPage]               = useState(1)
  const [totalCount, setTotalCount]   = useState(0)
  const PER_PAGE = 25

  const debouncedSearch = useDebounce(search, 350)
  useEscapeKey(() => setModal(null))

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchMeta = async () => {
    if (!tenantId) return
    try {
      const [resFil, resSts, resYrs] = await Promise.all([
        supabase.from('filieres').select('nom').eq('tenant_id', tenantId).order('nom'),
        supabase.from('student_statuses').select('label').order('label'),
        supabase.from('annees_academiques').select('label').eq('tenant_id', tenantId).order('label', { ascending: false }),
      ])
      if (resFil.data) setFilieres([...new Set(resFil.data.map(f => f.nom))])
      if (resSts.data) setStatuses(resSts.data.map(s => s.label))
      if (resYrs.data) setYears(resYrs.data.map(y => y.label))
    } catch (err) { console.error(err) }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      let query = supabase.from('students').select('*', { count: 'exact' }).eq('tenant_id', tenantId).order('nom')
      if (filterStatus !== 'ALL') query = query.eq('status', filterStatus)
      if (debouncedSearch) query = query.or(`nom.ilike.%${debouncedSearch}%,prenom.ilike.%${debouncedSearch}%,id.ilike.%${debouncedSearch}%`)

      const from = (page - 1) * PER_PAGE
      const { data, count, error } = await query.range(from, from + PER_PAGE - 1)
      if (error) throw error
      setStudents(data)
      setTotalCount(count || 0)

      const { data: allStats } = await supabase.from('students').select('status, created_at').eq('tenant_id', tenantId)
      if (allStats) {
        setStats({
          total: allStats.length,
          actifs: allStats.filter(s => s.status === 'ACTIF').length,
          nouveaux: allStats.filter(s => new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 3600 * 1000)).length,
        })
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchMeta() }, [tenantId])
  useEffect(() => { if (tenantId) fetchStudents() }, [tenantId, page, debouncedSearch, filterStatus])

  const handleSave = async () => {
    if (!form.id || !form.nom || !form.prenom || !form.filiere) return showToast('Matricule, Nom, Prénom et Filière requis', 'error')

    try {
      let photoUrl = form.photo
      if (form.photoFile) {
        const { url } = await uploadStudentPhoto(form.photoFile, form.id)
        if (url) photoUrl = url
      }

      const payload = {
        nom: form.nom, prenom: form.prenom, email: form.email, tel: form.telephone,
        filiere: form.filiere, grade: form.grade, annee: form.annee,
        status: form.status, tenant_id: tenantId, photo: photoUrl,
      }

      const { error } = modal === 'add'
        ? await supabase.from('students').insert([{ id: form.id, ...payload }])
        : await supabase.from('students').update(payload).eq('id', form.id)

      if (error) throw error
      setModal(null); fetchStudents(); showToast('Dossier mis à jour')
    } catch (err) { showToast(err.message, 'error') }
  }

  return (
    <DashLayout title="Gestion Étudiants">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 3000, padding: '12px 20px', background: toast.type === 'error' ? '#e10600' : '#18753c', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}

      {/* KPIs */}
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

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
          <input className="form-input" placeholder="Chercher matricule ou nom..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
          <select className="form-input form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 150 }}>
            <option value="ALL">Tous les statuts</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setModal('import')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Importer Excel
          </button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal('add') }}>
            + Inscrire un étudiant
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table role="table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom &amp; Prénom</th>
              <th>Filière / Niveau</th>
              <th>Année</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Chargement...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Aucun étudiant trouvé</td></tr>
            ) : students.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{s.id}</td>
                <td style={{ fontWeight: 600 }}>{s.prenom} {s.nom}</td>
                <td><span className="badge badge-blue">{s.filiere}</span> <small>{s.grade}</small></td>
                <td>{s.annee}</td>
                <td><span className={`badge ${s.status === 'ACTIF' ? 'badge-green' : 'badge-slate'}`}>{s.status}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm" onClick={() => { setForm(s); setModal('edit') }}>Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(totalCount / PER_PAGE)} onGoTo={setPage} />
      </div>

      {/* Modal ajout/édition */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Nouvelle Inscription' : 'Modifier dossier'} onClose={() => setModal(null)}>
          <StudentForm form={form} setForm={setForm} filieres={filieres} statuses={statuses} years={years} isEdit={modal === 'edit'} />
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </div>
        </Modal>
      )}

      {/* Modal import Excel */}
      {modal === 'import' && (
        <ImportModal
          onClose={() => setModal(null)}
          tenantId={tenantId}
          onDone={fetchStudents}
          showToast={showToast}
        />
      )}
    </DashLayout>
  )
}