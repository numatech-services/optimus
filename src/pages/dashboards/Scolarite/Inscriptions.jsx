import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { supabase } from '../../../lib/supabase'
import { notifyEvent } from '../../../utils/pushService' // Client Supabase réel
import { useAuth } from '../../../context/AuthContext'

const STATUT_B = { COMPLET: 'badge-green', PARTIEL: 'badge-gold', 'EN ATTENTE': 'badge-red' }

export default function ScolariteInscriptions() {
  const { user } = useAuth()
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('pending')
  const [toast, setToast] = useState(null)

  const showToast = (msg, t = 'success') => {
    setToast({ msg, t })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchDossiers()
  }, [])

  const fetchDossiers = async () => {
    setLoading(true)
    try {
      // On récupère les étudiants et on simule/calcule le statut de paiement
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000)

      if (data) {
        // Mappage -> JS Variables existantes
        const mapped = data.map(s => ({
          id: s.id, // Matricule
          nom: `${s.prenom} ${s.nom}`,
          filiere: s.filiere,
          date: s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : s.annee,
          docs: ['Bac', 'CNI', 'Photo'], // Docs par défaut (Design Intact)
          // Mappage statut vers Logique UI
          status: s.status === 'ACTIF' ? 'VALIDATED' : (s.status === 'REFUSÉ' ? 'REJECTED' : 'PENDING'),
          // Simulation du badge paiement basé sur la présence en base (Design Intact)
          paiement: s.status === 'ACTIF' ? 'COMPLET' : 'EN ATTENTE'
        }))
        setDossiers(mapped)
      }
    } catch (err) {
      console.error("Erreur chargement inscriptions:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. ACTIONS CRUD RÉELLES ──
  const validate = async (id) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'ACTIF' })
        .eq('id', id)
      if (!error) {
        setDossiers(p => p.map(d => d.id === id ? { ...d, status: 'VALIDATED', paiement: 'COMPLET' } : d))
        showToast('Dossier validé ✓')
        notifyEvent('announcement', { titre: 'Inscription validée' })
      }
    } catch (err) {
      console.error("[Error]", err.message)
    }
  }

  const reject = async (id) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'REFUSÉ' })
        .eq('id', id)
      if (!error) {
        setDossiers(p => p.map(d => d.id === id ? { ...d, status: 'REJECTED' } : d))
        showToast('Dossier rejeté', 'error')
      }
    } catch (err) {
      console.error("[Error]", err.message)
    }
  }

  const validateAll = async () => {
    const pendingIds = dossiers.filter(d => d.status === 'PENDING').map(d => d.id)
    if (pendingIds.length === 0) return
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'ACTIF' })
        .in('id', pendingIds)
      if (!error) {
        setDossiers(p => p.map(d => d.status === 'PENDING' ? { ...d, status: 'VALIDATED', paiement: 'COMPLET' } : d))
        showToast(`${pendingIds.length} dossiers validés`)
        notifyEvent('announcement', { titre: `${pendingIds.length} inscriptions validées` })
      }
    } catch (err) {
      console.error("[Error]", err.message)
    }
  }

  // ── 3. LOGIQUE DE FILTRAGE (Design Intact) ──
  const q = search.toLowerCase()
  const filtered = useMemo(() => {
    return dossiers.filter(d => {
      const matchQ = !q || d.nom.toLowerCase().includes(q) || d.filiere.toLowerCase().includes(q)
      if (tab === 'pending') return matchQ && d.status === 'PENDING'
      if (tab === 'validated') return matchQ && d.status === 'VALIDATED'
      if (tab === 'rejected') return matchQ && d.status === 'REJECTED'
      return matchQ
    })
  }, [dossiers, q, tab])

  const pending = dossiers.filter(d => d.status === 'PENDING').length
  const validated = dossiers.filter(d => d.status === 'VALIDATED').length
  const rejected = dossiers.filter(d => d.status === 'REJECTED').length

  if (loading) return <DashLayout title="Inscriptions">
    <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700 }}>
      Synchronisation des dossiers étudiants...
    </div>
  </DashLayout>

  return (
    <DashLayout title="Inscriptions" requiredRole="scolarite">
      
      {/* Toast - Design 100% Intact */}
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: toast.t === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          {toast.t === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      <div className="dash-page-title">Gestion des Inscriptions</div>
      <div className="dash-page-sub">Traitement des dossiers · Semestre 2 2025-2026</div>

      {/* KPI Grid - Design Intact */}
      <div className="kpi-grid">
        {[
          { label: 'En attente', value: pending, sub: 'À traiter', icon: '📝', color: 'var(--red)' },
          { label: 'Validés', value: validated, sub: 'Inscrits actifs', icon: '✅', color: 'var(--green)' },
          { label: 'Rejetés', value: rejected, sub: 'Dossiers incomplets', icon: '❌', color: 'var(--slate)' },
          { label: 'Total dossiers', value: dossiers.length, sub: 'Total', icon: '📋', color: 'var(--blue)' },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="kpi-label">{k.label}</div>
              <span style={{ fontSize: '1.3rem' }}>{k.icon}</span>
            </div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Navigation Onglets et Recherche - Design Intact */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--mist)', borderRadius: 8, padding: 3 }}>
            {[
              ['pending', 'En attente', pending],
              ['validated', 'Validés', validated],
              ['rejected', 'Rejetés', rejected],
              ['all', 'Tous', dossiers.length]
            ].map(([id, label, count]) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.8rem', background: tab === id ? '#fff' : 'transparent', color: tab === id ? 'var(--ink)' : 'var(--slate)', boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,.07)' : 'none' }}>
                {label} {count > 0 && <span style={{ background: tab === id && id === 'pending' ? 'var(--red)' : 'var(--mist)', color: tab === id && id === 'pending' ? '#fff' : 'var(--slate)', borderRadius: 8, padding: '1px 6px', fontSize: '.7rem', marginLeft: 4 }}>{count}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 180, padding: '7px 10px', fontSize: '.82rem' }} />
            {tab === 'pending' && pending > 0 && <button className="btn btn-primary btn-sm" onClick={validateAll}>✓ Valider tout</button>}
          </div>
        </div>

        {/* Tableau des Inscriptions - Design Intact */}
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Filière</th>
                <th>Date dépôt</th>
                <th>Documents</th>
                <th>Paiement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} style={{ opacity: d.status !== 'PENDING' ? .6 : 1 }}>
                  <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {d.nom}
                    <div style={{fontSize:'.65rem', color:'var(--slate)', fontFamily:'monospace'}}>{d.id}</div>
                  </td>
                  <td style={{ fontSize: '.83rem' }}>{d.filiere}</td>
                  <td style={{ fontSize: '.78rem', color: 'var(--slate)' }}>{d.date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {d.docs.map(doc => <span key={doc} className="badge badge-slate" style={{ fontSize: '.65rem', padding: '2px 5px' }}>{doc}</span>)}
                    </div>
                  </td>
                  <td><span className={`badge ${STATUT_B[d.paiement] || 'badge-slate'}`}>{d.paiement}</span></td>
                  <td>
                    {d.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm" style={{ background: 'var(--green-light)', color: 'var(--green)', border: 'none', borderRadius: 6, padding: '5px 9px', fontWeight: 700, cursor: 'pointer' }} onClick={() => validate(d.id)}>✓ Valider</button>
                        <button className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 6, padding: '5px 9px', fontWeight: 700, cursor: 'pointer' }} onClick={() => reject(d.id)}>✕ Rejeter</button>
                      </div>
                    ) : (
                      <span className={`badge ${d.status === 'VALIDATED' ? 'badge-green' : 'badge-red'}`}>
                        {d.status === 'VALIDATED' ? 'Validé' : 'Rejeté'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Aucun dossier trouvé dans cette catégorie</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}