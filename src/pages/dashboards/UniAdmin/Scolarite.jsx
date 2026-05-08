import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashLayout from '../../../components/Layout/DashLayout'
import { supabase } from '../../../lib/supabase'

export default function UniAdminScolarite() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    pending: 0,
    active: 0,
    total: 0,
    examsToPlan: 0,
    docs: 8 
  })

  useEffect(() => {
    fetchScolariteStats()
  }, [])

  const fetchScolariteStats = async () => {
    setLoading(true)
    try {
      const { data: stdData } = await supabase.from('students').select('status')
      const { data: exData } = await supabase.from('examens').select('salle')

      if (stdData) {
        setStats(prev => ({
          ...prev,
          total: stdData.length,
          active: stdData.filter(s => s.status === 'ACTIF').length,
          pending: stdData.filter(s => s.status === 'PENDING' || s.status === 'EN ATTENTE').length
        }))
      }

      if (exData) {
        setStats(prev => ({
          ...prev,
          examsToPlan: exData.filter(e => !e.salle || e.salle === '').length
        }))
      }
    } catch (error) {
      console.error("Erreur stats scolarité:", error)
    } finally {
      setLoading(false)
    }
  }

  const modules = [
    {code:'INS',title:'Inscriptions & dossiers',desc:'Validation des dossiers, gestion des inscriptions par filière',count:`${stats.pending} en attente`,color:'var(--amber)',route:'/dashboard/scolarite/inscriptions'},
    {code:'EDT',title:'Emplois du temps',desc:'Planning des cours, gestion des créneaux et des salles',count:'3 conflits',color:'var(--blue)',route:'/dashboard/scolarite/edt'},
    {code:'EXM',title:'Examens & convocations',desc:'Sessions d\'examens, attribution des salles et surveillants',count:`${stats.examsToPlan} à planifier`,color:'var(--red)',route:'/dashboard/scolarite/examens'},
    {code:'NOT',title:'Notes & résultats',desc:'Saisie des notes, délibérations et publication des résultats',count:'2 à publier',color:'var(--green)',route:'/dashboard/scolarite/notes'},
    {code:'DOC',title:'Documents officiels',desc:'Attestations, relevés de notes, certificats de scolarité',count:`${stats.docs} demandes`,color:'var(--teal)',route:'/dashboard/scolarite/documents'},
  ]

  if (loading) return <DashLayout title="Scolarité"><div style={{padding:50, textAlign:'center'}}>Analyse des données de scolarité...</div></DashLayout>

  return (
    <DashLayout title="Scolarité" requiredRole="admin_universite">
      <div style={{marginBottom: 30}}>
        <h1 style={{fontSize: '1.8rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 8}}>Gestion de la Scolarité</h1>
        <p style={{color: 'var(--slate)', fontSize: '1rem'}}>Pilotage administratif et suivi des processus académiques</p>
      </div>
      
      {/* ── INDICATEURS CLÉS (KPI) ── */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32}}>
        {[
          {label:'Dossiers en attente', value:stats.pending, sub:'Action requise', color:'var(--amber)'},
          {label:'Étudiants actifs', value:stats.active, sub:`Sur ${stats.total} au total`, color:'var(--green)'},
          {label:'Examens à planifier', value:stats.examsToPlan, sub:'Salles manquantes', color:'var(--red)'},
          {label:'Demandes de documents', value:stats.docs, sub:'Flux de courriers', color:'var(--blue)'},
        ].map((k,i)=>(
          <div className="card" key={i} style={{padding: 20, borderTop: `4px solid ${k.color}`}}>
            <div style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>{k.label}</div>
            <div style={{fontSize: '2rem', fontWeight: 800, margin: '8px 0', color: 'var(--ink)'}}>{k.value.toLocaleString('fr')}</div>
            <div style={{fontSize: '0.8rem', color: 'var(--slate)'}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── GRILLE DES MODULES ── */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap: 16}}>
        {modules.map((m,i)=>(
          <div 
            key={i} 
            onClick={()=>navigate(m.route)}
            style={{
              background:'#fff',
              border:'1px solid var(--border)',
              borderRadius:12,
              padding:24,
              cursor:'pointer',
              transition:'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 10px 25px rgba(0,0,0,0.05)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}
          >
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 16}}>
              <div style={{
                width:48, height:48, borderRadius:8, 
                background:'var(--ink)', color:'#fff', 
                display:'flex', alignItems:'center', justifyContent:'center', 
                fontSize:'0.75rem', fontWeight:900
              }}>
                {m.code}
              </div>
              <span style={{
                fontSize:'0.7rem', fontWeight:800, 
                padding: '4px 12px', borderRadius:20, 
                background: m.color + '15', color: m.color,
                textTransform: 'uppercase', border: `1px solid ${m.color}30`
              }}>
                {m.count}
              </span>
            </div>

            <div style={{fontWeight:800, color:'var(--ink)', fontSize:'1.05rem', marginBottom:8}}>{m.title}</div>
            <div style={{fontSize:'0.85rem', color:'var(--slate)', lineHeight:1.6, marginBottom:20}}>{m.desc}</div>
            
            <div style={{fontSize:'0.8rem', fontWeight:700, color:'var(--blue)', display:'flex', alignItems:'center'}}>
              Accéder au module 
              <span style={{marginLeft: 8}}>→</span>
            </div>
          </div>
        ))}
      </div>
    </DashLayout>
  )
}