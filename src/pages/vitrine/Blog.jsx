import { useState } from 'react'
import { Link } from 'react-router-dom'

const P = { p: '#000091', pl: '#E3E3FF', ink: '#1E1E1E', sl: '#666666', bg: '#F5F5F5', bd: '#E5E5E5', g: '#18753C', gb: '#E6F0E9', r: '#E10600' }

function Illustration({ type }) {
  if (type === 'digital') return (
    <svg viewBox="0 0 600 200" style={{ width: '100%', borderRadius: 12, background: `linear-gradient(135deg, ${P.pl} 0%, #fff 100%)` }}>
      <rect x="20" y="30" width="160" height="140" rx="12" fill={P.p} opacity=".1" stroke={P.p} strokeWidth="2" />
      <text x="100" y="70" textAnchor="middle" fill={P.p} fontWeight="700" fontSize="14">Avant</text>
      <text x="100" y="95" textAnchor="middle" fill={P.sl} fontSize="11">📋 Papier</text>
      <text x="100" y="115" textAnchor="middle" fill={P.sl} fontSize="11">📝 Cahiers</text>
      <text x="100" y="135" textAnchor="middle" fill={P.sl} fontSize="11">🕐 3 semaines</text>
      <path d="M 200 100 L 260 100" stroke={P.p} strokeWidth="3" markerEnd="url(#arrow)" />
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill={P.p} /></marker></defs>
      <rect x="280" y="30" width="160" height="140" rx="12" fill={P.g} opacity=".1" stroke={P.g} strokeWidth="2" />
      <text x="360" y="70" textAnchor="middle" fill={P.g} fontWeight="700" fontSize="14">Après</text>
      <text x="360" y="95" textAnchor="middle" fill={P.ink} fontSize="11">⚡ En ligne</text>
      <text x="360" y="115" textAnchor="middle" fill={P.ink} fontSize="11">🎯 Automatisé</text>
      <text x="360" y="135" textAnchor="middle" fill={P.ink} fontSize="11">✓ Instantané</text>
      <text x="510" y="60" fill={P.p} fontWeight="700" fontSize="28">-80%</text>
      <text x="510" y="85" fill={P.sl} fontSize="12">temps de</text>
      <text x="510" y="100" fill={P.sl} fontSize="12">traitement</text>
      <text x="510" y="135" fill={P.g} fontWeight="700" fontSize="28">+15pts</text>
      <text x="510" y="155" fill={P.sl} fontSize="12">recouvrement</text>
    </svg>
  )
  if (type === 'lmd') return (
    <svg viewBox="0 0 600 180" style={{ width: '100%', borderRadius: 12, background: `linear-gradient(135deg, ${P.pl} 0%, #fff 100%)` }}>
      {[['L1', 30, 0], ['L2', 30, 1], ['L3', 30, 2], ['M1', 60, 3], ['M2', 60, 4], ['D', 90, 5]].map(([label, credits, i]) => (
        <g key={i}>
          <rect x={20 + i * 96} y="40" width="80" height="60" rx="8" fill={i < 3 ? P.p : i < 5 ? '#7c3aed' : P.g} opacity=".15" stroke={i < 3 ? P.p : i < 5 ? '#7c3aed' : P.g} strokeWidth="2" />
          <text x={60 + i * 96} y="70" textAnchor="middle" fill={P.ink} fontWeight="700" fontSize="16">{label}</text>
          <text x={60 + i * 96} y="90" textAnchor="middle" fill={P.sl} fontSize="11">{credits} ECTS/sem</text>
          {i < 5 && <path d={`M ${108 + i * 96} 70 L ${116 + i * 96} 70`} stroke={P.bd} strokeWidth="2" />}
        </g>
      ))}
      <text x="20" y="130" fill={P.p} fontWeight="700" fontSize="13">Licence (180 ECTS)</text>
      <rect x="20" y="135" width="272" height="4" rx="2" fill={P.p} opacity=".3" />
      <text x="308" y="130" fill="#7c3aed" fontWeight="700" fontSize="13">Master (120)</text>
      <rect x="308" y="135" width="176" height="4" rx="2" fill="#7c3aed" opacity=".3" />
      <text x="500" y="130" fill={P.g} fontWeight="700" fontSize="13">Doctorat</text>
      <rect x="500" y="135" width="80" height="4" rx="2" fill={P.g} opacity=".3" />
      <text x="300" y="170" textAnchor="middle" fill={P.sl} fontSize="12">Système LMD — Conformité UEMOA / Niger</text>
    </svg>
  )
  if (type === 'access') return (
    <svg viewBox="0 0 600 200" style={{ width: '100%', borderRadius: 12, background: `linear-gradient(135deg, ${P.pl} 0%, #fff 100%)` }}>
      {[['🎓', 'Inscription', 20], ['💳', 'Paiement', 140], ['🪪', 'Badge actif', 260], ['🛡️', 'Portique', 380], ['📋', 'Examen', 500]].map(([icon, label, x], i) => (
        <g key={i}>
          <rect x={x} y="50" width="100" height="70" rx="10" fill="#fff" stroke={P.p} strokeWidth="2" />
          <text x={x + 50} y="80" textAnchor="middle" fontSize="24">{icon}</text>
          <text x={x + 50} y="105" textAnchor="middle" fill={P.ink} fontWeight="600" fontSize="11">{label}</text>
          {i < 4 && <path d={`M ${x + 104} 85 L ${x + 136} 85`} stroke={P.g} strokeWidth="2" markerEnd="url(#garr)" />}
        </g>
      ))}
      <defs><marker id="garr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill={P.g} /></marker></defs>
      <rect x="140" y="140" width="320" height="40" rx="8" fill={P.r} opacity=".1" stroke={P.r} strokeWidth="1.5" strokeDasharray="6" />
      <text x="300" y="160" textAnchor="middle" fill={P.r} fontWeight="700" fontSize="12">⚠️ Impayé &gt; 60j → Badge bloqué → Portique refuse → Examen refuse</text>
      <text x="300" y="178" textAnchor="middle" fill={P.g} fontWeight="600" fontSize="11">✓ Paiement confirmé → Tout se rouvre automatiquement</text>
    </svg>
  )
  return null
}

const articles = [
  {
    id: 1, slug: 'digitalisation-universites-niger', illustration: 'digital',
    title: 'Pourquoi digitaliser la gestion universitaire au Niger en 2026',
    date: '15 Mars 2026', readTime: '5 min', category: 'Transformation',
    excerpt: 'Les universités nigériennes gèrent encore des milliers de dossiers étudiants avec des processus manuels. La digitalisation réduit les erreurs, accélère les inscriptions et apporte une transparence totale.',
    content: [
      { type: 'text', value: 'Le Niger compte plus de 50 000 étudiants dans l\'enseignement supérieur, répartis entre universités publiques et instituts privés. La gestion manuelle génère des files d\'attente interminables, des erreurs de saisie sur les relevés, des retards de publication et une opacité sur le recouvrement des frais.' },
      { type: 'image', value: 'digital' },
      { type: 'text', value: 'Un ERP universitaire centralise toutes ces opérations. L\'inscription se fait en ligne, les notes sont saisies par les enseignants et publiées après délibération, les paiements sont tracés en FCFA avec les méthodes locales (Airtel Money, NITA, AMANA).' },
      { type: 'text', value: 'Le retour sur investissement est mesurable dès le premier semestre : réduction de 80% du temps de traitement des inscriptions, taux de recouvrement en hausse de 15 points grâce aux alertes automatiques, et zéro erreur de transcription sur les notes.' },
    ],
  },
  {
    id: 2, slug: 'systeme-lmd-niger', illustration: 'lmd',
    title: 'Le système LMD au Niger : enjeux et mise en œuvre numérique',
    date: '8 Mars 2026', readTime: '4 min', category: 'Académique',
    excerpt: 'Le système Licence-Master-Doctorat structure l\'enseignement supérieur nigérien. Sa mise en œuvre numérique nécessite une gestion rigoureuse des semestres, des crédits ECTS et des parcours.',
    content: [
      { type: 'text', value: 'Le système LMD, adopté conformément aux directives de l\'UEMOA, organise les études en trois cycles : Licence (6 semestres, 180 crédits ECTS), Master (4 semestres, 120 crédits) et Doctorat (6 à 10 semestres).' },
      { type: 'image', value: 'lmd' },
      { type: 'text', value: 'La gestion numérique implique la structuration par semestres (S1 à S6 pour la Licence, S1 à S4 pour le Master), le calcul automatique des moyennes pondérées par crédits, la gestion des rattrapages et le suivi du parcours de chaque étudiant sur plusieurs années.' },
      { type: 'text', value: 'Optimus Campus intègre nativement le référentiel LMD : auto-création des 10 semestres lors de la configuration d\'une année académique, calcul automatique (note finale = CC × 0.4 + Examen × 0.6), et frise chronologique du parcours de L1 au Doctorat.' },
    ],
  },
  {
    id: 3, slug: 'securite-campus-controle-acces', illustration: 'access',
    title: 'Sécuriser un campus : du badge RFID au contrôle d\'accès examen',
    date: '1er Mars 2026', readTime: '6 min', category: 'Sécurité',
    excerpt: 'La liaison entre le statut financier de l\'étudiant et son badge d\'accès permet d\'automatiser le recouvrement. C\'est la killer feature d\'Optimus Campus.',
    content: [
      { type: 'text', value: 'Les campus universitaires au Niger accueillent des milliers d\'étudiants quotidiennement. Sans système de contrôle, impossible de savoir qui est présent, de vérifier les autorisations lors des examens, ou de gérer les impayés efficacement.' },
      { type: 'image', value: 'access' },
      { type: 'text', value: 'Optimus Campus propose une chaîne complète : chaque étudiant reçoit un badge RFID à l\'inscription. Ce badge est lié à son dossier financier. Quand un étudiant accumule plus de 60 jours d\'impayé, son badge est automatiquement bloqué par un trigger SQL.' },
      { type: 'text', value: 'Le portique d\'entrée refuse l\'accès. Lors d\'un examen, le surveillant scanne le badge et le système vérifie en cascade : convocation valide, paiement à jour, badge actif. Dès que l\'étudiant régularise (paiement confirmé), le badge est automatiquement débloqué.' },
    ],
  },
]

export default function Blog() {
  const [selected, setSelected] = useState(null)

  if (selected) {
    const a = articles.find(x => x.id === selected)
    return (
      <div style={{ padding: '48px 24px', maxWidth: 720, margin: '0 auto', fontFamily: "'Marianne','Roboto',sans-serif" }}>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: P.p, fontSize: 14, cursor: 'pointer', marginBottom: 24, textDecoration: 'underline', textUnderlineOffset: 4 }}>← Retour aux articles</button>
        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: P.pl, color: P.p, marginBottom: 12 }}>{a.category}</span>
        <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>{a.title}</h1>
        <div style={{ fontSize: 14, color: P.sl, marginBottom: 32 }}>{a.date} · {a.readTime} de lecture · Numatech Services</div>
        {a.content.map((block, i) => (
          block.type === 'image' 
            ? <div key={i} style={{ margin: '28px 0' }}><Illustration type={block.value} /></div>
            : <p key={i} style={{ fontSize: 16, lineHeight: 1.8, color: P.ink, marginBottom: 20 }}>{block.value}</p>
        ))}
        <div style={{ borderTop: `1px solid ${P.bd}`, marginTop: 32, paddingTop: 24 }}>
          <Link to="/contact" style={{ color: P.p, fontWeight: 600, fontSize: 15, textDecoration: 'underline', textUnderlineOffset: 4 }}>
            Vous souhaitez digitaliser votre université ? Contactez-nous →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '48px 24px', maxWidth: 800, margin: '0 auto', fontFamily: "'Marianne','Roboto',sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Blog Numatech</h1>
      <p style={{ color: P.sl, marginBottom: 32, fontSize: 15 }}>Actualités et retours d'expérience sur la gestion universitaire au Niger.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {articles.map(a => (
          <div key={a.id} onClick={() => setSelected(a.id)} style={{
            background: P.w, border: `1px solid ${P.bd}`, borderRadius: 16,
            overflow: 'hidden', cursor: 'pointer',
          }}>
            <div style={{ padding: '4px 4px 0' }}>
              <Illustration type={a.illustration} />
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: P.pl, color: P.p }}>{a.category}</span>
                <span style={{ fontSize: 13, color: P.sl }}>{a.date} · {a.readTime}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: P.ink, marginBottom: 8, lineHeight: 1.3 }}>{a.title}</h2>
              <p style={{ fontSize: 14, color: P.sl, lineHeight: 1.6, marginBottom: 12 }}>{a.excerpt}</p>
              <span style={{ fontSize: 14, color: P.p, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 4 }}>Lire l'article →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
