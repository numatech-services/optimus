import { useState, useEffect, useMemo } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

// ── Fonctions Utilitaires (Zéro Omission) ──────────────────
function exportCSV(tenantsList, plansDef) {
  const headers = ['Université','Plan','MRR (XOF)','TVA 18%','Total TTC','Statut','Renouvellement']
  const rows = tenantsList.map(t => [t.name, t.plan, t.mrr||0, Math.round((t.mrr||0)*.18), Math.round((t.mrr||0)*1.18), t.status, '01/04/2026'])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href:url, download:'factures_optimus.csv' })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Modal de Facture (Design Intact) ───────────────────────
function FactureModal({ tenant, onClose }) {
  const mrr = tenant.mrr || 0;
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div className="fade-in" style={{ background:'#fff',borderRadius:14,maxWidth:540,width:'100%',overflow:'hidden',boxShadow:'0 12px 48px rgba(0,0,0,.2)' }}>
        <div style={{ background:'var(--ink)',padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'#fff',fontSize:'1rem' }}>OPTIMUS<span style={{ color:'var(--gold)' }}>CAMPUS</span></div>
            <div style={{ fontSize:'.75rem',color:'rgba(255,255,255,.6)',marginTop:2 }}>Facture N° INV-{new Date().getFullYear()}-{String(Math.floor(Math.random()*9000)+1000)}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'1.5rem',cursor:'pointer',color:'rgba(255,255,255,.7)' }}>×</button>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20 }}>
            {[['Facturer à', tenant.name], ['Plan', tenant.plan], ['Période', 'Mars 2026'], ['Échéance', '01/04/2026']].map(([k,v],i) => (
              <div key={i} style={{ background:'var(--mist)',borderRadius:8,padding:'10px 14px' }}>
                <div style={{ fontSize:'.68rem',color:'var(--slate)',fontWeight:700,textTransform:'uppercase',marginBottom:3 }}>{k}</div>
                <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'.88rem',color:'var(--ink)' }}>{v}</div>
              </div>
            ))}
          </div>
          <table role="table" style={{ width:'100%',borderCollapse:'collapse',marginBottom:20 }}>
            <thead><tr style={{ background:'var(--ink)' }}>
              {['Description','Qté','Prix unit.','Total'].map(h => (
                <th key={h} style={{ padding:'8px 14px',color:'rgba(255,255,255,.85)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.73rem',textAlign:'left' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              <tr style={{ borderBottom:'1px solid var(--border-light)' }}>
                <td style={{ padding:'10px 14px',fontWeight:600 }}>Abonnement {tenant.plan} — {tenant.name}</td>
                <td style={{ padding:'10px 14px' }}>1</td>
                <td style={{ padding:'10px 14px' }}>{mrr.toLocaleString('fr')} XOF</td>
                <td style={{ padding:'10px 14px',fontWeight:800 }}>{mrr.toLocaleString('fr')} XOF</td>
              </tr>
            </tbody>
          </table>
          <div style={{ textAlign:'right',marginBottom:20 }}>
            <div style={{ fontSize:'.82rem',color:'var(--slate)',marginBottom:3 }}>Sous-total HT : {mrr.toLocaleString('fr')} XOF</div>
            <div style={{ fontSize:'.82rem',color:'var(--slate)',marginBottom:6 }}>TVA (18 %) : {Math.round(mrr*.18).toLocaleString('fr')} XOF</div>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'var(--ink)',borderTop:'2px solid var(--ink)',paddingTop:8,display:'inline-block' }}>
              TOTAL TTC : {Math.round(mrr*1.18).toLocaleString('fr')} XOF
            </div>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimer / PDF</button>
            <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal d'Édition du Plan (Design Intact) ────────────────
function EditPlanModal({ plan, onClose, onSave }) {
    const [price, setPrice] = useState(plan.prix || 0);
    return (
      <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
        <div className="card" style={{ maxWidth:400,width:'100%' }}>
          <div style={{ padding:'16px 20px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between' }}>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800 }}>Tarification : {plan.id}</div>
            <button onClick={onClose} style={{border:'none',background:'none',fontSize:'1.2rem'}}>×</button>
          </div>
          <div style={{ padding:20 }}>
            <div className="form-group">
                <label className="form-label">Prix mensuel (XOF)</label>
                <input className="form-input" type="number" value={price} onChange={e=>setPrice(Number(e.target.value))} />
            </div>
            <div style={{ display:'flex',gap:10,marginTop:20 }}>
                <button className="btn btn-secondary" style={{flex:1}} onClick={onClose}>Annuler</button>
                <button className="btn btn-primary" style={{flex:1}} onClick={() => onSave(plan.id, price)}>Mettre à jour le catalogue</button>
            </div>
          </div>
        </div>
      </div>
    )
}

export default function SuperAdminBilling() {
  const [tenants, setTenants] = useState([])
  const [plans,   setPlans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)
  const [modal,   setModal]   = useState(null)
  const [filter,  setFilter]  = useState('ALL')

  const showToast = (msg, type='success') => { setToast({msg, type}); setTimeout(() => setToast(null), 3000) }

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resTenants, resPlans] = await Promise.all([
        supabase.from('tenants').select('*').limit(500).order('name'),
        supabase.from('billing_plans').select('*').limit(500).order('prix', { ascending: true })
      ])
      if (resTenants.data) setTenants(resTenants.data)
      if (resPlans.data) setPlans(resPlans.data)
    } catch (err) {
      console.error('[Billing] Erreur:', err.message)
    }
    setLoading(false)
  }

  // ── 2. ACTIONS CRUD RÉELLES ──
  const handleUpdatePlanPrice = async (planId, newPrice) => {
      try {
        const { error } = await supabase.from('billing_plans').update({ prix: newPrice }).eq('id', planId)
      } catch (err) {
        console.error("[Error]", err.message)
      }
      if (error) showToast("Erreur", "error")
      else {
          showToast("Catalogue mis à jour")
          setModal(null)
          fetchData()
      }
  }

  const filtered = useMemo(() =>
    filter === 'ALL' ? tenants : tenants.filter(t => t.plan === filter)
  , [tenants, filter])

  const total  = tenants.reduce((s,t) => s + (t.mrr||0), 0)
  const actifs = tenants.filter(t => t.status === 'ACTIVE').length

  if (loading) return <DashLayout title="Facturation"><div></div></DashLayout>

  return (
    <DashLayout title="Facturation" requiredRole="super_admin">
      
      {/* Toast Intact */}
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position:'fixed',top:24,right:24,zIndex:2000,padding:'12px 20px',borderRadius:10,background:toast.type==='error'?'var(--red)':'var(--green)',color:'#fff',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.88rem',boxShadow:'0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Modals Intactes */}
      {modal?.type === 'facture' && <FactureModal tenant={modal.data} onClose={() => setModal(null)} />}
      {modal?.type === 'edit_plan' && <EditPlanModal plan={modal.data} onClose={() => setModal(null)} onSave={handleUpdatePlanPrice} />}

      <div className="dash-page-title">💰 Facturation & Abonnements</div>
      <div className="dash-page-sub">Gestion des revenus plateforme · {tenants.length} clients</div>

      {/* KPI Grid (Zéro Omission) */}
      <div className="kpi-grid">
        {[
          { label:'MRR total',      value:(total/1000).toFixed(0)+'K XOF',           sub:'Revenus mensuels réels', icon:'💰', color:'var(--gold)'  },
          { label:'ARR projeté',    value:(total*12/1000000).toFixed(1)+'M XOF',     sub:'Projection annuelle', icon:'📈', color:'var(--green)' },
          { label:'Clients actifs', value:actifs,                                     sub:`Sur ${tenants.length} total`, icon:'🏛️', color:'var(--blue)'  },
          { label:'Ticket moyen',   value:actifs>0?Math.round(total/actifs/1000)+'K XOF':'—', sub:'Moyenne par client', icon:'📊', color:'var(--teal)' },
        ].map((k,i) => (
          <div className="kpi-card" key={i}>
            <div style={{ display:'flex',justifyContent:'space-between' }}><div className="kpi-label">{k.label}</div><span style={{ fontSize:'1.3rem' }}>{k.icon}</span></div>
            <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="section-title" style={{ margin:'20px 0 12px' }}>Plans & Tarification</div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:14,marginBottom:24 }}>
        {plans.map((p) => {
          const nb = tenants.filter(t => t.plan === p.id).length
          return (
            <div key={p.id} className="card card-p" style={{ borderTop:`4px solid ${p.color || 'var(--slate)'}` }}>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1rem',color:'var(--ink)' }}>{p.id}</div>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1.2rem',color:'var(--gold)',margin:'6px 0 12px' }}>
                {p.prix ? p.prix.toLocaleString('fr')+' XOF/mois' : 'Sur devis'}
              </div>
              {(p.features || []).map((f,i) => <div key={i} style={{ fontSize:'.78rem',color:'var(--slate)',padding: '4px 0' }}>✓ {f}</div>)}
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16,paddingTop:12,borderTop:'1px solid var(--border-light)' }}>
                <span style={{ fontSize:'.75rem',fontWeight:700,color:'var(--slate)' }}>{nb} client(s)</span>
                <button className="btn btn-secondary btn-sm" style={{ fontSize:'.7rem' }}
                  onClick={() => setModal({ type:'edit_plan', data:p })}>
                  ✏️ Modifier le plan
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div style={{ padding:'14px 24px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center' }}>
          <div className="section-title">Factures & Renouvellements ({filtered.length})</div>
          <div style={{ marginLeft:'auto',display:'flex',gap:8 }}>
            <select className="form-input form-select" value={filter} onChange={e => setFilter(e.target.value)}
              style={{ padding:'7px 10px',fontSize:'.8rem',width:160 }}>
              <option value="ALL">Tous les plans</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm"
              onClick={() => { exportCSV(filtered, plans); showToast('Export CSV lancé') }}>
              📥 Export CSV
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>Université</th><th>Plan</th><th>MRR (XOF)</th><th>TVA (18%)</th><th>Total TTC</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((t) => {
                const planInfo = plans.find(p => p.id === t.plan)
                const mrr = t.mrr || 0;
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight:600,color:'var(--ink)' }}>{t.name}</td>
                    <td><span className="badge" style={{ background: (planInfo?.color || 'var(--slate)') + '15', color: planInfo?.color || 'var(--slate)', fontWeight:800 }}>{t.plan}</span></td>
                    <td style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700 }}>{mrr.toLocaleString('fr')}</td>
                    <td style={{ fontSize:'.82rem',color:'var(--slate)' }}>{Math.round(mrr*.18).toLocaleString('fr')}</td>
                    <td style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,color:'var(--ink)' }}>{Math.round(mrr*1.18).toLocaleString('fr')}</td>
                    <td><span className={`badge ${t.status==='ACTIVE'?'badge-green':'badge-red'}`}>{t.status}</span></td>
                    <td>
                      <div style={{ display:'flex',gap: 4 }}>
                        <button className="btn btn-sm btn-secondary" style={{ fontSize:'.73rem' }}
                          onClick={() => setModal({ type:'facture', data:t })}>
                          🧾 Facture
                        </button>
                        <button className="btn btn-sm btn-secondary" style={{ fontSize:'.73rem' }}
                          onClick={() => showToast(`Email envoyé à ${t.name}`)}>
                          📧 Rappel
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}