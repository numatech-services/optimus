import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { generateRecu, printDocument } from '../../../utils/pdfService'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Client Supabase réel
import { resolveStudentContext } from '../../../utils/identityResolver'

const METHODES = ['Orange Money','Wave','Mobile Money','Caisse','Virement bancaire']
const STATUS_B = { 'PAYÉ':'badge-green','À PAYER':'badge-red','EN ATTENTE':'badge-gold','EN RETARD':'badge-red' }

export default function StudentPaiements() {
  const { user } = useAuth()
  const matricule = user?.matricule || 'ETU-2024-0847'

  // ── États des données Supabase ──
  const [loading, setLoading] = useState(true)
  const [paiements, setPaiements] = useState([])
  const [myBadge, setMyBadge] = useState(null)
  const [studentProfile, setStudentProfile] = useState(null)
  
  // ── États UI (Design d'origine) ──
  const [modal,     setModal]     = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [methode,   setMethode]   = useState('Orange Money')
  const [toast,     setToast]     = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchFinancialData()
  }, [user, matricule])

  const fetchFinancialData = async () => {
    setLoading(true)
    try {
      const { student, studentId } = await resolveStudentContext(user)

      if (!studentId) {
        setPaiements([])
        setMyBadge(null)
        setStudentProfile(null)
        return
      }

      const [resPay, resBadge, resStudent] = await Promise.all([
        supabase.from('paiements').select('*').limit(500).eq('student_id', studentId).order('id', { ascending: false }),
        supabase.from('badges').select('*').limit(500).eq('student_id', studentId).maybeSingle(),
        Promise.resolve({ data: student || null })
      ])

      if (resPay.data) {
        // Mappage -> JS Variables UI (desc, date, statut 'À PAYER')
        const mapped = resPay.data.map(p => ({
          id: p.id,
          desc: p.description,
          montant: p.montant,
          date: p.date_paiement,
          methode: p.methode,
          // On garde la logique UI : RETARD/ATTENTE s'affichent comme 'À PAYER' pour l'action
          statut: (p.statut === 'EN RETARD' || p.statut === 'EN ATTENTE') ? 'À PAYER' : p.statut,
          statutBrut: p.statut // Pour les badges de couleur précis
        }))
        setPaiements(mapped)
      }

      if (resBadge.data) setMyBadge(resBadge.data)
      if (resStudent.data) setStudentProfile(resStudent.data)

    } catch (err) {
      console.error("Erreur Sync Finances Supabase:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE DE PAIEMENT RÉELLE (Update) ──
  const handlePay = async (id) => {
    const dateStr = new Date().toLocaleDateString('fr-FR')
    
    try {
      const { error } = await supabase
        .from('paiements')
        .update({
          statut: 'PAYÉ',
          methode: methode,
          date_paiement: dateStr,
          date: new Date().toISOString().slice(0, 10),
        })
        .eq('id', id)
      if (!error) {
        showToast('Paiement effectué ! Reçu disponible ✓')
        setModal(null)
        fetchFinancialData()
      } else {
        showToast('Erreur lors du traitement du paiement', 'error')
      }
    } catch (err) {
      console.error("[Error]", err.message)
    }
  }

  // ── 3. CALCULS KPIs (Design Intact) ──
  const total = useMemo(() => paiements.reduce((s,p) => s + (p.montant || 0), 0), [paiements])
  const payé = useMemo(() => paiements.filter(p => p.statut === 'PAYÉ').reduce((s,p) => s + (p.montant || 0), 0), [paiements])
  const aPayer = useMemo(() => paiements.filter(p => p.statut === 'À PAYER').reduce((s,p) => s + (p.montant || 0), 0), [paiements])
  
  const badgeBloqué = ['BLOCKED', 'SUSPENDU'].includes(myBadge?.status)

  if (loading) return <DashLayout title="Paiements"><div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700}}>Sécurisation de la connexion bancaire...</div></DashLayout>

  return (
    <DashLayout title="Mes Paiements" requiredRole="etudiant">
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{position:'fixed',top:24,right:24,zIndex:2000,padding:'12px 20px',borderRadius:10,background:'var(--green)',color:'#fff',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 24px rgba(0,0,0,.2)'}}>
          ✅ {toast}
        </div>
      )}

      {/* Modal paiement - Design Intact */}
      {modal === 'pay' && selected && (
        <div role="dialog" aria-modal={true} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:400,borderRadius:14,padding:0}}>
            <div style={{padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'var(--ink)'}}>💳 Effectuer un paiement</div>
              <button onClick={() => setModal(null)} style={{ background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',color:'var(--slate)' }}>×</button>
            </div>
            <div style={{padding:24}}>
              <div style={{background:'var(--gold-light)',borderRadius:10,padding:16,marginBottom:20,border:'1px solid rgba(99,102,241,.15)'}}>
                <div style={{fontSize:'.78rem',color:'var(--amber)',marginBottom:4}}>{selected.desc}</div>
                <div style={{fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1.4rem',color:'var(--ink)'}}>{selected.montant.toLocaleString('fr')} XOF</div>
              </div>
              <div className="form-group">
                <label className="form-label">Méthode de paiement</label>
                <select className="form-input form-select" value={methode} onChange={e => setMethode(e.target.value)}>
                  {METHODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{background:'var(--mist)',borderRadius:8,padding:12,fontSize:'.8rem',color:'var(--slate)',marginBottom:16}}>
                {methode.includes('Money') || methode === 'Wave'
                  ? `📱 Composez le code USSD sur votre téléphone et suivez les instructions pour un paiement de ${selected.montant.toLocaleString('fr')} XOF`
                  : '🏦 Effectuez un virement bancaire vers le RIB de l\'université'
                }
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={() => handlePay(selected.id)}>Confirmer le paiement</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dash-page-title">Mes Paiements</div>
      <div className="dash-page-sub">{user?.name} · {matricule} · Suivi financier réel</div>

      {/* Alertes dynamiques - Design Intact */}
      {badgeBloqué ? (
        <div style={{display:'flex',alignItems:'center',gap:14,background:'linear-gradient(135deg,#c0392b,#e74c3c)',borderRadius:12,padding:'14px 20px',marginBottom:16}}>
          <span style={{fontSize:'1.8rem'}}>🚫</span>
          <div>
            <div style={{fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'#fff',fontSize:'.95rem'}}>Accès portique suspendu</div>
            <div style={{fontSize:'.82rem',color:'rgba(255,255,255,.8)',marginTop:3}}>
              Votre badge RFID est bloqué suite à un impayé. 
              {myBadge?.blocked_reason && <span> Motif : {myBadge.blocked_reason}.</span>}
              Régularisez votre situation pour réactiver l'accès.
            </div>
          </div>
        </div>
      ) : aPayer > 0 ? (
        <div style={{display:'flex',alignItems:'center',gap:14,background:'var(--red-light)',border:'1px solid rgba(192,57,43,.2)',borderLeft:'5px solid var(--red)',borderRadius:10,padding:'14px 18px',marginBottom:16}}>
          <span style={{fontSize:'1.6rem'}}>⚠️</span>
          <div>
            <div style={{fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'var(--red)',fontSize:'.92rem'}}>
              Règlement requis — {(aPayer/1000).toFixed(0)}K XOF en attente
            </div>
            <div style={{fontSize:'.81rem',color:'var(--ink-60)',marginTop:3,lineHeight:1.5}}>
              Passé <strong>60 jours</strong> de retard, votre badge RFID sera automatiquement bloqué sur le portique.
            </div>
          </div>
        </div>
      ) : (
        <div style={{display:'flex',alignItems:'center',gap:12,background:'var(--green-light)',border:'1px solid rgba(30,132,73,.2)',borderLeft:'5px solid var(--green)',borderRadius:10,padding:'12px 18px',marginBottom:16}}>
          <span style={{fontSize:'1.4rem'}}>✅</span>
          <div style={{fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,color:'var(--green)',fontSize:'.88rem'}}>
            Situation financière à jour — Accès portique actif
          </div>
        </div>
      )}

      {/* KPIs - Design Intact */}
      <div className="kpi-grid">
        {[
          { label:'Payé', value:`${(payé/1000).toFixed(0)}K XOF`,  sub:'Recettes enregistrées', icon:'✅', color:'var(--green)' },
          { label:'Reste à payer', value:`${(aPayer/1000).toFixed(0)}K XOF`, sub:`${paiements.filter(p=>p.statut==='À PAYER').length} échéance(s)`, icon:'⚠️', color:'var(--red)'   },
          { label:'Total annuel',  value:`${(total/1000).toFixed(0)}K XOF`,  sub:'Année 2025-2026', icon:'💰', color:'var(--blue)'  },
          { label:'Taux de règlement', value:`${total > 0 ? Math.round(payé/total*100) : 100}%`, sub:'Progression', icon:'📊', color:'var(--teal)'  },
        ].map((k,i) => (
          <div className="kpi-card" key={i}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <div className="kpi-label">{k.label}</div>
              <span style={{fontSize:'1.3rem'}}>{k.icon}</span>
            </div>
            <div className="kpi-value" style={{color:k.color}}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tableau - Design Intact */}
      <div className="card" style={{marginTop:20}}>
        <div style={{padding:'14px 24px',borderBottom:'1px solid var(--border)'}}>
          <div className="section-title">Historique des transactions</div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr><th>Référence</th><th>Description</th><th>Montant (XOF)</th><th>Date</th><th>Méthode</th><th>Statut</th><th>Action</th></tr>
            </thead>
            <tbody>
              {paiements.map((p,i) => (
                <tr key={i}>
                  <td style={{ fontFamily:'monospace',fontSize:'.75rem',color:'var(--slate)' }}>{p.id}</td>
                  <td style={{ fontWeight:500,color:'var(--ink)' }}>{p.desc}</td>
                  <td style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800 }}>{(p.montant||0).toLocaleString('fr')}</td>
                  <td style={{ fontSize:'.82rem',color:'var(--slate)' }}>{p.date || '—'}</td>
                  <td style={{ fontSize:'.82rem' }}>{p.methode || '—'}</td>
                  <td><span className={`badge ${STATUS_B[p.statut] || 'badge-slate'}`}>{p.statut}</span></td>
                  <td>
                    {p.statut === 'À PAYER'
                      ? <button className="btn btn-primary btn-sm" onClick={() => { setSelected(p); setModal('pay') }}>💳 Payer</button>
                      : <button className="btn btn-secondary btn-sm" onClick={() => printDocument(generateRecu(p, studentProfile))}>🖨️ Reçu PDF</button>
                    }
                  </td>
                </tr>
              ))}
              {paiements.length === 0 && (
                <tr><td colSpan={7} style={{textAlign:'center', padding:30, color:'var(--slate)'}}>Aucun historique de paiement en base de données.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}
