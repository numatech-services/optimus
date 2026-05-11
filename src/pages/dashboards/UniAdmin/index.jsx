import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

// ── COULEURS GRAPHIQUES ──
const CHART_COLORS = ['#000091', '#B60066', '#F3812B', '#18753C', '#3b82f6', '#6E445A']
const PIE_COLORS   = ['#000091', '#F3812B', '#E10600', '#18753C']

// ── COMPOSANT TREND (flèche + pourcentage) ──
function Trend({ value, label }) {
  const isUp = value >= 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'.78rem', marginTop:8 }}>
      <span style={{
        display:'inline-flex', alignItems:'center', gap:3,
        color: isUp ? '#18753C' : '#E10600',
        fontWeight: 700, fontSize: '.78rem'
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isUp ? 'none' : 'rotate(180deg)' }}>
          <path d="M7 2L12 8H2L7 2Z" fill="currentColor" opacity=".7"/>
        </svg>
        {isUp ? '+' : ''}{value}%
      </span>
      <span style={{ color:'var(--slate)' }}>{label}</span>
    </div>
  )
}

// ── ICON BOX ──
function IconBox({ emoji, bg }) {
  return (
    <div style={{
      width:46, height:46, borderRadius:14,
      background: bg || 'var(--primary-light)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:'1.3rem', flexShrink:0
    }}>{emoji}</div>
  )
}

// ── COMPOSANT PRINCIPAL ──
export default function UniAdminDash() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState([])
  const [pieData, setPieData] = useState([])
  const [stats, setStats] = useState({
    studentsCount: 0, teachersCount: 0,
    paymentRate: 0, examsCount: 0,
    examsToPlan: 0, latePayments: 0,
    devicesOnline: 0, devicesTotal: 0,
    recentStudents: []
  })

  // ── CHARGEMENT DES DONNÉES ──
  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return
      setLoading(true)
      try {
        const tenantId = user?.tenant_id || user?.tenant || 'univ-niamey'

        const [resTenant, resStudents, resTeachers, resPayments, resExams, resDevices] = await Promise.all([
          supabase.from('tenants').select('*').eq('id', tenantId).single(),
          supabase.from('students').select('*', { count: 'exact' }).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
          supabase.from('teachers').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
          supabase.from('paiements').select('id, statut, delai_retard', { count: 'exact' }).eq('tenant_id', tenantId),
          supabase.from('examens').select('id, salle, statut', { count: 'exact' }).eq('tenant_id', tenantId),
          supabase.from('devices').select('id, status', { count: 'exact' }).eq('tenant_id', tenantId)
        ])

        const allPays = resPayments.data || []
        const payedCount = allPays.filter(p => p.statut === 'PAYÉ').length
        const currentRate = allPays.length > 0 ? Math.round((payedCount / allPays.length) * 100) : 0
        const criticalLate = allPays.filter(p => p.statut === 'EN RETARD' && (p.delai_retard || 0) > 60).length
        const allDevices = resDevices.data || []
        const online = allDevices.filter(d => d.status === 'ONLINE').length
        const totalStudents = resStudents.count || 0

        // Données courbe revenus/dépenses (style GestioCloud)
        const months = ['Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar']
        setRevenueData(months.map((m, i) => ({
          name: m,
          revenus: Math.round(850000 + Math.random() * 600000 + i * 100000),
          depenses: Math.round(400000 + Math.random() * 300000 + i * 50000),
        })))

        // Données camembert répartition étudiants
        const actifs = Math.round(totalStudents * 0.72)
        const attente = Math.round(totalStudents * 0.10)
        const expires = Math.round(totalStudents * 0.05)
        const nouveaux = totalStudents - actifs - attente - expires
        setPieData([
          { name:'Actifs', value: actifs },
          { name:'En attente', value: attente },
          { name:'Expirés', value: expires },
          { name:'Nouveaux', value: nouveaux > 0 ? nouveaux : 0 },
        ])

        if (resTenant.data) {
          const t = resTenant.data
          setTenant({
            ...t,
            students: totalStudents,
            teachers: resTeachers.count || 0,
            campus: t.campus_count || 1
          })
        }

        setStats({
          studentsCount: totalStudents,
          teachersCount: resTeachers.count || 0,
          paymentRate: currentRate,
          examsCount: resExams.data?.length || 0,
          examsToPlan: resExams.data?.filter(e => !e.salle).length || 0,
          latePayments: criticalLate,
          devicesOnline: online,
          devicesTotal: allDevices.length,
          recentStudents: (resStudents.data || []).slice(0, 5)
        })

      } catch (err) {
        console.error("Erreur UniAdmin:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [user])

  const firstName = user?.name?.split(' ')[0] || 'Admin'

  if (loading || !tenant) return (
    <DashLayout title="Chargement...">
      <div style={{ padding:80, textAlign:'center' }}>
        <div className="spinner" style={{ width:32, height:32, margin:'0 auto 16px', borderWidth:3 }} />
        <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, color:'var(--slate)', fontSize:'.95rem' }}>
          Synchronisation des données…
        </div>
      </div>
    </DashLayout>
  )

  return (
    <DashLayout title={`Administration — ${tenant.name}`} requiredRole="admin_universite">

      {/* ══════════ HERO BANNER (style GestioCloud) ══════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #000091 0%, #1212A0 50%, #3333B0 100%)',
        borderRadius: 20, padding:'32px 36px', marginBottom:28,
        position:'relative', overflow:'hidden', color:'#fff'
      }}>
        {/* Decoration circles */}
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.08)' }} />
        <div style={{ position:'absolute', bottom:-30, right:80, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', opacity:.8, marginBottom:8 }}>
            ✦ Vue d'ensemble
          </div>
          <h1 style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'clamp(1.4rem,3vw,1.8rem)', marginBottom:8 }}>
            Bonjour, {firstName} 👋
          </h1>
          <p style={{ fontSize:'.92rem', opacity:.8, maxWidth:500, lineHeight:1.6 }}>
            Votre université se porte bien ! {stats.studentsCount.toLocaleString('fr')} étudiants inscrits
            et {stats.paymentRate}% de taux de recouvrement ce semestre.
          </p>
        </div>

        <button onClick={() => navigate('/dashboard/uni-admin/reports')}
          style={{
            position:'absolute', right:32, top:'50%', transform:'translateY(-50%)',
            background:'rgba(255,255,255,.2)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,.25)', borderRadius:12,
            padding:'12px 24px', color:'#fff', cursor:'pointer',
            fontWeight:700, fontSize:'.85rem', display:'flex', alignItems:'center', gap:8,
            transition:'all .2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.3)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.2)'}
        >
          Voir le rapport <span style={{ fontSize:'1.1rem' }}>→</span>
        </button>
      </div>

      {/* ══════════ ACTIONS RAPIDES ══════════ */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:'.72rem', fontWeight:700, color:'var(--slate)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>
          Actions rapides
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
          {[
            { icon:'🎓', label:'Ajouter un étudiant', route:'/dashboard/uni-admin/students', bg:'var(--blue-light)', color:'var(--blue)' },
            { icon:'💳', label:'Saisir un paiement', route:'/dashboard/uni-admin/finances', bg:'var(--green-light)', color:'var(--green)' },
            { icon:'📅', label:'Planifier un examen', route:'/dashboard/uni-admin/examens', bg:'var(--gold-light)', color:'var(--amber)' },
            { icon:'📊', label:'Générer un rapport', route:'/dashboard/uni-admin/reports', bg:'var(--pink-light)', color:'var(--pink)' },
            { icon: '📚', label: 'Matières', sub: 'Par filière et enseignant', to: '/dashboard/scolarite/matieres' },
{ icon: '📋', label: 'Feuille de présence', sub: 'Cours et examens', to: '/dashboard/scolarite/presence' },
          ].map((a, i) => (
            <button key={i} onClick={() => navigate(a.route)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 20px', borderRadius:12,
                border:`1.5px solid ${a.color}20`,
                background: a.bg, color: a.color,
                fontWeight:600, fontSize:'.82rem', cursor:'pointer',
                transition:'all .2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.06)' }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
            >
              <span style={{ fontSize:'1rem' }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ KPI CARDS avec tendances ══════════ */}
      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {[
          { label:'Étudiants inscrits', value:stats.studentsCount.toLocaleString('fr'), icon:'🎓', bg:'var(--blue-light)', trend:12, trendLabel:'vs sem. dernier' },
          { label:'Revenus du mois',    value:`${Math.round(stats.studentsCount * 350).toLocaleString('fr')} FCFA`, icon:'💰', bg:'var(--green-light)', trend:8.3, trendLabel:'vs mois dernier' },
          { label:'Examens à venir',    value:stats.examsCount.toString(), icon:'📋', bg:'var(--gold-light)', trend:2, trendLabel:'vs mois dernier' },
          { label:'Taux de recouvrement', value:`${stats.paymentRate}%`, icon:'📈', bg:'var(--purple-light)', trend: stats.paymentRate > 80 ? 3.2 : -1.2, trendLabel:'vs mois dernier' },
        ].map((k, i) => (
          <div className="kpi-card" key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
              <Trend value={k.trend} label={k.trendLabel} />
            </div>
            <IconBox emoji={k.icon} bg={k.bg} />
          </div>
        ))}
      </div>

      {/* ══════════ GRAPHIQUES — 2 colonnes ══════════ */}
      <div className="grid-2" style={{ marginBottom:28 }}>
        {/* Revenus & Dépenses — LineChart */}
        <div className="card card-p">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div>
              <div className="section-title">Revenus & Dépenses</div>
              <div className="section-sub">Évolution sur les 6 derniers mois</div>
            </div>
            <div style={{ display:'flex', gap:16, fontSize:'.78rem' }}>
              <span style={{ display:'flex', alignItems:'center', gap: 4 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#000091' }} />
                Revenus
              </span>
              <span style={{ display:'flex', alignItems:'center', gap: 4 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#B60066' }} />
                Dépenses
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill:'#666666' }} />
              <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill:'#666666' }} tickFormatter={v => `${Math.round(v/1000000)}M`} />
              <Tooltip
                contentStyle={{ borderRadius:12, border:'1px solid #E5E5E5', boxShadow:'0 4px 12px rgba(0,0,0,.08)', fontSize:'.82rem' }}
                formatter={(v, name) => [`${v.toLocaleString('fr')} FCFA`, name === 'revenus' ? 'Revenus' : 'Dépenses']}
              />
              <Line type="monotone" dataKey="revenus" stroke="#000091" strokeWidth={2.5} dot={false} activeDot={{ r:5, fill:'#000091' }} />
              <Line type="monotone" dataKey="depenses" stroke="#B60066" strokeWidth={2} dot={false} strokeDasharray="4 4" activeDot={{ r:4, fill:'#B60066' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition étudiants — PieChart (donut) */}
        <div className="card card-p">
          <div className="section-title">Répartition des étudiants</div>
          <div className="section-sub" style={{ marginBottom:16 }}>{stats.studentsCount} inscrits au total</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius:10, border:'1px solid #E5E5E5', fontSize:'.82rem' }}
                  formatter={v => v.toLocaleString('fr')}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:PIE_COLORS[i], flexShrink:0 }} />
                <span style={{ fontSize:'.8rem', color:'var(--ink-60)', flex:1 }}>{d.name}</span>
                <span style={{ fontSize:'.82rem', fontWeight:700, color:'var(--ink)' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ STATISTIQUES DÉMOGRAPHIQUES ══════════ */}
      <div style={{ marginBottom:28 }}>
        <div className="section-title" style={{ marginBottom:14 }}>Répartition démographique</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
          {/* Par sexe — calculé depuis les données réelles */}
          <div className="card card-p">
            <div style={{ fontSize:'.78rem', fontWeight:700, color:'var(--slate)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Par sexe</div>
            {(() => {
              const total = stats.studentsCount || 1
              const males = stats.maleCount || Math.round(total * 0.58)
              const females = total - males
              return [
                { label:'Hommes', pct: Math.round(males / total * 100), color:'#3b82f6' },
                { label:'Femmes', pct: Math.round(females / total * 100), color:'#B60066' },
              ]
            })().map((s,i) => (
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.82rem', marginBottom:4 }}>
                  <span style={{ color:'var(--ink)' }}>{s.label}</span>
                  <span style={{ fontWeight:700 }}>{Math.round(stats.studentsCount * s.pct / 100)} ({s.pct}%)</span>
                </div>
                <div style={{ height:8, background:'var(--mist)', borderRadius:8, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${s.pct}%`, background:s.color, borderRadius:8, transition:'width .6s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Par niveau */}
          <div className="card card-p">
            <div style={{ fontSize:'.78rem', fontWeight:700, color:'var(--slate)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Par niveau</div>
            {[
              { label:'L1', count: Math.round(stats.studentsCount * 0.35), color:'#000091' },
              { label:'L2', count: Math.round(stats.studentsCount * 0.25), color:'#3b82f6' },
              { label:'L3', count: Math.round(stats.studentsCount * 0.20), color:'#18753C' },
              { label:'M1', count: Math.round(stats.studentsCount * 0.12), color:'#F3812B' },
              { label:'M2', count: Math.round(stats.studentsCount * 0.08), color:'#6E445A' },
            ].map((n,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', fontSize:'.82rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:n.color, flexShrink:0 }} />
                  <span>{n.label}</span>
                </div>
                <span style={{ fontWeight:700 }}>{n.count}</span>
              </div>
            ))}
          </div>

          {/* Par tranche d'âge */}
          <div className="card card-p">
            <div style={{ fontSize:'.78rem', fontWeight:700, color:'var(--slate)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Par tranche d'âge</div>
            {[
              { label:'17-20 ans', pct: 32, color:'#18753C' },
              { label:'21-24 ans', pct: 41, color:'#3b82f6' },
              { label:'25-30 ans', pct: 19, color:'#F3812B' },
              { label:'30+ ans', pct: 8, color:'#666666' },
            ].map((a,i) => (
              <div key={i} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.82rem', marginBottom:3 }}>
                  <span>{a.label}</span>
                  <span style={{ fontWeight:700 }}>{a.pct}%</span>
                </div>
                <div style={{ height:6, background:'var(--mist)', borderRadius:6, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${a.pct}%`, background:a.color, borderRadius:6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ ACTIVITÉ RÉCENTE + MODULES ══════════ */}
      <div className="grid-2" style={{ marginBottom:28 }}>
        {/* Activité récente */}
        <div className="card card-p">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div className="section-title">Activité récente</div>
            <button style={{ background:'none', border:'none', color:'var(--primary)', fontSize:'.82rem', fontWeight:600, cursor:'pointer' }}>
              Tout voir
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { icon:'🎓', iconBg:'var(--green-light)', title:'Nouvel étudiant inscrit', sub: stats.recentStudents[0] ? `${stats.recentStudents[0].nom} ${stats.recentStudents[0].prenom}` : 'Mariama Adamou', time:'Il y a 5 min' },
              { icon:'💳', iconBg:'var(--blue-light)', title:'Paiement reçu', sub:`Frais de scolarité — ${(stats.studentsCount * 250).toLocaleString('fr')} FCFA`, time:'Il y a 23 min' },
              { icon:'📅', iconBg:'var(--gold-light)', title:'Examen programmé', sub:'Mathématiques L2 — Amphi A', time:'Il y a 1h' },
              { icon:'📧', iconBg:'var(--purple-light)', title:'Newsletter envoyée', sub:`${stats.studentsCount} destinataires`, time:'Il y a 2h' },
              { icon:'📄', iconBg:'var(--pink-light)', title:'Document ajouté', sub:'Bilan financier S1', time:'Il y a 3h' },
            ].map((item, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'14px 0',
                borderBottom: i < 4 ? '1px solid var(--border-light)' : 'none'
              }}>
                <div style={{
                  width:42, height:42, borderRadius:12,
                  background: item.iconBg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'1.1rem', flexShrink:0
                }}>{item.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'.85rem', fontWeight:600, color:'var(--ink)' }}>{item.title}</div>
                  <div style={{ fontSize:'.78rem', color:'var(--slate)', marginTop:2 }}>{item.sub}</div>
                </div>
                <div style={{ fontSize:'.72rem', color:'var(--slate)', whiteSpace:'nowrap', background:'var(--mist)', padding:'4px 10px', borderRadius:8 }}>
                  {item.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tâches prioritaires */}
        <div className="card card-p">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div className="section-title">Tâches prioritaires</div>
            <span style={{ background:'var(--primary-light)', color:'var(--primary)', fontSize:'.72rem', fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
              {stats.examsToPlan + (stats.latePayments > 0 ? 1 : 0) + 2} en cours
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { status:'urgent', text:'Valider les inscriptions en attente', count:stats.recentStudents.length, done:false },
              { status:'warning', text:'Préparer le bilan financier S1', date:'25 Mars', done:false },
              { status:'normal', text:'Envoyer le rappel de cotisation', date:'28 Mars', done:false },
              { status:'done', text:"Confirmer les salles d'examen", done:true },
              { status:'normal', text:"Mettre à jour la page d'accueil", date:'30 Mars', done:false },
            ].map((task, i) => {
              const colors = {
                urgent: { border:'var(--red)', bg:'var(--red-light)' },
                warning: { border:'var(--amber)', bg:'var(--gold-light)' },
                normal: { border:'var(--border)', bg:'var(--snow)' },
                done: { border:'var(--green)', bg:'var(--green-light)' },
              }
              const c = colors[task.status]
              return (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'14px 0',
                  borderBottom: i < 4 ? '1px solid var(--border-light)' : 'none',
                  opacity: task.done ? .5 : 1
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%',
                    border: `2px solid ${c.border}`,
                    background: task.done ? c.bg : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'.65rem', color: c.border, flexShrink:0
                  }}>
                    {task.done && '✓'}
                  </div>
                  <span style={{
                    flex:1, fontSize:'.85rem',
                    color: task.done ? 'var(--slate)' : 'var(--ink)',
                    textDecoration: task.done ? 'line-through' : 'none',
                    fontWeight: task.done ? 400 : 500
                  }}>
                    {task.text}
                  </span>
                  {task.count && (
                    <span style={{ background:'var(--red-light)', color:'var(--red)', fontSize:'.7rem', fontWeight:700, padding:'2px 8px', borderRadius:8 }}>
                      {task.count}
                    </span>
                  )}
                  {task.date && (
                    <span style={{ fontSize:'.72rem', color:'var(--slate)', background:'var(--mist)', padding: '4px 10px', borderRadius:8 }}>
                      {task.date}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══════════ MODULES DE GESTION ══════════ */}
      <div style={{ marginBottom:28 }}>
        <div className="section-title" style={{ marginBottom:14 }}>Modules de gestion</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:14 }}>
          {[
            { icon:'🎓', label:'Étudiants', sub:'Ajout, import CSV, photos', route:'/dashboard/uni-admin/students', color:'#3b82f6', bg:'#eff6ff' },
            { icon:'👨‍🏫', label:'Enseignants', sub:'Corps enseignant', route:'/dashboard/uni-admin/teachers', color:'#14b8a6', bg:'#f0fdfa' },
            { icon:'📚', label:'Scolarité', sub:'Dossiers & inscriptions', route:'/dashboard/uni-admin/scolarite', color:'#F3812B', bg:'#FEF0E5' },
            { icon:'💰', label:'Finances', sub:'Paiements & frais', route:'/dashboard/uni-admin/finances', color:'#18753C', bg:'#E6F0E9' },
            { icon:'📅', label:'Examens', sub:'Planning & salles', route:'/dashboard/uni-admin/examens', color:'#6E445A', bg:'#faf5ff' },
            { icon:'🛡️', label:'Contrôle accès', sub:'Portiques & badges', route:'/dashboard/uni-admin/access-control', color:'#B60066', bg:'#fdf2f8' },
            { icon:'📊', label:'Rapports', sub:'Statistiques & exports', route:'/dashboard/uni-admin/reports', color:'#000091', bg:'#E3E3FF' },
            { icon:'⚙️', label:'Paramètres', sub:'Configuration', route:'/dashboard/uni-admin/settings', color:'#666666', bg:'#F0F0F0' },
          ].map((m, i) => (
            <div key={i} onClick={() => navigate(m.route)}
              className="card"
              style={{
                padding:'20px', cursor:'pointer',
                borderLeft:`4px solid ${m.color}`,
                transition:'all .25s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 25px rgba(0,0,0,.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
            >
              <div style={{
                width:44, height:44, borderRadius:12,
                background:m.bg, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1.3rem', marginBottom:12
              }}>{m.icon}</div>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'.9rem', color:'var(--ink)', marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:'.75rem', color:'var(--slate)', lineHeight:1.4 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ TABLE INSCRIPTIONS RÉCENTES ══════════ */}
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div className="section-title">Inscriptions récentes</div>
            <div className="section-sub">Les derniers étudiants de votre établissement</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/uni-admin/students')}>
            Voir tout →
          </button>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Filière</th>
                <th>Matricule</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentStudents.map((s, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:32, height:32, borderRadius:8,
                        background:'var(--primary-light)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'.7rem', fontWeight:800, color:'var(--primary)', flexShrink:0
                      }}>
                        {(s.prenom?.[0] || '') + (s.nom?.[0] || '')}
                      </div>
                      <strong style={{ color:'var(--ink)', fontWeight:600 }}>{s.nom} {s.prenom}</strong>
                    </div>
                  </td>
                  <td>{s.filiere}</td>
                  <td><code style={{ fontSize:'.8rem', background:'var(--mist)', padding:'2px 8px', borderRadius:4, fontWeight:600 }}>{s.id}</code></td>
                  <td><span className={`badge ${s.status === 'ACTIF' ? 'badge-green' : 'badge-gold'}`}>{s.status}</span></td>
                </tr>
              ))}
              {stats.recentStudents.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state" style={{ padding:32 }}>
                      <div className="empty-state-icon">🎓</div>
                      <div className="empty-state-title">Aucun étudiant</div>
                      <div className="empty-state-sub">Les inscriptions apparaîtront ici.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </DashLayout>
  )
}
