import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── 1. COMPOSANT DE CHAMP (EXTÉRIEUR POUR ÉVITER LA PERTE DE FOCUS) ──
const F = ({ label, name, form, setForm, type = 'text', options, required = false }) => {
  const val = form[name] || ''

  return (
    <div className="form-group">
      <label className="form-label">{label} {required && '*'}</label>
      {options ? (
        <select 
          className="form-input form-select" 
          value={val} 
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        >
          {options.map(o => <option key={o} value={o}>{o || '— Sélectionner —'}</option>)}
        </select>
      ) : (
        <input 
          className="form-input" 
          type={type} 
          value={val} 
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} 
          placeholder={label} 
          required={required}
        />
      )}
    </div>
  )
}

// ── CONSTANTES ──
const SALLES = ['Amphi A (300p)', 'Amphi B (200p)', 'Salle B12 (40p)', 'Salle C4 (60p)', 'Labo Info (30p)', 'Salle C3 (50p)']
const FILIERES = ['L1 Informatique', 'L2 Informatique', 'L3 Informatique', 'M1 Gestion', 'M2 Finance', 'L2 Droit', 'L3 Droit']
const SEMESTRES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
const HEURES = ['07h00', '08h00', '09h00', '10h00', '11h00', '14h00', '15h00', '16h00']

const EMPTY = {
  matiere: '',
  filiere: FILIERES[0],
  semestre: SEMESTRES[0],
  code: '',
  prof: '',
  coef: 1,
  date_examen: '',
  heure: '08h00',
  salle: '',
  duree: '2h',
  statut: 'NON PLANIFIÉ'
}

// ── COMPOSANT CONVOCATIONS MODAL ──
function ConvocModal({ examen, onClose }) {
  const display = Array.from({ length: 10 }, (_, i) => ({
    studentName: `Étudiant ${String(i + 1).padStart(2, '0')}`,
    matricule: `ETU-2024-${String(800 + i).padStart(4, '0')}`,
    salle: examen.salle || 'Amphi A',
    table: i + 1,
    heure: examen.heure
  }))

  const printConvocs = () => {
    const rows = display.map(c => `
      <tr>
        <td style="font-family:monospace;font-size:11px">${c.matricule || '—'}</td>
        <td style="font-weight:700">${c.studentName || '—'}</td>
        <td>${examen.salle || c.salle || 'À confirmer'}</td>
        <td style="font-weight:800;font-size:16px;color:#e85d04;text-align:center">${c.table || '—'}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Marianne','Roboto',sans-serif;color:#1a2035;padding:40px;font-size:12px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #1a2035}
  .logo{font-size:20px;font-weight:800}.logo span{color:#E8A020}
  .exam-box{background:#f8f9fd;border-radius:8px;padding:14px;margin-bottom:16px;border-left:4px solid #4361ee;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .lbl{font-size:9px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:3px}.val{font-weight:800;font-size:13px}
  table{width:100%;border-collapse:collapse}
  th{background:#1a2035;color:#fff;padding: 8px 14px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding: 8px 14px;border-bottom:1px solid #ddd}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #ddd;text-align:center;font-size:10px;color:#999}
</style></head><body>
<div class="header">
  <div><div class="logo">OPTIMUS<span>CAMPUS</span></div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:800">LISTE DES CONVOQUÉS</div></div>
</div>
<div class="exam-box">
  <div><div class="lbl">Matière</div><div class="val">${examen.matiere}</div></div>
  <div><div class="lbl">Date & Heure</div><div class="val">${examen.date_examen} · ${examen.heure}</div></div>
  <div><div class="lbl">Salle</div><div class="val">${examen.salle || 'À confirmer'}</div></div>
  <div><div class="lbl">Prof</div><div class="val">${examen.prof || '—'}</div></div>
</div>
<table role="table"><thead><tr><th>Matricule</th><th>Nom complet</th><th>Salle</th><th style="text-align:center">Table N°</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Généré par Optimus Campus · Service Scolarité · ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 3000)
    }, 600)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 0 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--ink)', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, color: '#fff' }}>📋 Convocations — {examen.matiere}</div>
            <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{examen.date_examen} · {examen.heure} · {examen.salle || 'Salle à confirmer'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>×</button>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, color: 'var(--ink)' }}>
              {display.length} étudiant{display.length > 1 ? 's' : ''} convoqué{display.length > 1 ? 's' : ''}
            </div>
            <button className="btn btn-primary btn-sm" onClick={printConvocs}>🖨️ Imprimer</button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table role="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr style={{ background: 'var(--ink)' }}>
                  {['Matricule', 'Nom complet', 'Salle', 'Table N°'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', color: 'rgba(255,255,255,.85)', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.72rem', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {display.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: '.78rem', color: 'var(--slate)' }}>{c.matricule || '—'}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--ink)' }}>{c.studentName || '—'}</td>
                    <td style={{ padding: '9px 14px', fontSize: '.85rem' }}>{examen.salle || c.salle || 'À confirmer'}</td>
                    <td style={{ padding: '9px 14px', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gold)' }}>{c.table || i + 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── COMPOSANT PRINCIPAL ──
export default function ScolariteExamens() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.id

  const [examens, setExamens] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [convocModal, setConvocModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('all')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── CHARGEMENT ──
  useEffect(() => {
    fetchExamens()
  }, [tenantId])

  const fetchExamens = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date_examen', { ascending: true })
        .limit(500)

      if (error) {
        console.error("Erreur chargement:", error)
        showToast('❌ Erreur: ' + error.message, 'error')
        setExamens([])
      } else {
        setExamens(data || [])
      }
    } catch (err) {
      console.error("Erreur:", err)
      showToast('❌ Erreur connexion', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── SAUVEGARDE ──
  const handleSave = async () => {
    if (!form.matiere || !form.date_examen) {
      showToast('⚠️ Matière et date requises', 'error')
      return
    }

    const newStatut = form.salle && form.prof ? 'PLANIFIÉ' : 'NON PLANIFIÉ'

    const sqlData = {
      tenant_id: tenantId,
      matiere: form.matiere,
      filiere: form.filiere || null,
      semestre: form.semestre || null,
      code: form.code || null,
      prof: form.prof || null,
      coef: Number(form.coef) || 1,
      date_examen: form.date_examen,
      heure: form.heure,
      salle: form.salle || null,
      duree: form.duree || null,
      statut: newStatut
    }

    try {
      if (modal === 'add') {
        const { error } = await supabase.from('examens').insert([sqlData])
        if (error) throw error
        showToast('✅ Examen créé')
      } else if (modal === 'edit' && selected) {
        const { error } = await supabase.from('examens').update(sqlData).eq('id', selected.id)
        if (error) throw error
        showToast('✅ Examen mis à jour')
      }
      setModal(null)
      setForm(EMPTY)
      setSelected(null)
      fetchExamens()
    } catch (err) {
      console.error("Erreur sauvegarde:", err)
      showToast('❌ ' + (err.message || 'Erreur'), 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ?')) return
    try {
      const { error } = await supabase.from('examens').delete().eq('id', id)
      if (error) throw error
      showToast('✅ Supprimé')
      fetchExamens()
    } catch (err) {
      showToast('❌ Erreur', 'error')
    }
  }

  const filtered = useMemo(() => {
    if (tab === 'all') return examens
    return examens.filter(e => e.statut === (tab === 'planned' ? 'PLANIFIÉ' : tab === 'unplanned' ? 'NON PLANIFIÉ' : 'TERMINÉ'))
  }, [examens, tab])

  const nonPlanifies = useMemo(() => examens.filter(e => e.statut === 'NON PLANIFIÉ').length, [examens])

  if (loading) return <DashLayout title="Examens"><div style={{ padding: 60, textAlign: 'center' }}>Chargement...</div></DashLayout>

  return (
    <DashLayout title="Examens" requiredRole="scolarite">
      {/* Toast */}
      {toast && (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Modal Formulaire */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 14, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', borderRadius: '14px 14px 0 0' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, color: '#fff' }}>
                {modal === 'add' ? '➕ Nouvel examen' : '✏️ Modifier'}
              </div>
              <button onClick={() => { setModal(null); setForm(EMPTY); setSelected(null) }} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#fff' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <F label="Matière" name="matiere" form={form} setForm={setForm} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Filière" name="filiere" options={FILIERES} form={form} setForm={setForm} />
                <F label="Semestre" name="semestre" options={SEMESTRES} form={form} setForm={setForm} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Code" name="code" form={form} setForm={setForm} />
                <F label="Coefficient" name="coef" type="number" form={form} setForm={setForm} />
              </div>
              <F label="Professeur" name="prof" form={form} setForm={setForm} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Date" name="date_examen" type="date" form={form} setForm={setForm} required />
                <F label="Heure" name="heure" options={HEURES} form={form} setForm={setForm} />
              </div>
              <F label="Salle" name="salle" options={[''].concat(SALLES)} form={form} setForm={setForm} />
              <F label="Durée" name="duree" form={form} setForm={setForm} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => { setModal(null); setForm(EMPTY); setSelected(null) }}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Créer' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Convocations */}
      {convocModal && <ConvocModal examen={convocModal} onClose={() => setConvocModal(null)} />}

      <div className="dash-page-title">Planning des examens</div>
      <div className="dash-page-sub">{examens.length} sessions · {nonPlanifies} à finaliser</div>

      {/* Alerte */}
      {nonPlanifies > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ {nonPlanifies} examen{nonPlanifies > 1 ? 's' : ''} sans salle ni professeur
        </div>
      )}

      {/* TABLEAU */}
      <div className="card">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Examens</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setSelected(null); setModal('add') }}>➕ Ajouter</button>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>Matière</th>
                <th>Filière</th>
                <th>Professeur</th>
                <th>Salle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, color: 'var(--gold)', fontSize: '.85rem' }}>
                      {e.date_examen ? new Date(e.date_examen).toLocaleDateString('fr-FR') : '—'}
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--slate)' }}>{e.heure || '—'}</div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.9rem' }}>{e.matiere}</td>
                  <td><span className="badge badge-blue" style={{ fontSize: '.72rem' }}>{e.filiere || '—'}</span></td>
                  <td style={{ fontSize: '.82rem', color: e.prof ? 'var(--ink)' : 'var(--slate)' }}>{e.prof || '—'}</td>
                  <td style={{ fontSize: '.82rem', color: e.salle ? 'var(--ink)' : 'var(--red)' }}>{e.salle || '⚠️ Non'}</td>
                  <td><span className={`badge ${e.statut === 'PLANIFIÉ' ? 'badge-green' : 'badge-red'}`}>{e.statut}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" style={{ background: 'var(--blue-light)', color: 'var(--blue)', border: 'none', borderRadius: 6, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', fontSize: '.75rem' }} onClick={() => setConvocModal(e)}>👁 Convocs</button>
                    <button className="btn btn-sm" style={{ background: 'var(--blue-light)', color: 'var(--blue)', border: 'none', borderRadius: 6, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', fontSize: '.75rem' }} onClick={() => { setForm(e); setSelected(e); setModal('edit') }}>✏️ Modifier</button>
                    <button className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 6, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', fontSize: '.75rem' }} onClick={() => handleDelete(e.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Aucun examen trouvé</div>
        )}
      </div>
    </DashLayout>
  )
}
