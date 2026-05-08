import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import { useState, useEffect, useRef } from 'react'

// ── Scroll-triggered fade-in hook ──
function useInView(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref, threshold])
  return visible
}

function Section({ children, className, style, delay = 0 }) {
  const ref = useRef()
  const vis = useInView(ref)
  return (
    <div ref={ref} className={className} style={{
      ...style,
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(30px)',
      transition: `opacity .7s ease ${delay}s, transform .7s ease ${delay}s`,
    }}>{children}</div>
  )
}

// ── SVG Illustrations (inline, no external deps) ──
const DashboardIllustration = () => (
  <svg viewBox="0 0 480 300" fill="none" style={{ width:'100%', borderRadius:16, overflow:'hidden' }}>
    <rect width="480" height="300" rx="16" fill="#F5F5F5"/>
    <rect x="0" y="0" width="120" height="300" fill="#fff" stroke="#E5E5E5"/>
    <rect x="16" y="20" width="88" height="10" rx="5" fill="#000091" opacity=".2"/>
    <rect x="16" y="50" width="88" height="8" rx="4" fill="#E5E5E5"/><rect x="16" y="68" width="70" height="8" rx="4" fill="#E5E5E5"/>
    <rect x="16" y="86" width="80" height="8" rx="4" fill="#E3E3FF"/><rect x="16" y="104" width="65" height="8" rx="4" fill="#E5E5E5"/>
    <rect x="16" y="122" width="75" height="8" rx="4" fill="#E5E5E5"/><rect x="16" y="140" width="60" height="8" rx="4" fill="#E5E5E5"/>
    <rect x="140" y="20" width="320" height="60" rx="12" fill="url(#hg)"/>
    <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#000091"/><stop offset="1" stopColor="#3333B0"/></linearGradient></defs>
    <text x="158" y="42" fill="rgba(255,255,255,.6)" fontSize="8" fontWeight="600">VUE D'ENSEMBLE</text>
    <text x="158" y="62" fill="#fff" fontSize="14" fontWeight="800" fontFamily="Marianne">Bonjour, Admin 👋</text>
    {/* KPI cards */}
    {[0,1,2,3].map(i => (
      <g key={i}><rect x={140+i*80} y="96" width="72" height="52" rx="8" fill="#fff" stroke="#E5E5E5"/>
      <rect x={148+i*80} y="106" width="40" height="5" rx="2" fill="#E5E5E5"/>
      <text x={148+i*80} y="132" fill="#1E1E1E" fontSize="14" fontWeight="800" fontFamily="Marianne">{['3 240','87%','45','12'][i]}</text>
      <rect x={148+i*80} y="138" width="30" height="4" rx="2" fill={['#18753C','#000091','#F3812B','#3b82f6'][i]} opacity=".3"/></g>
    ))}
    {/* Chart area */}
    <rect x="140" y="160" width="200" height="120" rx="10" fill="#fff" stroke="#E5E5E5"/>
    <path d="M160 250 L185 230 L210 240 L235 210 L260 215 L285 190 L310 200" stroke="#000091" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M160 250 L185 245 L210 248 L235 240 L260 242 L285 235 L310 238" stroke="#B60066" strokeWidth="1.5" fill="none" strokeDasharray="4 3"/>
    {/* Pie */}
    <rect x="352" y="160" width="108" height="120" rx="10" fill="#fff" stroke="#E5E5E5"/>
    <circle cx="406" cy="215" r="30" fill="none" stroke="#000091" strokeWidth="15" strokeDasharray="120 190" transform="rotate(-90 406 215)"/>
    <circle cx="406" cy="215" r="30" fill="none" stroke="#F3812B" strokeWidth="15" strokeDasharray="30 190" strokeDashoffset="-120" transform="rotate(-90 406 215)"/>
    <circle cx="406" cy="215" r="30" fill="none" stroke="#18753C" strokeWidth="15" strokeDasharray="25 190" strokeDashoffset="-150" transform="rotate(-90 406 215)"/>
    <text x="398" y="218" fill="#1E1E1E" fontSize="11" fontWeight="800" fontFamily="Marianne">480</text>
  </svg>
)

const CampusIllustration = () => (
  <svg viewBox="0 0 400 200" fill="none" style={{ width:'100%' }}>
    {/* Sky */}
    <rect width="400" height="200" fill="#E3E3FF" rx="12"/>
    {/* Sun */}
    <circle cx="340" cy="40" r="25" fill="#F3812B" opacity=".3"/>
    <circle cx="340" cy="40" r="18" fill="#F3812B" opacity=".5"/>
    {/* Ground */}
    <rect x="0" y="160" width="400" height="40" fill="#18753C" opacity=".15" rx="0"/>
    {/* Main building */}
    <rect x="120" y="70" width="160" height="90" fill="#fff" stroke="#E5E5E5" strokeWidth="1.5" rx="4"/>
    <rect x="135" y="100" width="30" height="25" fill="#E3E3FF" stroke="#c7d2fe" rx="2"/><rect x="175" y="100" width="30" height="25" fill="#E3E3FF" stroke="#c7d2fe" rx="2"/><rect x="215" y="100" width="30" height="25" fill="#E3E3FF" stroke="#c7d2fe" rx="2"/>
    <rect x="135" y="135" width="30" height="25" fill="#E3E3FF" stroke="#c7d2fe" rx="2"/><rect x="175" y="135" width="30" height="25" fill="#E3E3FF" stroke="#c7d2fe" rx="2"/><rect x="215" y="135" width="30" height="25" fill="#E3E3FF" stroke="#c7d2fe" rx="2"/>
    {/* Door */}
    <rect x="185" y="138" width="28" height="22" fill="#000091" rx="2"/>
    {/* Roof triangle */}
    <polygon points="115,70 200,35 285,70" fill="#000091" opacity=".9"/>
    <text x="200" y="58" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Marianne">UNIVERSITÉ</text>
    {/* Left tree */}
    <rect x="55" y="120" width="8" height="40" fill="#92400e" rx="2"/>
    <circle cx="59" cy="110" r="22" fill="#18753C" opacity=".6"/><circle cx="50" cy="118" r="15" fill="#18753C" opacity=".4"/>
    {/* Right tree */}
    <rect x="335" y="125" width="7" height="35" fill="#92400e" rx="2"/>
    <circle cx="338" cy="115" r="20" fill="#18753C" opacity=".5"/><circle cx="345" cy="122" r="14" fill="#18753C" opacity=".4"/>
    {/* Students walking */}
    <circle cx="90" cy="148" r="6" fill="#000091"/><rect x="87" y="154" width="6" height="12" fill="#000091" rx="2"/>
    <circle cx="105" cy="150" r="5" fill="#B60066"/><rect x="102" y="155" width="6" height="10" fill="#B60066" rx="2"/>
    <circle cx="310" cy="149" r="5.5" fill="#F3812B"/><rect x="307" y="154.5" width="6" height="11" fill="#F3812B" rx="2"/>
    {/* Flag */}
    <rect x="196" y="25" width="2" height="15" fill="#666666"/>
    <rect x="198" y="25" width="14" height="9" fill="#18753C"/>
    <rect x="198" y="25" width="5" height="9" fill="#F3812B"/>
    <rect x="207" y="25" width="5" height="9" fill="#F3812B"/>
    {/* Path */}
    <path d="M199 160 L199 200" stroke="#d1d5db" strokeWidth="20" opacity=".3"/>
  </svg>
)

const StudentsIllustration = () => (
  <svg viewBox="0 0 300 180" fill="none" style={{ width:'100%' }}>
    <rect width="300" height="180" fill="#F5F5F5" rx="12"/>
    {/* Student 1 — with laptop */}
    <circle cx="80" cy="60" r="18" fill="#000091" opacity=".15"/><circle cx="80" cy="56" r="11" fill="#000091" opacity=".3"/>
    <rect x="66" y="72" width="28" height="30" fill="#000091" opacity=".2" rx="6"/>
    <rect x="60" y="105" width="40" height="8" fill="#E5E5E5" rx="3"/>{/* laptop */}
    <rect x="62" y="95" width="36" height="12" fill="#000091" opacity=".15" rx="2"/>
    {/* Student 2 — reading */}
    <circle cx="160" cy="55" r="18" fill="#B60066" opacity=".15"/><circle cx="160" cy="51" r="11" fill="#B60066" opacity=".3"/>
    <rect x="146" y="67" width="28" height="30" fill="#B60066" opacity=".2" rx="6"/>
    <rect x="150" y="100" width="20" height="15" fill="#F3812B" opacity=".2" rx="2"/>{/* book */}
    {/* Student 3 — graduation */}
    <circle cx="230" cy="58" r="18" fill="#18753C" opacity=".15"/><circle cx="230" cy="54" r="11" fill="#18753C" opacity=".3"/>
    <rect x="216" y="70" width="28" height="30" fill="#18753C" opacity=".2" rx="6"/>
    <rect x="220" y="42" width="20" height="4" fill="#1E1E1E" opacity=".3" rx="1"/>{/* cap */}
    {/* Decorative dots */}
    {[40,80,120,160,200,240,260].map((x,i) => <circle key={i} cx={x} cy={150+Math.sin(i)*8} r="3" fill="#000091" opacity=".08"/>)}
    {/* Text */}
    <text x="150" y="170" textAnchor="middle" fill="#666666" fontSize="9" fontFamily="Marianne">6 710+ étudiants au Niger</text>
  </svg>
)

const universities = [
  { name:'Université de Niamey', country:'Niger', students:'3 240', flag:'🇳🇪', desc:'Première université du pays, 12 facultés' },
  { name:'Université de Dosso', country:'Niger', students:'1 850', flag:'🇳🇪', desc:'Pôle régional d\'excellence académique' },
  { name:'Université de Diffa', country:'Niger', students:'980', flag:'🇳🇪', desc:'Spécialisée sciences et technologies' },
  { name:'ECCAM', country:'Niger', students:'640', flag:'🇳🇪', desc:'École de commerce et management' },
]

const stats = [
  { value:'6 710+', label:'Étudiants gérés' },
  { value:'4', label:'Universités partenaires' },
  { value:'99.9%', label:'Disponibilité' },
  { value:'< 30j', label:'Déploiement' },
]

const modules = [
  { icon:'🎓', title:'Scolarité', desc:'Inscriptions, dossiers étudiants, parcours académiques, transferts et réinscriptions automatisées.', color:'#3b82f6', bg:'#eff6ff' },
  { icon:'💰', title:'Finances', desc:'Paiements Airtel Money / NITA / AMANA (Airtel, Moov), virements, suivi des impayés et relances automatiques.', color:'#18753C', bg:'#E6F0E9' },
  { icon:'📅', title:'Examens', desc:'Planification des sessions, affectation de salles, génération de convocations et PV de délibération.', color:'#F3812B', bg:'#FEF0E5' },
  { icon:'🛡️', title:"Contrôle d'accès", desc:'Badges RFID, portiques ZKTeco, monitoring temps réel des entrées/sorties sur le campus.', color:'#B60066', bg:'#fdf2f8' },
  { icon:'📊', title:'Analytics & Rapports', desc:"Tableaux de bord en temps réel, export PDF/Excel, indicateurs de performance par filière.", color:'#000091', bg:'#E3E3FF' },
  { icon:'📄', title:'Documents', desc:'Bulletins de notes, attestations de scolarité, relevés de paiement générés en un clic.', color:'#6E445A', bg:'#faf5ff' },
]

// beforeAfter data moved to SliderAvantApres component

const testimonials = [
  { name:'Pr. Moussa Abdou', role:'Vice-Recteur, Université de Niamey', text:'Optimus Campus a transformé notre gestion administrative. Nous avons réduit les délais d\'inscription de 3 jours à 15 minutes.' },
  { name:'Mme Aïchatou Issoufou', role:'Directrice Scolarité, ECCAM', text:'Le suivi des paiements en temps réel nous a permis de récupérer 40% d\'impayés supplémentaires dès le premier semestre.' },
  { name:'Dr. Ibrahim Sani', role:'DSI, Université de Dosso', text:'Le déploiement a pris moins de 3 semaines. L\'équipe technique d\'Optimus nous a accompagnés du début à la fin.' },
]

const S = {
  nav: { position:'fixed',top:0,left:0,right:0,zIndex:100,height:64,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 5%',background:'rgba(255,255,255,.92)',backdropFilter:'blur(14px)',borderBottom:'1px solid rgba(226,232,240,.6)',transition:'all .3s' },
  hero: { minHeight:'100vh',display:'flex',alignItems:'center',padding:'100px 5% 80px',background:'linear-gradient(165deg, #F5F5F5 0%, #E3E3FF 35%, #f0f9ff 70%, #F5F5F5 100%)',position:'relative',overflow:'hidden' },
  inner: { maxWidth:1200,margin:'0 auto',width:'100%' },
  sec: { padding:'100px 5%' },
  secWhite: { padding:'100px 5%',background:'#fff' },
  secDark: { padding:'100px 5%',background:'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',color:'#fff' },
  tag: { display:'inline-flex',alignItems:'center',gap:6,background:'#E3E3FF',border:'1px solid rgba(99,102,241,.15)',color:'#000091',padding:'6px 16px',borderRadius:100,fontSize:'.75rem',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:24 },
  h2: { fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'clamp(1.6rem,3.5vw,2.4rem)',color:'#1E1E1E',lineHeight:1.15,letterSpacing:'-.02em',marginBottom:14 },
  sub: { fontSize:'1rem',color:'#666666',lineHeight:1.7,maxWidth:560 },
}


function SliderAvantApres() {
  const [pos, setPos] = useState(50)
  const avant = [
    { icon: '📋', label: 'Inscriptions papier', detail: 'Files d\'attente de 3h, dossiers perdus, doublons' },
    { icon: '📝', label: 'Notes sur cahier', detail: 'Publication 3 semaines après l\'examen, erreurs de transcription' },
    { icon: '💰', label: 'Paiements non tracés', detail: 'Reçus manuels, 35% d\'impayés non détectés, fraudes possibles' },
    { icon: '🚪', label: 'Accès libre', detail: 'Aucun contrôle à l\'entrée du campus ni aux salles d\'examen' },
  ]
  const apres = [
    { icon: '⚡', label: 'Inscription en 5 min', detail: 'Import CSV, vérification auto, 0 doublon, boursier/non-boursier' },
    { icon: '🏆', label: 'Notes instantanées', detail: 'Calcul auto, délibération jury, publication + email en 1 clic' },
    { icon: '💳', label: '87% de recouvrement', detail: 'Échéancier auto, Airtel Money, badge bloqué si impayé > 60j' },
    { icon: '🛡️', label: 'Contrôle total', detail: 'Badge RFID, portique, vérification paiement + convocation examen' },
  ]
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
      <input type="range" min={0} max={100} value={pos}
        onChange={e => setPos(Number(e.target.value))}
        aria-label="Comparer avant et après Optimus Campus"
        style={{ width: '100%', marginBottom: 24, accentColor: '#000091', cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14, fontWeight: 700 }}>
        <span style={{ color: '#E10600' }}>❌ Avant Optimus</span>
        <span style={{ color: '#18753C' }}>✅ Après Optimus</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, overflow: 'hidden', borderRadius: 16, border: '1px solid #E5E5E5' }}>
        {/* AVANT */}
        <div style={{ background: '#FEE8E7', padding: 24, opacity: pos < 50 ? 1 : 0.3 + (100 - pos) / 100 * 0.7, transition: 'opacity .3s' }}>
          {avant.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'start' }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1E1E1E' }}>{item.label}</div>
                <div style={{ fontSize: 13, color: '#666666', lineHeight: 1.5 }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
        {/* APRÈS */}
        <div style={{ background: '#E6F0E9', padding: 24, opacity: pos > 50 ? 1 : 0.3 + pos / 100 * 0.7, transition: 'opacity .3s' }}>
          {apres.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'start' }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1E1E1E' }}>{item.label}</div>
                <div style={{ fontSize: 13, color: '#18753C', lineHeight: 1.5 }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <>
      <Navbar />

            {/* ══════ HERO ══════ */}
      <section style={S.hero}>
        <div style={{ position:'absolute',top:'5%',right:'15%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle, rgba(99,102,241,.06) 0%, transparent 70%)' }} />
        <div style={{ position:'absolute',bottom:'10%',left:'5%',width:250,height:250,borderRadius:'50%',background:'radial-gradient(circle, rgba(14,184,166,.04) 0%, transparent 70%)' }} />

        <div style={{ ...S.inner, display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
          <div style={{ position:'relative',zIndex:1 }}>
            <div style={S.tag}>✦ ERP Universitaire — Made in Niger 🇳🇪</div>
            <h1 style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'clamp(2rem,4.5vw,3.2rem)',color:'#1E1E1E',lineHeight:1.08,marginBottom:24,letterSpacing:'-.03em' }}>
              La plateforme qui<br/><span style={{ color:'#000091' }}>digitalise votre campus.</span>
            </h1>
            <p style={{ fontSize:'1.05rem',color:'#666666',lineHeight:1.7,maxWidth:480,marginBottom:36 }}>
              Scolarité, finances, examens, contrôle d'accès — tout dans une seule plateforme cloud. 
              Déjà adopté par <strong style={{ color:'#1E1E1E' }}>6 universités</strong> et <strong style={{ color:'#1E1E1E' }}>6 700+ étudiants</strong> au Niger.
            </p>
            <div style={{ display:'flex',gap:12,flexWrap:'wrap',marginBottom:40 }}>
              <Link to="/login" style={{ background:'#000091',color:'#fff',borderRadius:12,padding:'14px 32px',fontSize:'1rem',fontWeight:700,textDecoration:'none',boxShadow:'0 4px 16px rgba(99,102,241,.3)',display:'flex',alignItems:'center',gap:8,transition:'all .2s' }}>
                Accéder à la démo →
              </Link>
              <a href="#contact" style={{ background:'#fff',color:'#1E1E1E',border:'1.5px solid #E5E5E5',borderRadius:12,padding:'14px 28px',fontSize:'1rem',fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:8 }}>
                Planifier un appel
              </a>
            </div>
            <div style={{ display:'flex',gap:20,alignItems:'center' }}>
              <div style={{ display:'flex' }}>
                {['ML','AD','IS','FK'].map((a,i) => (
                  <div key={i} style={{ width:32,height:32,borderRadius:'50%',background:['#000091','#18753C','#F3812B','#B60066'][i],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.6rem',fontWeight:800,color:'#fff',border:'2px solid #fff',marginLeft:i?-8:0 }}>{a}</div>
                ))}
              </div>
              <div style={{ fontSize:'.82rem',color:'#666666' }}>
                <strong style={{ color:'#1E1E1E' }}>400+ administrateurs</strong> nous font confiance
              </div>
            </div>
          </div>

          <div style={{ position:'relative' }}>
            <div style={{ borderRadius:20,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.08)',border:'1px solid #E5E5E5',background:'#fff' }}>
              <DashboardIllustration />
            </div>
            {/* Floating badge */}
            <div style={{ position:'absolute',bottom:-16,left:-16,background:'#fff',borderRadius:14,padding:'12px 18px',boxShadow:'0 8px 24px rgba(0,0,0,.08)',border:'1px solid #E5E5E5',display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:'#E6F0E9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem' }}>✅</div>
              <div><div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'.85rem',color:'#1E1E1E' }}>Déploiement en 30 jours</div><div style={{ fontSize:'.72rem',color:'#666666' }}>Accompagnement inclus</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ STATS BAR ══════ */}
      <div style={{ display:'flex',justifyContent:'center',flexWrap:'wrap',background:'#fff',borderBottom:'1px solid #F0F0F0',borderTop:'1px solid #F0F0F0' }}>
        {stats.map((s,i) => (
          <div key={i} style={{ padding:'32px 52px',textAlign:'center',borderRight:i<stats.length-1?'1px solid #F0F0F0':'none' }}>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1.9rem',color:'#000091' }}>{s.value}</div>
            <div style={{ fontSize:'.8rem',color:'#666666',marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══════ AVANT / APRÈS ══════ */}
      <section id="solution" style={S.sec}>
        <Section style={S.inner}>
          <div style={{ textAlign:'center',marginBottom:32 }}>
            <span style={{ display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:13,fontWeight:500,background:'#E3E3FF',color:'#000091',marginBottom:12 }}>La transformation</span>
            <h2 style={{ ...S.h2, maxWidth:700, margin:'0 auto 14px' }}>Avant Optimus vs. Après Optimus</h2>
            <p style={{ fontSize:'1rem',color:'#666666',maxWidth:500,margin:'0 auto' }}>Faites glisser pour voir la différence</p>
          </div>
          <SliderAvantApres />
        </Section>
      </section>

      {/* ══════ MODULES ══════ */}
      <section id="modules" style={S.secWhite}>
        <div style={S.inner}>
          <Section style={{ textAlign:'center',marginBottom:56 }}>
            <div style={S.tag}>✦ Modules</div>
            <h2 style={{ ...S.h2, maxWidth:600, margin:'0 auto 14px' }}>Tout ce dont votre campus a besoin</h2>
            <p style={{ ...S.sub, maxWidth:520, margin:'0 auto' }}>Activez uniquement les modules nécessaires. Chaque brique est intégrée nativement.</p>
          </Section>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:20,maxWidth:960,margin:'0 auto' }}>
            {modules.map((m,i) => (
              <Section key={i} delay={i * 0.08} style={{
                background:'#fff',border:'1px solid #E5E5E5',borderRadius:18,padding:'32px 28px',
                borderLeft:`4px solid ${m.color}`,cursor:'default',transition:'all .25s'
              }}>
                <div style={{ width:52,height:52,borderRadius:14,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',marginBottom:18 }}>{m.icon}</div>
                <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'1.05rem',color:'#1E1E1E',marginBottom:8 }}>{m.title}</div>
                <div style={{ fontSize:'.88rem',color:'#666666',lineHeight:1.65 }}>{m.desc}</div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ UNIVERSITÉS PARTENAIRES ══════ */}
      <section id="universites" style={S.sec}>
        <div style={S.inner}>
          <Section style={{ textAlign:'center',marginBottom:56 }}>
            <div style={S.tag}>✦ Nos universités partenaires</div>
            <h2 style={{ ...S.h2, maxWidth:600, margin:'0 auto 14px' }}>Ils nous font confiance</h2>
            <p style={{ ...S.sub, maxWidth:520, margin:'0 auto' }}>Des établissements de premier plan au Niger.</p>
          </Section>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:18,maxWidth:960,margin:'0 auto' }}>
            {universities.map((u,i) => (
              <Section key={i} delay={i * 0.06} style={{
                background:'#fff',border:'1px solid #E5E5E5',borderRadius:16,padding:'24px 28px',
                display:'flex',alignItems:'center',gap:16,transition:'all .2s'
              }}>
                <div style={{ width:48,height:48,borderRadius:12,background:'#E3E3FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',flexShrink:0 }}>{u.flag}</div>
                <div>
                  <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.92rem',color:'#1E1E1E',marginBottom:2 }}>{u.name}</div>
                  <div style={{ fontSize:'.78rem',color:'#666666' }}>{u.students} étudiants · {u.desc}</div>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ TÉMOIGNAGES ══════ */}
      <section id="temoignages" style={S.secWhite}>
        <div style={S.inner}>
          <Section style={{ textAlign:'center',marginBottom:56 }}>
            <div style={S.tag}>✦ Témoignages</div>
            <h2 style={{ ...S.h2, maxWidth:500, margin:'0 auto 14px' }}>Ce qu'ils en disent</h2>
          </Section>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:20,maxWidth:1000,margin:'0 auto' }}>
            {testimonials.map((t,i) => (
              <Section key={i} delay={i * 0.1} style={{
                background:'#F5F5F5',borderRadius:18,padding:'32px 28px',
                borderLeft:'4px solid #000091',position:'relative'
              }}>
                <div style={{ fontSize:'2.5rem',color:'#000091',opacity:.15,position:'absolute',top:16,right:20,fontFamily:'serif',lineHeight:1 }}>"</div>
                <p style={{ fontSize:'.9rem',color:'#666666',lineHeight:1.7,marginBottom:20,fontStyle:'italic' }}>"{t.text}"</p>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:10,background:'#000091',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.75rem',fontWeight:800,color:'#fff' }}>
                    {t.name.split(' ').map(w => w[0]).slice(0,2).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight:700,fontSize:'.85rem',color:'#1E1E1E' }}>{t.name}</div>
                    <div style={{ fontSize:'.75rem',color:'#666666' }}>{t.role}</div>
                  </div>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section id="contact" style={S.secDark}>
        <Section style={{ maxWidth:700,margin:'0 auto',textAlign:'center' }}>
          <div style={{ ...S.tag, background:'rgba(99,102,241,.15)', border:'1px solid rgba(99,102,241,.3)', color:'#a5b4fc' }}>✦ Prêt à commencer ?</div>
          <h2 style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'clamp(1.6rem,3.5vw,2.4rem)',color:'#fff',lineHeight:1.15,letterSpacing:'-.02em',marginBottom:16 }}>
            Transformez la gestion de<br/>votre campus en 30 jours
          </h2>
          <p style={{ fontSize:'1rem',color:'rgba(255,255,255,.6)',lineHeight:1.7,maxWidth:480,margin:'0 auto 36px' }}>
            Démo personnalisée, déploiement accompagné, formation de vos équipes. Sans engagement.
          </p>
          <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
            <a href="mailto:contact@optimus-campus.com" style={{ background:'#000091',color:'#fff',borderRadius:12,padding:'14px 32px',fontSize:'1rem',fontWeight:700,textDecoration:'none',boxShadow:'0 4px 16px rgba(99,102,241,.4)' }}>
              Demander une démo →
            </a>
            <a href="mailto:contact@optimus-campus.com" style={{ background:'transparent',color:'#fff',border:'1.5px solid rgba(255,255,255,.2)',borderRadius:12,padding:'14px 28px',fontSize:'1rem',fontWeight:600,textDecoration:'none' }}>
              Nous contacter
            </a>
          </div>
        </Section>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer style={{ padding:'48px 5%',borderTop:'1px solid #F0F0F0',background:'#fff' }}>
        <div style={{ ...S.inner, display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:40 }}>
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
              <div style={{ width:32,height:32,borderRadius:8,background:'#000091',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'.7rem',color:'#fff' }}>OC</div>
              <span style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1rem',color:'#1E1E1E' }}>Optimus Campus</span>
            </div>
            <p style={{ fontSize:'.85rem',color:'#666666',lineHeight:1.6,maxWidth:280 }}>
              ERP universitaire SaaS conçu au Niger pour les établissements d'enseignement supérieur nigériens.
            </p>
          </div>
          {[
            { title:'Produit', links:['Solution','Modules','Sécurité','API'] },
            { title:'Ressources', links:['Documentation','Support','Blog','FAQ'] },
            { title:'Entreprise', links:['À propos','Contact','Mentions légales','Confidentialité'] },
          ].map((col,i) => (
            <div key={i}>
              <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'.85rem',color:'#1E1E1E',marginBottom:16 }}>{col.title}</div>
              {col.links.map(l => (
                <div key={l} style={{ fontSize:'.85rem',color:'#666666',marginBottom:10,cursor:'pointer' }}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid #F0F0F0',paddingTop:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12 }}>
          <span style={{ fontSize:'.82rem',color:'#666666' }}>© 2026 Optimus Campus. Tous droits réservés.</span>
          <span style={{ fontSize:'.82rem',color:'#666666' }}>Conçu au Niger 🇳🇪 pour le Niger</span>
        </div>
      </footer>

      {/* ══════ RESPONSIVE + ANIMATIONS ══════ */}
      <style>{`
        @media(max-width:900px) {
          .nav-links { display:none !important; }
          section > div > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
        @media(max-width:768px) {
          section > div > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          footer > div > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
