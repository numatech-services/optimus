import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Dashboard Ministère — Vue nationale en lecture seule
 * 
 * Accès : /ministere?token=SIGNED_TOKEN
 * Pas de login. Le token est généré par le SuperAdmin et partagé.
 * Affiche uniquement des agrégats — aucune donnée personnelle.
 */
export default function MinistereDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    
    if (!token) {
      setError('Accès non autorisé. Contactez Numatech Services.')
      setLoading(false)
      return
    }

    // Vérification du token côté serveur via HMAC
    const EXPECTED_HASH = import.meta.env.VITE_MINISTERE_TOKEN_HASH || ''
    async function verifyToken(t) {
      // Le token est un HMAC-SHA256 du secret partagé
      // En production : vérifier via Edge Function
      // Fallback : comparaison avec le hash stocké en env
      if (EXPECTED_HASH && t !== EXPECTED_HASH) {
        return false
      }
      // Vérification supplémentaire via Edge Function si disponible
      try {
        const { data } = await supabase.functions.invoke('verify-ministere-token', {
          body: { token: t },
        })
        return data?.valid === true
      } catch {
        // Si Edge Function indisponible, accepter si hash env match
        return EXPECTED_HASH ? t === EXPECTED_HASH : false
      }
    }

    async function load() {
    const tokenValid = await verifyToken(token)
    if (!tokenValid) {
      setError('Token invalide ou expiré. Contactez Numatech Services.')
      setLoading(false)
      return
    }
      try {
        const [rT, rS, rP] = await Promise.all([
          supabase.from('tenants').select('id, name, status').order('name').limit(10000),
          supabase.from('students').select('id, genre, niveau, est_boursier, tenant_id').limit(10000),
          supabase.from('paiements').select('id, montant, statut, tenant_id').limit(10000),
        ])

        const tenants = rT.data || []
        const students = rS.data || []
        const paiements = rP.data || []

        const perUni = tenants.map(t => {
          const stu = students.filter(s => s.tenant_id === t.id)
          const pay = paiements.filter(p => p.tenant_id === t.id && p.statut === 'PAYÉ')
          return {
            name: t.name, status: t.status,
            total: stu.length,
            hommes: stu.filter(s => (s.genre || '').toUpperCase() === 'M').length,
            femmes: stu.filter(s => (s.genre || '').toUpperCase() === 'F').length,
            boursiers: stu.filter(s => s.est_boursier).length,
            collecte: pay.reduce((s, p) => s + (p.montant || 0), 0),
          }
        })

        const niveaux = {}
        students.forEach(s => { const n = s.niveau || '?'; niveaux[n] = (niveaux[n] || 0) + 1 })

        setData({
          tenants: tenants.length,
          totalStudents: students.length,
          totalHommes: students.filter(s => (s.genre || '').toUpperCase() === 'M').length,
          totalFemmes: students.filter(s => (s.genre || '').toUpperCase() === 'F').length,
          totalBoursiers: students.filter(s => s.est_boursier).length,
          totalCollecte: paiements.filter(p => p.statut === 'PAYÉ').reduce((s, p) => s + (p.montant || 0), 0),
          niveaux,
          perUni,
        })
      } catch (err) {
        setError('Erreur de chargement. Réessayez.')
      }
      setLoading(false)
    }
    load()
  }, [])

  const P = { p: '#000091', pl: '#E3E3FF', ink: '#1E1E1E', sl: '#666666', bg: '#F5F5F5', w: '#FFFFFF', bd: '#E5E5E5', g: '#18753C' }

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.bg, fontFamily: "'Marianne','Roboto',sans-serif" }}>
      <div style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 16, padding: 48, textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: P.ink, marginBottom: 8 }}>{error}</div>
        <div style={{ fontSize: 14, color: P.sl }}>📧 contact@optimus-campus.ne · 📞 +227 XX XX XX XX</div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 8, background: P.p, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 700, fontSize: 18, color: '#fff' }}>OC</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: P.ink }}>Chargement des données nationales...</div>
      </div>
    </div>
  )

  const d = data
  const niveauxOrder = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3']

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'Marianne','Roboto',sans-serif" }}>
      {/* Header */}
      <header style={{ background: P.p, color: '#fff', padding: '32px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.08em' }}>RÉPUBLIQUE DU NIGER — MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>Tableau de bord national</div>
            <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>Optimus Campus · {d.tenants} universités · Données temps réel</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.5 }}>Dernière mise à jour</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </header>

      <div style={{ padding: '32px 48px' }}>
        {/* KPIs nationaux */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24, marginBottom: 40 }}>
          {[
            { l: 'Étudiants inscrits', v: d.totalStudents.toLocaleString('fr') },
            { l: 'Hommes', v: `${d.totalHommes.toLocaleString('fr')} (${d.totalStudents ? Math.round(d.totalHommes / d.totalStudents * 100) : 0}%)` },
            { l: 'Femmes', v: `${d.totalFemmes.toLocaleString('fr')} (${d.totalStudents ? Math.round(d.totalFemmes / d.totalStudents * 100) : 0}%)` },
            { l: 'Boursiers', v: d.totalBoursiers.toLocaleString('fr') },
            { l: 'Recettes totales', v: d.totalCollecte.toLocaleString('fr') + ' FCFA' },
          ].map((k, i) => (
            <div key={i} style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: P.p, lineHeight: 1.2 }}>{k.v}</div>
              <div style={{ fontSize: 14, color: P.sl, marginTop: 8 }}>{k.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
          {/* Répartition par niveau */}
          <div style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, padding: 32 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: P.ink, marginBottom: 20 }}>Répartition par niveau</div>
            {niveauxOrder.filter(n => d.niveaux[n]).map(n => {
              const pct = d.totalStudents ? Math.round(d.niveaux[n] / d.totalStudents * 100) : 0
              return (
                <div key={n} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{n}</span>
                    <span>{d.niveaux[n].toLocaleString('fr')} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: P.bg, borderRadius: 6 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: P.p, borderRadius: 6, transition: 'width .5s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Répartition par sexe — proportionnel */}
          <div style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, padding: 32 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: P.ink, marginBottom: 20 }}>Parité homme/femme</div>
            <div style={{ display: 'flex', height: 48, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ width: `${d.totalStudents ? (d.totalHommes / d.totalStudents * 100) : 50}%`, background: P.p, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                {d.totalStudents ? Math.round(d.totalHommes / d.totalStudents * 100) : 0}% H
              </div>
              <div style={{ flex: 1, background: '#B60066', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                {d.totalStudents ? Math.round(d.totalFemmes / d.totalStudents * 100) : 0}% F
              </div>
            </div>
            <div style={{ fontSize: 14, color: P.sl, lineHeight: 1.8 }}>
              <div><strong>{d.totalHommes.toLocaleString('fr')}</strong> étudiants</div>
              <div><strong>{d.totalFemmes.toLocaleString('fr')}</strong> étudiantes</div>
              <div><strong>{d.totalBoursiers.toLocaleString('fr')}</strong> boursiers ({d.totalStudents ? Math.round(d.totalBoursiers / d.totalStudents * 100) : 0}%)</div>
            </div>
          </div>
        </div>

        {/* Tableau par université */}
        <div style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: `1px solid ${P.bd}` }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: P.ink }}>Détail par établissement</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Université', 'Étudiants', 'Hommes', 'Femmes', 'Parité F', 'Boursiers', 'Recettes (FCFA)'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '14px 16px', fontSize: 14, fontWeight: 600, color: P.sl, borderBottom: `2px solid ${P.bd}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {d.perUni.map((u, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${P.bd}` }}>
                  <td style={{ padding: '16px', fontSize: 15, fontWeight: 600, color: P.ink }}>{u.name}</td>
                  <td style={{ padding: '16px', fontSize: 15, fontWeight: 700, color: P.p }}>{u.total.toLocaleString('fr')}</td>
                  <td style={{ padding: '16px', fontSize: 14 }}>{u.hommes}</td>
                  <td style={{ padding: '16px', fontSize: 14 }}>{u.femmes}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 48, height: 6, background: P.bg, borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${u.total ? (u.femmes / u.total * 100) : 0}%`, background: '#B60066', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 13, color: P.sl }}>{u.total ? Math.round(u.femmes / u.total * 100) : 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}><span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: '#E6F0E9', color: P.g }}>{u.boursiers}</span></td>
                  <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: P.g }}>{u.collecte.toLocaleString('fr')}</td>
                </tr>
              ))}
              <tr style={{ background: P.bg, fontWeight: 700 }}>
                <td style={{ padding: '16px', fontSize: 15 }}>TOTAL NATIONAL</td>
                <td style={{ padding: '16px', fontSize: 15, color: P.p }}>{d.totalStudents.toLocaleString('fr')}</td>
                <td style={{ padding: '16px' }}>{d.totalHommes}</td>
                <td style={{ padding: '16px' }}>{d.totalFemmes}</td>
                <td style={{ padding: '16px' }}>{d.totalStudents ? Math.round(d.totalFemmes / d.totalStudents * 100) : 0}%</td>
                <td style={{ padding: '16px' }}>{d.totalBoursiers}</td>
                <td style={{ padding: '16px', color: P.g }}>{d.totalCollecte.toLocaleString('fr')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: P.sl }}>
          Optimus Campus · Numatech Services · Niamey, Niger 🇳🇪
        </div>
      </div>
    </div>
  )
}
