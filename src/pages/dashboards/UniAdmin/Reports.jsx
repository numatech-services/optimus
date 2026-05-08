import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' 
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

// ── FONCTIONS UTILITAIRES (PDF & EXCEL) ──
function buildRapportHtml(titre, contenu) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI','Roboto',sans-serif;color:#1a2035;padding:40px;font-size:13px;line-height:1.5}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #1a2035}
  .logo{font-size:20px;font-weight:800}.logo span{color:#E8A020}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  th{background:#1a2035;color:#fff;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase}
  td{padding:10px 14px;border-bottom:1px solid #eee;font-size:12px}
  .footer{margin-top:40px;padding-top:14px;border-top:1px solid #eee;text-align:center;font-size:10px;color:#999}
  h2{font-size:16px;font-weight:800;margin:20px 0 10px}
</style></head><body>
<div class="header">
  <div><div class="logo">OPTIMUS<span>CAMPUS</span></div><div style="font-size:10px;color:#666;margin-top:2px">Administration</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:800">${titre}</div><div style="font-size:11px;color:#666">Généré le ${new Date().toLocaleDateString('fr-FR')}</div></div>
</div>
${contenu}
<div class="footer">Document Officiel - Système de Gestion Optimus Campus</div>
</body></html>`
}

function printDoc(html) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none'
  document.body.appendChild(iframe)
  iframe.contentDocument.open(); iframe.contentDocument.write(html); iframe.contentDocument.close()
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(()=>document.body.removeChild(iframe),3000) }, 600)
}

function exportXLSX(titre, rows) {
  if(!rows.length) return;
  const headers = Object.keys(rows[0])
  const csv = [headers.join(';'), ...rows.map(r => headers.map(h=>r[h]).join(';'))].join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href:url, download: titre.replace(/\s+/g,'_')+'.csv' })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

export default function UniAdminReports() {
  const { user } = useAuth()
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbData, setDbData] = useState({ students: [], paiements: [], examens: [], events: [] })

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── CHARGEMENT DES DONNÉES RÉELLES ──
  useEffect(() => { fetchAnalyticsData() }, [])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      const [resStu, resPay, resExa, resEve] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('paiements').select('*, students(nom, prenom)'),
        supabase.from('examens').select('*'),
        supabase.from('access_events').select('*').order('timestamp', { ascending: false }).limit(100)
      ])
      setDbData({
        students: resStu.data || [],
        paiements: (resPay.data || []).map(p => ({ ...p, studentName: p.students ? `${p.students.prenom} ${p.students.nom}` : 'N/A' })),
        examens: resExa.data || [],
        events: (resEve.data || []).map(e => ({ ...e, time: new Date(e.timestamp).toLocaleTimeString('fr-FR') }))
      })
    } catch (err) { console.error("Erreur sync:", err) } finally { setLoading(false) }
  }

  // ── CALCULS STATISTIQUES ──
  const stats = useMemo(() => {
    const totalP = dbData.paiements.length || 1
    const paye = dbData.paiements.filter(p => p.statut === 'PAYÉ').length
    const enRetard = dbData.paiements.filter(p => p.statut === 'EN RETARD').length
    return {
      totalStu: dbData.students.length,
      tauxPay: Math.round((paye / totalP) * 100),
      alertes: enRetard,
      presenceMoy: 89 // Exemple (à lier à votre table présence si dispo)
    }
  }, [dbData])

  const RAPPORTS_TYPES = [
    {
      icon:'👥', titre:'Effectifs Complets',
      getData: () => dbData.students.map(s => ({ Matricule:s.id, Nom:s.nom, Filiere:s.filiere, Statut:s.status })),
      getHtml: () => buildRapportHtml("Rapport d'Effectifs", `<h2>Total : ${dbData.students.length}</h2><table><thead><tr><th>Matricule</th><th>Nom</th><th>Filière</th></tr></thead><tbody>${dbData.students.map(s=>`<tr><td>${s.id}</td><td>${s.nom}</td><td>${s.filiere}</td></tr>`).join('')}</tbody></table>`)
    },
    {
      icon:'💰', titre:'Bilan des Paiements',
      getData: () => dbData.paiements.map(p => ({ Etudiant:p.studentName, Montant:p.montant, Statut:p.statut })),
      getHtml: () => buildRapportHtml("Bilan Financier", `<table><thead><tr><th>Étudiant</th><th>Montant</th><th>Statut</th></tr></thead><tbody>${dbData.paiements.map(p=>`<tr><td>${p.studentName}</td><td>${p.montant}</td><td>${p.statut}</td></tr>`).join('')}</tbody></table>`)
    }
  ]

  if (loading) return <DashLayout title="Rapports"><div>Chargement des données en temps réel...</div></DashLayout>

  return (
    <DashLayout title="Rapports & Statistiques" requiredRole="admin_universite">
      
      {toast && (
        <div style={{ position:'fixed', top:24, right:24, background:'#10b981', color:'#fff', padding:'12px 24px', borderRadius:8, fontWeight:700, zIndex:9999, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
          ✅ {toast}
        </div>
      )}

      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a2035' }}>📊 Tableau de Bord Intégral</h1>
        <p style={{ color: '#64748b' }}>Données certifiées au {new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      {/* ── SECTION STATS HORIZONTALE (KPIs) ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        {[
          { label: 'Effectifs', val: stats.totalStu, icon: '🎓', color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Recouvrement', val: `${stats.tauxPay}%`, icon: '💵', color: '#10b981', bg: '#ecfdf5' },
          { label: 'Présence', val: `${stats.presenceMoy}%`, icon: '🕒', color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Impayés', val: stats.alertes, icon: '🚨', color: '#ef4444', bg: '#fef2f2' },
        ].map((item, i) => (
          <div key={i} style={{ 
            background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: '16px', transition: 'transform 0.2s'
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a2035' }}>{item.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* GRAPHIQUE BARRES */}
        <div className="card card-p" style={{ borderRadius: 16 }}>
          <h3 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 800 }}>📉 Flux d'Admissions 2025-2026</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{m:'Oct',v:42}, {m:'Nov',v:55}, {m:'Dec',v:30}, {m:'Jan',v:78}, {m:'Fev',v:45}]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="m" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="v" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART */}
        <div className="card card-p" style={{ borderRadius: 16 }}>
          <h3 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 800 }}>📂 État de Trésorerie</h3>
          <div style={{ height: 240, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{n:'P',v:stats.tauxPay}, {n:'R',v:100-stats.tauxPay}]} innerRadius={65} outerRadius={85} dataKey="v" paddingAngle={5}>
                  <Cell fill="#10b981" /><Cell fill="#f1f5f9" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', textAlign:'center' }}>
              <div style={{ fontSize:'1.4rem', fontWeight:900 }}>{stats.tauxPay}%</div>
              <div style={{ fontSize:'0.65rem', color:'#64748b' }}>PAYÉ</div>
            </div>
          </div>
        </div>
      </div>

      {/* GÉNÉRATION DE DOCUMENTS */}
      <div className="card card-p" style={{ borderRadius: 16 }}>
        <h3 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 800 }}>🖨️ Centre d'Édition des Rapports</h3>
        <div style={{ display:'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          {RAPPORTS_TYPES.map((r,i) => (
            <div key={i} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.icon} {r.titre}</span>
              <div style={{ display:'flex', gap: 8 }}>
                <button onClick={() => {printDoc(r.getHtml()); showToast('Génération PDF...')}} className="btn btn-sm" style={{ background:'#f1f5f9', color:'#1a2035', border:'none' }}>Imprimer PDF</button>
                <button onClick={() => {exportXLSX(r.titre, r.getData()); showToast('Export CSV réussi')}} className="btn btn-sm" style={{ background:'#3b82f6', color:'#fff', border:'none' }}>Excel / CSV</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </DashLayout>
  )
}