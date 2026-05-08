import { useState, useEffect, useMemo } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── Build document HTML content (Design & Logique 100% Intacts) ──────
function buildDocHtml(doc, allNotes) {
  // Filtrage des notes par matricule (mat) au lieu du nom pour plus de précision
  const studentNotes = (allNotes || []).filter(n => n.student_id === doc.mat)
  const noteRows = studentNotes.slice(0, 12).map(n => `
    <tr>
      <td style="font-family:monospace;font-size:11px">${n.code || '—'}</td>
      <td>${n.matiere}</td>
      <td style="text-align:center">${n.coef}</td>
      <td style="text-align:center;font-weight:800;color:${n.note_final >= 10 ? '#27ae60' : '#c0392b'}">${n.note_final}</td>
    </tr>`).join('')

  const base = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Marianne','Roboto',sans-serif;color:#1a2035;padding:48px;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:18px;border-bottom:3px solid #1a2035}
  .logo{font-size:22px;font-weight:800}.logo span{color:#E8A020}
  .stamp{display:block;border:3px solid #27ae60;color:#27ae60;padding:10px 24px;border-radius:4px;font-weight:800;font-size:16px;transform:rotate(-5deg);text-align:center;margin:20px auto;width:fit-content}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th{background:#1a2035;color:#fff;padding: 8px 14px;text-align:left;font-size:11px;text-transform:uppercase}
  td{padding: 8px 14px;border-bottom:1px solid var(--border-light)}
  .footer{margin-top:40px;padding-top:14px;border-top:1px solid var(--border);text-align:center;font-size:10px;color:#999}
  .sig{margin-top:48px;text-align:right}
</style></head><body>
<div class="header">
  <div><div class="logo">OPTIMUS<span>CAMPUS</span></div><div style="font-size:10px;color:#666;margin-top:2px">Université Abdou Moumouni · Niamey, Niger</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:800;text-transform:uppercase">${doc.type}</div><div style="font-size:11px;color:#666;margin-top:4px">Réf : DOC-${doc.id}</div></div>
</div>`

  if (doc.type.includes('scolarité')) return base + `
<p style="line-height:1.9;font-size:14px;margin-bottom:24px">
  Le Service de la Scolarité de l'<strong>Université Abdou Moumouni de Niamey</strong> atteste que :<br><br>
  <strong style="font-size:16px">${doc.etudiant}</strong> (Matricule : <strong>${doc.mat}</strong>)<br>
  est régulièrement inscrit(e) au sein de notre établissement pour l'année académique <strong>2025-2026</strong>.<br><br>
  Cette attestation est délivrée à la demande de l'intéressé(e) pour servir et valoir ce que de droit.
</p>
<div class="stamp">✓ CERTIFIÉ CONFORME</div>
<div class="sig"><div style="font-size:11px;color:#666;margin-bottom:40px">Le Chef du Service Scolarité</div><div style="width:180px;border-top:1px solid #1a2035;padding-top:6px;font-size:10px;color:#666;display:inline-block;text-align:center">Signature et cachet</div></div>
<div class="footer">Document officiel · Optimus Campus · ${doc.mat} · ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`

  if (doc.type.includes('notes')) return base + `
<div style="background:#f8f9fd;border-radius:8px;padding:14px;margin-bottom:16px;border-left:4px solid #4361ee">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
    <div><div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:3px">Étudiant</div><div style="font-weight:800">${doc.etudiant}</div></div>
    <div><div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:3px">Matricule</div><div style="font-weight:800">${doc.mat}</div></div>
    <div><div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:3px">Année</div><div style="font-weight:800">2025-2026</div></div>
  </div>
</div>
${noteRows.length > 0 ? `<table role="table"><thead><tr><th>Code</th><th>Matière</th><th>Coef</th><th>Note /20</th></tr></thead><tbody>${noteRows}</tbody></table>` : '<p style="color:#666;font-style:italic">Aucune note enregistrée pour cet étudiant.</p>'}
<div class="sig"><div style="font-size:11px;color:#666;margin-bottom:40px">Le Chef du Département</div><div style="width:180px;border-top:1px solid #1a2035;padding-top:6px;font-size:10px;color:#666;display:inline-block;text-align:center">Signature et cachet</div></div>
<div class="footer">Relevé officiel · Document officiel · ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`

  return base + `
<p style="line-height:1.9;font-size:14px;margin-bottom:24px">
  Document relatif à : <strong>${doc.etudiant}</strong> (${doc.mat})<br>
  Type : <strong>${doc.type}</strong><br>
  Émis le : ${new Date().toLocaleDateString('fr-FR')}
</p>
<div class="footer">Document officiel · Optimus Campus · ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`
}

function printDoc(html) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none'
  document.body.appendChild(iframe)
  iframe.contentDocument.open(); iframe.contentDocument.write(html); iframe.contentDocument.close()
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(()=>document.body.removeChild(iframe),3000) }, 600)
}

function PreviewModal({ doc, notes, onClose }) {
  const html = buildDocHtml(doc, notes)
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div className="fade-in" style={{ background:'#fff',borderRadius:14,maxWidth:720,width:'100%',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 16px 56px rgba(0,0,0,.25)' }}>
        <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--ink)',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'12px 12px 0 0' }}>
          <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'#fff' }}>📄 {doc.type} — {doc.etudiant}</div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'1.5rem',cursor:'pointer',color:'rgba(255,255,255,.7)' }}>×</button>
        </div>
        <div style={{ flex:1,overflow:'auto',padding:20 }}>
          <iframe srcDoc={html} style={{ width:'100%',minHeight:500,border:'1px solid var(--border)',borderRadius:8,background:'#fff' }} title="Preview" />
        </div>
        <div style={{ padding:'12px 20px',borderTop:'1px solid var(--border)',display:'flex',gap:8 }}>
          <button className="btn btn-primary" onClick={() => printDoc(html)}>🖨️ Imprimer / PDF</button>
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

export default function ScolariteDocuments() {
  const { user } = useAuth()
  const [loading,  setLoading]  = useState(true)
  const [demandes, setDemandes] = useState([])
  const [allNotes, setAllNotes] = useState([])
  const [filter,   setFilter]   = useState('ALL')
  const [preview,  setPreview]  = useState(null)
  const [toast,    setToast]    = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resReq, resNotes] = await Promise.all([
        supabase.from('document_requests').select('*, students(nom, prenom)').order('created_at', { ascending: false }),
        supabase.from('notes').select('*').limit(5000)
      ])

      if (resReq.data) {
        const mapped = resReq.data.map(d => ({
          id: d.id,
          type: d.type,
          etudiant: d.students ? `${d.students.prenom} ${d.students.nom}` : 'Inconnu',
          mat: d.student_id,
          date: new Date(d.created_at).toLocaleDateString('fr-FR'),
          statut: d.status === 'TREATED' ? 'TRAITÉ' : 'EN ATTENTE'
        }))
        setDemandes(mapped)
      }
      if (resNotes.data) setAllNotes(resNotes.data)
    } catch (err) {
      console.error("Erreur Supabase:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. ACTIONS CRUD RÉELLES ──
  const treat = async (id) => {
    try {
      const { error } = await supabase.from('document_requests').update({ status: 'TREATED' }).eq('id', id)
    } catch (err) {
      console.error("[Error]", err.message)
    }
    if (!error) {
      const d = demandes.find(x => x.id === id)
      setPreview(d)
      fetchData() // Rafraîchir les compteurs
    }
  }

  const treatAll = async () => {
    const pendingIds = demandes.filter(d => d.statut === 'EN ATTENTE').map(d => d.id)
    if (pendingIds.length === 0) return
    try {
      const { error } = await supabase.from('document_requests').update({ status: 'TREATED' }).in('id', pendingIds)
    } catch (err) {
      console.error("[Error]", err.message)
    }
    if (!error) {
      showToast('Tous les documents ont été générés')
      fetchData()
    }
  }

  // ── 3. LOGIQUE DE FILTRAGE & KPIs (Design Intact) ──
  const docTypes = useMemo(() => ['ALL', ...new Set(demandes.map(d => d.type))], [demandes])
  const pending = demandes.filter(d => d.statut === 'EN ATTENTE')
  const filtered = useMemo(() => filter === 'ALL' ? demandes : demandes.filter(d => d.type === filter), [demandes, filter])

  if (loading) return <DashLayout title="Documents"><SkeletonLoader /><div style={{padding:60, textAlign:'center'}}></div></DashLayout>

  return (
    <DashLayout title="Documents" requiredRole="scolarite">
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position:'fixed',top:24,right:24,zIndex:2000,padding:'12px 20px',borderRadius:10,background:'var(--green)',color:'#fff',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 24px rgba(0,0,0,.2)' }}>
          ✅ {toast}
        </div>
      )}
      {preview && <PreviewModal doc={preview} notes={allNotes} onClose={() => setPreview(null)} />}

      <div className="dash-page-title">📁 Documents officiels</div>
      <div className="dash-page-sub">Traitement des demandes administratives</div>

      {/* KPI Grid (Zéro Omission) */}
      <div className="kpi-grid">
        {[
          { label:'Demandes en attente', value:pending.length,                                   sub:'À traiter',        icon:'📝', color:'var(--amber)' },
          { label:'Traités ce mois',     value:demandes.filter(d=>d.statut==='TRAITÉ').length,   sub:'Documents émis',  icon:'✅', color:'var(--green)' },
          { label:'Attestations',        value:demandes.filter(d=>d.type.toLowerCase().includes('attestation')).length, sub:'Plus demandé', icon:'📄', color:'var(--blue)'  },
          { label:'Relevés de notes',    value:demandes.filter(d=>d.type.toLowerCase().includes('relevé')).length,      sub:'En cours',    icon:'🏆', color:'var(--teal)'  },
        ].map((k,i) => (
          <div className="kpi-card" key={i}>
            <div style={{ display:'flex',justifyContent:'space-between' }}><div className="kpi-label">{k.label}</div><span style={{ fontSize:'1.3rem' }}>{k.icon}</span></div>
            <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Filtres & Header (Design Intact) */}
        <div style={{ padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center' }}>
          <div className="section-title">Demandes ({filtered.length})</div>
          <select className="form-input form-select" value={filter} onChange={e => setFilter(e.target.value)}
            style={{ width:230,padding:'7px 10px',fontSize:'.82rem',marginLeft:'auto' }}>
            {docTypes.map(t => <option key={t} value={t}>{t === 'ALL' ? 'Tous les types' : t}</option>)}
          </select>
          {pending.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={treatAll}>⚡ Traiter tout en attente</button>
          )}
        </div>

        {/* Tableau (Zéro Omission) */}
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Type de document</th><th>Étudiant</th><th>Matricule</th><th>Date demande</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((d,i) => (
                <tr key={i} style={{ opacity:d.statut==='TRAITÉ'?.75:1 }}>
                  <td style={{ fontWeight:600,color:'var(--ink)',fontSize:'.88rem' }}>{d.type}</td>
                  <td>{d.etudiant}</td>
                  <td style={{ fontFamily:'monospace',fontSize:'.75rem',color:'var(--gold)',fontWeight:700 }}>{d.mat}</td>
                  <td style={{ fontSize:'.8rem',color:'var(--slate)' }}>{d.date}</td>
                  <td><span className={`badge ${d.statut==='TRAITÉ'?'badge-green':'badge-gold'}`}>{d.statut}</span></td>
                  <td>
                    <div style={{ display:'flex',gap: 4 }}>
                      {d.statut === 'EN ATTENTE' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => treat(d.id)}>📄 Générer</button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => setPreview(d)}>👁 Visualiser</button>
                      )}
                      {d.statut === 'TRAITÉ' && (
                        <button className="btn btn-sm" style={{ background:'var(--blue-light)',color:'var(--blue)',border:'none',borderRadius:6,padding:'5px 10px',fontWeight:700,cursor:'pointer',fontSize:'.73rem' }}
                          onClick={() => { printDoc(buildDocHtml(d, allNotes)); showToast(`Impression lancée : ${d.type}`) }}>
                          🖨️ Imprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--slate)' }}>Aucune demande trouvée.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}