import Navbar from './Navbar'
import { Link } from 'react-router-dom'

const values = [
  { icon: '🎯', title: 'Souveraineté numérique', desc: 'Nous croyons que l\'Afrique doit construire ses propres outils. Optimus Campus est conçu au Niger, pour le Niger.' },
  { icon: '🔒', title: 'Sécurité sans compromis', desc: 'Authentification forte, chiffrement, RLS par tenant, TOTP 2FA. Vos données ne quittent jamais votre contrôle.' },
  { icon: '⚡', title: 'Performance locale', desc: 'Optimisé pour les connexions 3G/4G nigériennes. Cache offline, lazy loading, assets légers.' },
  { icon: '🤝', title: 'Accompagnement terrain', desc: 'Déploiement en 30 jours, formation des équipes sur site, support continu en français.' },
]

const timeline = [
  { year: '2024', event: 'Création de Numatech Services à Niamey' },
  { year: '2025', event: 'Développement d\'Optimus Campus — Version 1.0' },
  { year: '2026', event: 'Lancement avec 4 universités partenaires au Niger' },
  { year: '2027', event: 'Objectif : 10 établissements — expansion Afrique de l\'Ouest' },
]

export default function About() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 64 }}>
        {/* Hero */}
        <section style={{ padding: '80px 5%', background: 'linear-gradient(165deg, #F5F5F5, #E3E3FF 50%)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', background: '#E3E3FF', border: '1px solid rgba(99,102,241,.15)', padding: '6px 16px', borderRadius: 100, fontSize: '.75rem', fontWeight: 700, color: '#000091', marginBottom: 20, letterSpacing: '.06em', textTransform: 'uppercase' }}>✦ Notre histoire</div>
          <h1 style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1E1E1E', marginBottom: 16, letterSpacing: '-.02em' }}>Numatech Services</h1>
          <p style={{ fontSize: '1.05rem', color: '#666666', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>Entreprise nigérienne spécialisée dans la transformation digitale de l'enseignement supérieur.</p>
        </section>

        {/* Mission */}
        <section style={{ padding: '80px 5%', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#1E1E1E', marginBottom: 16 }}>Notre mission</h2>
              <p style={{ fontSize: '.95rem', color: '#666666', lineHeight: 1.8, marginBottom: 16 }}>
                Nous avons créé Optimus Campus parce que les universités nigériennes méritent des outils modernes. Pas des solutions importées et inadaptées — mais une plateforme conçue ici, qui comprend les réalités du terrain.
              </p>
              <p style={{ fontSize: '.95rem', color: '#666666', lineHeight: 1.8 }}>
                Inscriptions papier, files d'attente, notes affichées au tableau, paiements en espèces sans traçabilité — nous avons vécu ces problèmes. Optimus Campus est notre réponse.
              </p>
            </div>
            <div style={{ background: '#fff', borderRadius: 20, padding: 32, border: '1px solid #E5E5E5', boxShadow: '0 8px 32px rgba(0,0,0,.04)' }}>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#1E1E1E', marginBottom: 20 }}>En chiffres</div>
              {[
                ['6 710+', 'Étudiants gérés'],
                ['4', 'Universités partenaires'],
                ['8', 'Rôles utilisateurs'],
                ['31', 'Tables Supabase'],
                ['< 30j', 'Déploiement moyen'],
              ].map(([v, l], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 4 ? '1px solid #F0F0F0' : 'none' }}>
                  <span style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#000091' }}>{v}</span>
                  <span style={{ fontSize: '.88rem', color: '#666666' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Valeurs */}
        <section style={{ padding: '80px 5%', background: '#fff' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#1E1E1E', marginBottom: 12 }}>Nos valeurs</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              {values.map((v, i) => (
                <div key={i} style={{ background: '#F5F5F5', borderRadius: 16, padding: 28, textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 14 }}>{v.icon}</div>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.95rem', color: '#1E1E1E', marginBottom: 8 }}>{v.title}</div>
                  <p style={{ fontSize: '.85rem', color: '#666666', lineHeight: 1.6 }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section style={{ padding: '80px 5%' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#1E1E1E', marginBottom: 32, textAlign: 'center' }}>Notre parcours</h2>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'flex-start' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#E3E3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '.85rem', color: '#000091', flexShrink: 0 }}>{t.year}</div>
                <div style={{ paddingTop: 4 }}>
                  <p style={{ fontSize: '.95rem', color: '#1E1E1E', fontWeight: 500, lineHeight: 1.6 }}>{t.event}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '60px 5%', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', textAlign: 'center', color: '#fff' }}>
          <h2 style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.8rem', marginBottom: 16 }}>Travaillons ensemble</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', marginBottom: 24 }}>Contactez-nous pour une démo personnalisée</p>
          <Link to="/contact" style={{ display: 'inline-block', background: '#000091', color: '#fff', borderRadius: 12, padding: '14px 32px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none' }}>Nous contacter →</Link>
        </section>

        <footer style={{ padding: '36px 5%', borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', color: '#666666', fontSize: '.82rem' }}>
          <span>© 2026 Optimus Campus — Numatech Services</span>
          <span>Conçu au Niger 🇳🇪</span>
        </footer>
      </div>
    </>
  )
}
