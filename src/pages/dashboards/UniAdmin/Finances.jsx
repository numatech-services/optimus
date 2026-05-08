import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Clock, TrendingUp, AlertCircle, Search, Download, Mail, ShieldAlert, CheckCircle2, Printer } from 'lucide-react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

const METHODES = ['Tous', 'Orange Money', 'Wave', 'Mobile Money', 'Virement', 'Caisse', 'Free Money']
const STATUTS = ['Tous', 'PAYÉ', 'EN ATTENTE', 'EN RETARD']
const STATUS_B = { 'PAYÉ': 'badge-green', 'EN ATTENTE': 'badge-gold', 'EN RETARD': 'badge-red' }

export default function UniAdminFinances() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.tenant

  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [filterSt, setFilterSt] = useState('Tous')
  const [filterMe, setFilterMe] = useState('Tous')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (tenantId) fetchPayments()
  }, [tenantId])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('paiements')
        .select('*, students(nom, prenom)')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: false })

      if (data) {
        setPayments(data.map(p => ({
          id: p.id,
          nom: p.students ? `${p.students.prenom} ${p.students.nom}` : 'Inconnu',
          mat: p.student_id,
          desc: p.description,
          montant: p.montant,
          date: p.date_paiement,
          methode: p.methode,
          statut: p.statut
        })))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleValider = async (id) => {
    const { error } = await supabase
      .from('paiements')
      .update({ statut: 'PAYÉ', methode: 'Caisse', date_paiement: new Date().toISOString() })
      .eq('id', id)
    if (!error) { showToast('Paiement encaissé ✓'); fetchPayments() }
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const filtered = useMemo(() => payments.filter(p => {
    const q = search.toLowerCase()
    return (!q || `${p.nom} ${p.mat}`.toLowerCase().includes(q)) &&
           (filterSt === 'Tous' || p.statut === filterSt) &&
           (filterMe === 'Tous' || p.methode === filterMe)
  }), [payments, search, filterSt, filterMe])

  // KPI Calculations
  const totalEnc = payments.filter(p => p.statut === 'PAYÉ').reduce((s, p) => s + (p.montant || 0), 0)
  const totalAtt = payments.filter(p => p.statut !== 'PAYÉ').reduce((s, p) => s + (p.montant || 0), 0)
  const nbRetard = payments.filter(p => p.statut === 'EN RETARD').length
  const txRecouvrement = Math.round((payments.filter(p => p.statut === 'PAYÉ').length / (payments.length || 1)) * 100)

  if (loading) return <DashLayout title="Finances"><div className="p-20 text-center">Chargement des données...</div></DashLayout>

  return (
    <DashLayout title="Finances" requiredRole="admin_universite">
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: 'var(--ink)', color: '#fff', fontWeight: 700, fontSize: '.85rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      <div className="dash-page-title">Gestion Financière</div>
      <div className="dash-page-sub">Suivi des encaissements et recouvrements</div>

      {/* ── KPI HORIZONTAUX ── */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, marginBottom: 24, overflowX: 'auto' }}>
        {[
          { label: 'Encaissé', value: `${(totalEnc / 1000).toFixed(0)}K`, sub: 'XOF', color: 'var(--green)', Icon: Wallet },
          { label: 'Attente', value: `${(totalAtt / 1000).toFixed(0)}K`, sub: 'XOF', color: 'var(--gold)', Icon: Clock },
          { label: 'Recouvrement', value: `${txRecouvrement}%`, sub: 'Objectif 95%', color: 'var(--blue)', Icon: TrendingUp },
          { label: 'En Retard', value: nbRetard, sub: 'Étudiants', color: 'var(--red)', Icon: AlertCircle }
        ].map((k, i) => (
          <div key={i} style={{ flex: 1, minWidth: 180, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: k.color + '10', padding: 10, borderRadius: 10 }}><k.Icon size={18} color={k.color} /></div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)' }}>{k.value} <small style={{ fontSize: '.7rem', color: 'var(--slate)' }}>{k.sub}</small></div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--slate)' }} />
              <input className="form-input" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, paddingLeft: 34, height: 36, fontSize: '.8rem' }} />
            </div>
            <select className="form-input" value={filterSt} onChange={e => setFilterSt(e.target.value)} style={{ width: 120, height: 36, fontSize: '.8rem' }}>
              {STATUTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Exporter CSV
          </button>
        </div>

        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Montant</th>
                <th>Date / Méthode</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '.85rem' }}>{p.nom}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--slate)' }}>{p.mat} • {p.desc}</div>
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '.85rem' }}>{p.montant?.toLocaleString()} XOF</td>
                  <td>
                    <div style={{ fontSize: '.8rem' }}>{p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '—'}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--slate)' }}>{p.methode || 'Non spécifié'}</div>
                  </td>
                  <td><span className={`badge ${STATUS_B[p.statut]}`}>{p.statut}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      
                      {/* Action Principale : Encaisser ou Reçu */}
                      {p.statut !== 'PAYÉ' ? (
                        <button 
                          onClick={() => handleValider(p.id)}
                          style={{ background: 'var(--ink)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle2 size={14} /> Encaisser
                        </button>
                      ) : (
                        <button 
                          style={{ background: 'var(--mist)', color: 'var(--ink)', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Printer size={14} /> Reçu
                        </button>
                      )}

                      {/* Relance */}
                      <button 
                        title="Envoyer rappel"
                        onClick={() => showToast('Email de relance envoyé')}
                        style={{ background: '#fff', color: 'var(--slate)', border: '1px solid var(--border)', padding: '6px', borderRadius: 6, cursor: 'pointer' }}>
                        <Mail size={14} />
                      </button>

                      {/* Sanction (uniquement si retard) */}
                      {p.statut === 'EN RETARD' && (
                        <button 
                          title="Restreindre l'accès"
                          onClick={() => showToast('Accès portique suspendu')}
                          style={{ background: '#fff1f0', color: '#f5222d', border: '1px solid #ffa39e', padding: '6px', borderRadius: 6, cursor: 'pointer' }}>
                          <ShieldAlert size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}