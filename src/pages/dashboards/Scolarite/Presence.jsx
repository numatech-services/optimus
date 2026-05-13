import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import DashLayout from '../../../components/Layout/DashLayout'

// ── Badge statut ──
const StatutBadge = ({ statut }) => {
  const cfg = {
    'PRÉSENT':  { bg: 'var(--green)',  text: '#fff' },
    'ABSENT':   { bg: 'var(--red)',    text: '#fff' },
    'JUSTIFIÉ': { bg: '#f59e0b',       text: '#fff' },
    'RETARD':   { bg: '#6366f1',       text: '#fff' },
  }[statut] || { bg: 'var(--mist)', text: 'var(--slate)' }
  return (
    <span style={{ background: cfg.bg, color: cfg.text, borderRadius: 6, padding: '3px 10px', fontSize: '.75rem', fontWeight: 700 }}>
      {statut}
    </span>
  )
}

// ── Modal justification ──
function JustificationModal({ student, onSave, onClose }) {
  const [just, setJust] = useState(student.justification || '')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, borderRadius: 14, padding: 0 }}>
        <div style={{ padding: '16px 20px', background: '#f59e0b', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, color: '#fff', fontFamily: 'Roboto, sans-serif' }}>
            Justifier l'absence — {student.nom}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <label style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--slate)', display: 'block', marginBottom: 6 }}>
            Motif de la justification
          </label>
          <textarea
            value={just} onChange={e => setJust(e.target.value)}
            placeholder="Ex: Certificat médical, autorisation parentale…"
            rows={4} className="form-input"
            style={{ width: '100%', resize: 'vertical', fontSize: '.88rem' }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={() => onSave(just)}>Valider la justification</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Impression ──
function printPresence({ filtered, nomSession, filterDate, stats }) {
  const dateFormatted = new Date(filterDate).toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const statutColor = {
    'PRÉSENT':  '#15803d',
    'ABSENT':   '#b91c1c',
    'JUSTIFIÉ': '#b45309',
    'RETARD':   '#4338ca',
  }

  const rows = filtered.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="font-family:monospace;font-size:11px">${s.matricule || s.id?.slice(-6) || '—'}</td>
      <td style="font-weight:600">${s.nom_complet}</td>
      <td>${s.annee || '—'}</td>
      <td style="font-weight:700;color:${statutColor[s.statut] || '#374151'}">${s.statut}</td>
      <td style="font-family:monospace">${s.heure_arrivee || '—'}</td>
      <td style="font-size:11px;color:#6b7280">${s.justification || '—'}</td>
      <td style="border:1px solid #d1d5db;min-width:80px">&nbsp;</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Feuille de présence — ${nomSession}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px 32px; }

        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #111; }
        .header-left h1 { font-size: 17px; font-weight: 800; margin-bottom: 4px; }
        .header-left p  { font-size: 12px; color: #555; }
        .header-right   { text-align: right; font-size: 11px; color: #555; }

        .stats { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
        .stat-pill { padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid; }
        .stat-total    { border-color: #374151; color: #374151; }
        .stat-present  { border-color: #15803d; color: #15803d; background: #f0fdf4; }
        .stat-absent   { border-color: #b91c1c; color: #b91c1c; background: #fef2f2; }
        .stat-justifie { border-color: #b45309; color: #b45309; background: #fffbeb; }
        .stat-retard   { border-color: #4338ca; color: #4338ca; background: #eef2ff; }

        table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        thead tr { background: #1e293b; color: #fff; }
        thead th { padding: 8px 10px; text-align: left; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody tr:hover { background: #f1f5f9; }
        tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }

        .footer { margin-top: 32px; display: flex; justify-content: space-between; padding-top: 16px; border-top: 1px solid #d1d5db; font-size: 11px; color: #6b7280; }
        .signature-block { margin-top: 36px; display: flex; justify-content: flex-end; }
        .signature-box { border: 1px solid #d1d5db; border-radius: 6px; padding: 12px 24px; min-width: 220px; text-align: center; }
        .signature-box p { font-size: 11px; color: #6b7280; margin-bottom: 36px; }
        .signature-box strong { font-size: 12px; }

        @media print {
          body { padding: 12px 18px; }
          @page { margin: 1cm; size: A4 landscape; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>Feuille de présence</h1>
          <p>${nomSession}</p>
          <p style="margin-top:4px;font-weight:700">${dateFormatted}</p>
        </div>
        <div class="header-right">
          <div>Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style="margin-top:4px">${filtered.length} étudiant(s) affiché(s)</div>
        </div>
      </div>

      <div class="stats">
        <span class="stat-pill stat-total">Total : ${stats.total}</span>
        <span class="stat-pill stat-present">Présents : ${stats.presents}</span>
        <span class="stat-pill stat-absent">Absents : ${stats.absents}</span>
        <span class="stat-pill stat-justifie">Justifiés : ${stats.justifies}</span>
        <span class="stat-pill stat-retard">Retards : ${stats.retards}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Matricule</th>
            <th>Nom complet</th>
            <th>Niveau</th>
            <th>Statut</th>
            <th>Heure</th>
            <th>Justification</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="signature-block">
        <div class="signature-box">
          <p>Signature du responsable</p>
          <strong>________________________</strong>
        </div>
      </div>

      <div class="footer">
        <span>Document généré automatiquement — ne pas modifier</span>
        <span>Page 1</span>
      </div>

      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

export default function Presence() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.id

  const [filterFiliere, setFilterFiliere] = useState('')
  const [filterAnnee, setFilterAnnee]     = useState('')
  const [filterMatiere, setFilterMatiere] = useState('')
  const [filterExamen, setFilterExamen]   = useState('')
  const [filterDate, setFilterDate]       = useState(() => new Date().toISOString().split('T')[0])
  const [typeSession, setTypeSession]     = useState('COURS')

  const [filieres, setFilieres] = useState([])
  const [annees, setAnnees]     = useState([])
  const [matieres, setMatieres] = useState([])
  const [examens, setExamens]   = useState([])

  const [students, setStudents]   = useState([])
  const [presences, setPresences] = useState([])

  const [loading, setLoading]           = useState(false)
  const [saving, setSaving]             = useState(null)
  const [search, setSearch]             = useState('')
  const [toast, setToast]               = useState(null)
  const [justModal, setJustModal]       = useState(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const load = async () => {
      const [resFil, resAnn] = await Promise.all([
        supabase.from('filieres').select('id,nom').eq('tenant_id', tenantId).order('nom'),
        supabase.from('annees_academiques').select('*').eq('tenant_id', tenantId).order('label', { ascending: false }),
      ])
      setFilieres(resFil.data || [])
      setAnnees(resAnn.data || [])
      const current = (resAnn.data || []).find(a => a.active === true)
      if (current) setFilterAnnee(current.label)
      else if (resAnn.data?.length > 0) setFilterAnnee(resAnn.data[0].label)
    }
    if (tenantId) load()
  }, [tenantId])

  useEffect(() => {
    if (!filterFiliere || !filterAnnee) { setMatieres([]); setFilterMatiere(''); return }
    supabase.from('matieres').select('id,nom,code,semestre,enseignant_nom')
      .eq('tenant_id', tenantId).eq('filiere', filterFiliere).eq('annee', filterAnnee).order('nom')
      .then(({ data }) => { setMatieres(data || []); setFilterMatiere('') })
  }, [filterFiliere, filterAnnee, tenantId])

  useEffect(() => {
    if (!filterFiliere || !filterAnnee) { setExamens([]); setFilterExamen(''); return }
    supabase.from('examens').select('id,matiere,matiere_id,date_examen,heure,salle,statut')
      .eq('tenant_id', tenantId).eq('filiere', filterFiliere)
      .order('date_examen', { ascending: false })
      .then(({ data }) => { setExamens(data || []); setFilterExamen('') })
  }, [filterFiliere, filterAnnee, tenantId])

  useEffect(() => {
    setSessionLoaded(false)
    if (!filterFiliere) { setStudents([]); return }
    supabase.from('students').select('id,nom,prenom,matricule,annee')
      .eq('tenant_id', tenantId).eq('filiere', filterFiliere).order('nom')
      .then(({ data, error }) => {
        if (error) console.error('Erreur etudiants:', error)
        setStudents(data || [])
      })
  }, [filterFiliere, tenantId])

  const loadPresences = useCallback(async () => {
    if (!filterFiliere) return
    if (typeSession === 'COURS' && !filterMatiere) return
    setLoading(true)
    try {
      let q = supabase.from('presences').select('*')
        .eq('tenant_id', tenantId).eq('filiere', filterFiliere)
        .eq('type_session', typeSession).eq('date_session', filterDate)
      if (typeSession === 'COURS' && filterMatiere) q = q.eq('matiere_id', filterMatiere)
      else if (typeSession === 'EXAMEN' && filterExamen) q = q.eq('examen_id', filterExamen)
      const { data } = await q
      setPresences(data || [])
      setSessionLoaded(true)
    } catch { showToast('Erreur chargement présences', 'error') }
    finally { setLoading(false) }
  }, [filterFiliere, filterMatiere, filterExamen, filterDate, typeSession, tenantId])

  const studentsView = useMemo(() => students.map(s => {
    const p = presences.find(x => x.student_id === s.id)
    return {
      ...s,
      nom_complet: `${s.prenom} ${s.nom}`,
      statut: p?.statut || 'ABSENT',
      justification: p?.justification || '',
      heure_arrivee: p?.heure_arrivee || null,
      presence_id: p?.id || null,
    }
  }), [students, presences])

  const filtered = useMemo(() => {
    if (!search) return studentsView
    const q = search.toLowerCase()
    return studentsView.filter(s =>
      s.nom_complet.toLowerCase().includes(q) || s.matricule?.toLowerCase().includes(q)
    )
  }, [studentsView, search])

  const stats = useMemo(() => ({
    total:    studentsView.length,
    presents: studentsView.filter(s => s.statut === 'PRÉSENT').length,
    absents:  studentsView.filter(s => s.statut === 'ABSENT').length,
    justifies:studentsView.filter(s => s.statut === 'JUSTIFIÉ').length,
    retards:  studentsView.filter(s => s.statut === 'RETARD').length,
  }), [studentsView])

  const nomSession = useMemo(() => {
    if (typeSession === 'COURS') {
      const m = matieres.find(x => x.id === filterMatiere)
      return m ? `${m.nom} — ${filterFiliere} (${filterAnnee})` : ''
    } else {
      const e = examens.find(x => x.id === filterExamen)
      return e ? `Examen: ${e.matiere} — ${filterFiliere} (${new Date(e.date_examen).toLocaleDateString('fr-FR')})` : ''
    }
  }, [typeSession, filterMatiere, filterExamen, matieres, examens, filterFiliere, filterAnnee])

  const updateStatut = async (student, newStatut, justification = null) => {
    setSaving(student.id)
    const matiereObj = matieres.find(m => m.id === filterMatiere)
    const examenObj  = examens.find(e => e.id === filterExamen)
    const payload = {
      student_id: student.id, student_nom: student.nom_complet, student_mat: student.matricule,
      filiere: filterFiliere, annee: filterAnnee,
      matiere_id: typeSession === 'COURS' ? filterMatiere : (examenObj?.matiere_id || null),
      matiere_nom: typeSession === 'COURS' ? (matiereObj?.nom || '') : (examenObj?.matiere || ''),
      examen_id: typeSession === 'EXAMEN' ? filterExamen : null,
      type_session: typeSession, date_session: filterDate, statut: newStatut,
      justification: justification || null,
      heure_arrivee: (newStatut === 'PRÉSENT' || newStatut === 'RETARD') ? new Date().toTimeString().slice(0, 5) : null,
      saisie_par: user?.id, tenant_id: tenantId,
    }
    try {
      if (student.presence_id) {
        const { error } = await supabase.from('presences')
          .update({ statut: newStatut, justification: justification || null, heure_arrivee: payload.heure_arrivee })
          .eq('id', student.presence_id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('presences').insert([payload])
        if (error) throw error
      }
      await loadPresences()
      showToast(`${student.nom_complet} → ${newStatut}`)
    } catch (err) { showToast(err.message, 'error') }
    finally { setSaving(null) }
  }

  const marquerTousPresents = async () => {
    if (!confirm(`Marquer ${studentsView.filter(s => s.statut !== 'PRÉSENT').length} étudiant(s) comme présents ?`)) return
    for (const s of studentsView.filter(s => s.statut !== 'PRÉSENT')) await updateStatut(s, 'PRÉSENT')
    showToast('Tous marqués présents')
  }

  const sessionValide = typeSession === 'COURS'
    ? (filterFiliere && filterAnnee && filterMatiere)
    : (filterFiliere && filterAnnee && filterExamen)

  return (
    <DashLayout title="Présence" requiredRole={['surveillant', 'scolarite', 'admin_universite', 'enseignant']}>

      {toast && (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {justModal && (
        <JustificationModal
          student={justModal}
          onSave={async (just) => { await updateStatut(justModal, 'JUSTIFIÉ', just); setJustModal(null) }}
          onClose={() => setJustModal(null)}
        />
      )}

      <div className="dash-page-title">Feuille de présence</div>
      <div className="dash-page-sub">
        {sessionLoaded && nomSession ? nomSession : 'Sélectionnez une filière, une année et une matière ou un examen'}
      </div>

      {/* Panneau de sélection */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 12, color: 'var(--ink)' }}>
          Paramètres de la session
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['COURS', 'EXAMEN'].map(t => (
            <button key={t} onClick={() => { setTypeSession(t); setSessionLoaded(false) }}
              style={{ padding: '7px 18px', borderRadius: 8, border: '2px solid', borderColor: typeSession === t ? 'var(--blue)' : 'var(--border)', background: typeSession === t ? 'var(--blue-light)' : '#fff', color: typeSession === t ? 'var(--blue)' : 'var(--slate)', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
              {t === 'COURS' ? 'Cours' : 'Examen'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>Filière / Classe *</label>
            <select className="form-input form-select" value={filterFiliere}
              onChange={e => { setFilterFiliere(e.target.value); setSessionLoaded(false) }}>
              <option value="">— Sélectionner —</option>
              {filieres.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>Année académique *</label>
            <select className="form-input form-select" value={filterAnnee}
              onChange={e => { setFilterAnnee(e.target.value); setSessionLoaded(false) }}>
              <option value="">— Sélectionner —</option>
              {annees.map(a => <option key={a.id} value={a.label}>{a.label}{a.is_current ? ' ✦' : ''}</option>)}
            </select>
          </div>
          {typeSession === 'COURS' && (
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>Matière *</label>
              <select className="form-input form-select" value={filterMatiere}
                onChange={e => { setFilterMatiere(e.target.value); setSessionLoaded(false) }}
                disabled={matieres.length === 0}>
                <option value="">— Sélectionner —</option>
                {matieres.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nom}{m.code ? ` (${m.code})` : ''}{m.enseignant_nom ? ` · ${m.enseignant_nom}` : ''}
                  </option>
                ))}
              </select>
              {filterFiliere && filterAnnee && matieres.length === 0 && (
                <div style={{ fontSize: '.73rem', color: 'var(--red)', marginTop: 3, fontWeight: 600 }}>
                  Aucune matière pour cette filière/année
                </div>
              )}
            </div>
          )}
          {typeSession === 'EXAMEN' && (
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>Examen *</label>
              <select className="form-input form-select" value={filterExamen}
                onChange={e => { setFilterExamen(e.target.value); setSessionLoaded(false) }}
                disabled={examens.length === 0}>
                <option value="">— Sélectionner —</option>
                {examens.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.matiere}{e.date_examen ? ` · ${new Date(e.date_examen).toLocaleDateString('fr-FR')}` : ''}{e.heure ? ` ${e.heure}` : ''}{e.salle ? ` · ${e.salle}` : ''}
                  </option>
                ))}
              </select>
              {filterFiliere && examens.length === 0 && (
                <div style={{ fontSize: '.73rem', color: 'var(--slate)', marginTop: 3 }}>Aucun examen programmé pour cette filière</div>
              )}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>Date de la session</label>
            <input type="date" className="form-input" value={filterDate}
              onChange={e => { setFilterDate(e.target.value); setSessionLoaded(false) }} />
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" disabled={!sessionValide || loading} onClick={loadPresences}>
            {loading ? 'Chargement…' : 'Charger la liste'}
          </button>
          {sessionLoaded && students.length > 0 && (
            <button className="btn btn-secondary" onClick={marquerTousPresents}>
              Tout marquer présent
            </button>
          )}
          {/* ── Bouton Imprimer ── */}
          {sessionLoaded && filtered.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => printPresence({ filtered, nomSession, filterDate, stats })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5V2h8v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="1" y="5" width="14" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M4 9h8M4 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M4 9v5h8V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Imprimer ({filtered.length})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {sessionLoaded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total',    value: stats.total,    color: 'var(--ink)'  },
            { label: 'Présents', value: stats.presents, color: 'var(--green)'},
            { label: 'Absents',  value: stats.absents,  color: 'var(--red)'  },
            { label: 'Justifiés',value: stats.justifies,color: '#f59e0b'     },
            { label: 'Retards',  value: stats.retards,  color: '#6366f1'     },
          ].map((s, i) => (
            <div key={i} className="kpi-card">
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--slate)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Barre de recherche */}
      {sessionLoaded && students.length > 0 && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Chercher par nom ou matricule…"
            className="form-input" style={{ width: 300, padding: '8px 14px', fontSize: '.85rem' }} />
          {search && (
            <span style={{ fontSize: '.8rem', color: 'var(--slate)' }}>
              {filtered.length} résultat(s) sur {studentsView.length}
            </span>
          )}
        </div>
      )}

      {/* Table des étudiants */}
      {sessionLoaded && (
        <div className="card">
          {students.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--slate)' }}>
              Aucun étudiant actif trouvé dans la filière <strong>{filterFiliere}</strong>
            </div>
          ) : (
            <div className="table-wrap">
              <table role="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Matricule</th>
                    <th>Nom complet</th>
                    <th>Niveau</th>
                    <th>Statut</th>
                    <th>Heure</th>
                    <th>Justification</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} style={{ opacity: saving === s.id ? 0.5 : 1, transition: 'opacity .2s' }}>
                      <td style={{ color: 'var(--slate)', fontSize: '.78rem', fontWeight: 500 }}>{i + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '.78rem', color: 'var(--slate)' }}>
                        {s.matricule || s.id?.slice(-6)}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.nom_complet}</td>
                      <td style={{ fontSize: '.82rem', color: 'var(--slate)' }}>{s.annee || '—'}</td>
                      <td><StatutBadge statut={s.statut} /></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '.78rem' }}>{s.heure_arrivee || '—'}</td>
                      <td style={{ fontSize: '.8rem', color: 'var(--slate)', maxWidth: 180 }}>
                        {s.justification
                          ? <span title={s.justification} style={{ color: '#f59e0b', fontWeight: 600 }}>
                              {s.justification.length > 30 ? s.justification.slice(0, 30) + '…' : s.justification}
                            </span>
                          : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {s.statut !== 'PRÉSENT' && (
                            <button onClick={() => updateStatut(s, 'PRÉSENT')}
                              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, background: 'rgba(16,185,129,.12)', color: 'var(--green)' }}>
                              Présent
                            </button>
                          )}
                          {s.statut !== 'ABSENT' && (
                            <button onClick={() => updateStatut(s, 'ABSENT')}
                              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, background: 'rgba(239,68,68,.1)', color: 'var(--red)' }}>
                              Absent
                            </button>
                          )}
                          {s.statut !== 'RETARD' && (
                            <button onClick={() => updateStatut(s, 'RETARD')}
                              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, background: 'rgba(99,102,241,.1)', color: '#6366f1' }}>
                              Retard
                            </button>
                          )}
                          <button onClick={() => setJustModal(s)}
                            style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, background: 'rgba(245,158,11,.1)', color: '#f59e0b' }}>
                            Justif.
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!sessionLoaded && (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--slate)' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: 6 }}>
            Sélectionnez les paramètres de la session
          </div>
          <div style={{ fontSize: '.85rem' }}>
            Choisissez la filière, l'année académique, la matière (ou l'examen) et la date,
            puis cliquez sur <strong>Charger la liste</strong>.
          </div>
        </div>
      )}
    </DashLayout>
  )
}