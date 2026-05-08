import { useState, useEffect, useMemo } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { supabase } from '../../../lib/supabase'
import { exportCSV } from '../../../hooks/useExportData'

export default function SuperAdminAnalytics() {
  const [tenants, setTenants] = useState([])
  const [students, setStudents] = useState([])
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [rT, rS, rP] = await Promise.all([
          supabase.from('tenants').select('id, name, status').order('name').limit(500),
          supabase.from('students').select('id, nom, prenom, genre, niveau, filiere, tenant_id, est_boursier').limit(500),
          supabase.from('paiements').select('id, montant, statut, tenant_id').limit(500),
        ])
        if (rT.data) setTenants(rT.data)
        if (rS.data) setStudents(rS.data)
        if (rP.data) setPaiements(rP.data)
      } catch (err) {
        console.error('[Analytics]', err.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const stu = selectedTenant === 'all' ? students : students.filter(s => s.tenant_id === selectedTenant)
    const pay = selectedTenant === 'all' ? paiements : paiements.filter(p => p.tenant_id === selectedTenant)

    const total = stu.length
    const hommes = stu.filter(s => (s.genre || '').toUpperCase() === 'M').length
    const femmes = stu.filter(s => (s.genre || '').toUpperCase() === 'F').length
    const nonDef = total - hommes - femmes
    const boursiers = stu.filter(s => s.est_boursier).length

    const niveaux = {}
    stu.forEach(s => {
      const n = s.niveau || 'Inconnu'
      niveaux[n] = (niveaux[n] || 0) + 1
    })

    const filieres = {}
    stu.forEach(s => {
      const f = s.filiere || 'Non définie'
      filieres[f] = (filieres[f] || 0) + 1
    })

    const payeTotal = pay.filter(p => p.statut === 'PAYÉ').reduce((s, p) => s + (p.montant || 0), 0)
    const impayeTotal = pay.filter(p => p.statut !== 'PAYÉ').reduce((s, p) => s + (p.montant || 0), 0)
    const nbPaiements = pay.length
    const tauxRecouvrement = nbPaiements > 0 ? Math.round(pay.filter(p => p.statut === 'PAYÉ').length / nbPaiements * 100) : 0

    return { total, hommes, femmes, nonDef, boursiers, niveaux, filieres, payeTotal, impayeTotal, nbPaiements, tauxRecouvrement }
  }, [students, paiements, selectedTenant])

  // Per-university breakdown
  const perUni = useMemo(() => {
    return tenants.map(t => {
      const stu = students.filter(s => s.tenant_id === t.id)
      const pay = paiements.filter(p => p.tenant_id === t.id)
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        students: stu.length,
        hommes: stu.filter(s => (s.genre || '').toUpperCase() === 'M').length,
        femmes: stu.filter(s => (s.genre || '').toUpperCase() === 'F').length,
        boursiers: stu.filter(s => s.est_boursier).length,
        collecte: pay.filter(p => p.statut === 'PAYÉ').reduce((s, p) => s + (p.montant || 0), 0),
        impayes: pay.filter(p => p.statut !== 'PAYÉ').reduce((s, p) => s + (p.montant || 0), 0),
      }
    })
  }, [tenants, students, paiements])

  const niveauxOrder = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3']

  if (loading) return <DashLayout title="Analytics"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Analytics" requiredRole="super_admin">
      <div className="dash-page-title">Analytics — Statistiques détaillées</div>
      <div className="dash-page-sub">Vue globale et par université · Temps réel</div>

      {/* University selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setSelectedTenant('all')} className={`btn btn-sm ${selectedTenant === 'all' ? 'btn-primary' : 'btn-secondary'}`}>Toutes ({students.length})</button>
        {tenants.map(t => {
          const count = students.filter(s => s.tenant_id === t.id).length
          return <button key={t.id} onClick={() => setSelectedTenant(t.id)} className={`btn btn-sm ${selectedTenant === t.id ? 'btn-primary' : 'btn-secondary'}`}>{t.name.replace('Université de ', '')} ({count})</button>
        })}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => exportCSV(perUni, [
          { key: 'name', label: 'Université' }, { key: 'students', label: 'Étudiants' },
          { key: 'hommes', label: 'Hommes' }, { key: 'femmes', label: 'Femmes' },
          { key: 'boursiers', label: 'Boursiers' },
          { key: 'collecte', label: 'Collecté (FCFA)' }, { key: 'impayes', label: 'Impayés (FCFA)' },
        ], 'analytics_universites')}>📥 Exporter</button>
      </div>

      {/* Global KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="kpi-card"><div className="kpi-label">Total étudiants</div><div className="kpi-value">{filtered.total.toLocaleString('fr')}</div></div>
        <div className="kpi-card"><div className="kpi-label">Collecté</div><div className="kpi-value" style={{ fontSize: 24 }}>{filtered.payeTotal.toLocaleString('fr')} F</div></div>
        <div className="kpi-card"><div className="kpi-label">Impayés</div><div className="kpi-value" style={{ color: '#E10600', fontSize: 24 }}>{filtered.impayeTotal.toLocaleString('fr')} F</div></div>
        <div className="kpi-card"><div className="kpi-label">Taux recouvrement</div><div className="kpi-value">{filtered.tauxRecouvrement}%</div></div>
        <div className="kpi-card"><div className="kpi-label">Boursiers</div><div className="kpi-value">{filtered.boursiers}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Sexe */}
        <div className="card card-p">
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 16 }}>Répartition par sexe</div>
          {[
            { l: 'Hommes', v: filtered.hommes, p: filtered.total ? Math.round(filtered.hommes / filtered.total * 100) : 0, c: 'var(--primary)' },
            { l: 'Femmes', v: filtered.femmes, p: filtered.total ? Math.round(filtered.femmes / filtered.total * 100) : 0, c: '#B60066' },
            ...(filtered.nonDef > 0 ? [{ l: 'Non défini', v: filtered.nonDef, p: filtered.total ? Math.round(filtered.nonDef / filtered.total * 100) : 0, c: 'var(--slate)' }] : []),
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span>{s.l}</span><span style={{ fontWeight: 700 }}>{s.v} ({s.p}%)</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg)', borderRadius: 6 }}>
                <div style={{ height: '100%', width: `${s.p}%`, background: s.c, borderRadius: 6, transition: 'width .5s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Niveau */}
        <div className="card card-p">
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 16 }}>Répartition par niveau</div>
          {niveauxOrder.filter(n => filtered.niveaux[n]).map((n, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-blue">{n}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{filtered.niveaux[n]}</span>
                <div style={{ width: 60, height: 6, background: 'var(--bg)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${(filtered.niveaux[n] / filtered.total) * 100}%`, background: 'var(--primary)', borderRadius: 4 }} />
                </div>
              </div>
            </div>
          ))}
          {Object.keys(filtered.niveaux).filter(n => !niveauxOrder.includes(n)).map((n, i) => (
            <div key={`o-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14 }}>
              <span className="badge badge-slate">{n}</span>
              <span style={{ fontWeight: 700 }}>{filtered.niveaux[n]}</span>
            </div>
          ))}
        </div>

        {/* Top filières */}
        <div className="card card-p">
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 16 }}>Top filières</div>
          {Object.entries(filtered.filieres).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, c], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14, borderBottom: i < 7 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{f}</span>
              <span style={{ fontWeight: 700 }}>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-university table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-title">Détail par université</div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Université</th><th>Étudiants</th><th>Hommes</th><th>Femmes</th><th>Boursiers</th><th>Collecté (FCFA)</th><th>Impayés (FCFA)</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {perUni.map((u, i) => (
                <tr key={i} onClick={() => setSelectedTenant(u.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{u.students.toLocaleString('fr')}</td>
                  <td>{u.hommes}</td>
                  <td>{u.femmes}</td>
                  <td><span className="badge badge-green">{u.boursiers}</span></td>
                  <td style={{ fontWeight: 600, color: '#18753C' }}>{u.collecte.toLocaleString('fr')}</td>
                  <td style={{ fontWeight: 600, color: u.impayes > 0 ? '#E10600' : '#18753C' }}>{u.impayes.toLocaleString('fr')}</td>
                  <td><span className={`badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>{u.status}</span></td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
                <td>TOTAL</td>
                <td style={{ color: 'var(--primary)' }}>{perUni.reduce((s, u) => s + u.students, 0).toLocaleString('fr')}</td>
                <td>{perUni.reduce((s, u) => s + u.hommes, 0)}</td>
                <td>{perUni.reduce((s, u) => s + u.femmes, 0)}</td>
                <td>{perUni.reduce((s, u) => s + u.boursiers, 0)}</td>
                <td style={{ color: '#18753C' }}>{perUni.reduce((s, u) => s + u.collecte, 0).toLocaleString('fr')}</td>
                <td style={{ color: '#E10600' }}>{perUni.reduce((s, u) => s + u.impayes, 0).toLocaleString('fr')}</td>
                <td>{tenants.length} univ.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}
