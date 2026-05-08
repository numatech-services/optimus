import { Link } from 'react-router-dom'

const P = { p: '#000091', pl: '#E3E3FF', ink: '#1E1E1E', sl: '#666666', bg: '#F5F5F5', w: '#FFFFFF', bd: '#E5E5E5', g: '#18753C', gb: '#E6F0E9' }

function Section({ children, bg, id }) {
  return <section id={id} style={{ padding: '64px 24px', background: bg || P.w }}><div style={{ maxWidth: 960, margin: '0 auto' }}>{children}</div></section>
}

function SectionTitle({ badge, title, sub }) {
  return <div style={{ textAlign: 'center', marginBottom: 48 }}>
    {badge && <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: P.pl, color: P.p, marginBottom: 12 }}>{badge}</span>}
    <h2 style={{ fontSize: 28, fontWeight: 700, color: P.ink, lineHeight: 1.3 }}>{title}</h2>
    {sub && <p style={{ fontSize: 16, color: P.sl, marginTop: 12, maxWidth: 600, margin: '12px auto 0' }}>{sub}</p>}
  </div>
}

function ImagePlaceholder({ label, h = 280, icon = '🏫' }) {
  return <div style={{ background: `linear-gradient(135deg, ${P.p}15 0%, ${P.pl} 100%)`, borderRadius: 16, height: h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px solid ${P.bd}` }}>
    <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: P.p }}>{label}</div>
  </div>
}

function FeatureCard({ icon, title, desc }) {
  return <div style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, padding: 28 }}>
    <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontWeight: 700, fontSize: 17, color: P.ink, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 14, color: P.sl, lineHeight: 1.6 }}>{desc}</div>
  </div>
}

function Stat({ value, label }) {
  return <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 36, fontWeight: 700, color: P.p }}>{value}</div>
    <div style={{ fontSize: 14, color: P.sl, marginTop: 4 }}>{label}</div>
  </div>
}

export default function Solutions() {
  return (
    <div style={{ fontFamily: "'Marianne','Roboto',sans-serif" }}>

      {/* HERO */}
      <Section bg={P.w}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: P.pl, color: P.p, marginBottom: 16 }}>Solutions ERP Universitaire</span>
            <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.3, color: P.ink, marginBottom: 16 }}>
              Chaque acteur de votre université mérite un outil à la hauteur.
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: P.sl, marginBottom: 28 }}>
              Du recteur à l'étudiant, de l'agent de scolarité au bibliothécaire — Optimus Campus
              s'adapte à chaque rôle avec des interfaces dédiées, sécurisées et interconnectées.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', borderRadius: 8, background: P.p, color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Demander une démonstration →</Link>
              <a href="#admin" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', borderRadius: 8, border: `1px solid ${P.bd}`, color: P.ink, fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>Voir les interfaces</a>
            </div>
          </div>
          <ImagePlaceholder label="Tableau de bord administrateur" icon="📊" h={340} />
        </div>
      </Section>

      {/* CHIFFRES */}
      <div style={{ display: 'flex', borderTop: `1px solid ${P.bd}`, borderBottom: `1px solid ${P.bd}`, padding: '32px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 48, justifyContent: 'center', flex: 1 }}>
          <Stat value="8" label="Rôles utilisateurs" />
          <Stat value="67" label="Interfaces dédiées" />
          <Stat value="53" label="Modules de données" />
          <Stat value="100%" label="Adapté au Niger" />
        </div>
      </div>

      {/* POUR LES DIRIGEANTS */}
      <Section id="admin">
        <SectionTitle badge="Pour les dirigeants" title="Pilotez votre université en temps réel" sub="Le dashboard administrateur centralise toutes les données : effectifs, finances, examens, accès campus." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <ImagePlaceholder label="KPIs : étudiants, revenus FCFA, taux de recouvrement" icon="📈" h={260} />
          <ImagePlaceholder label="Répartition par sexe, niveau, âge" icon="📊" h={260} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <FeatureCard icon="📊" title="Vue 360° en temps réel" desc="Effectifs, revenus en FCFA, taux de recouvrement, parité homme/femme — tout en un coup d'œil." />
          <FeatureCard icon="🏛️" title="Structure académique" desc="Facultés, départements, filières, sections, groupes TD/TP/Stage — la hiérarchie LMD complète." />
          <FeatureCard icon="👥" title="Gestion des agents" desc="Créez les comptes scolarité, comptabilité, bibliothèque, sécurité avec des permissions strictes par rôle." />
        </div>
      </Section>

      {/* SCOLARITÉ */}
      <Section bg={P.bg}>
        <SectionTitle badge="Service scolarité" title="Inscriptions, notes, emplois du temps" sub="Le cœur de la gestion académique : du dossier d'inscription à la publication des résultats." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <div>
            <ImagePlaceholder label="Moteur EDT avec détection de conflits" icon="📅" h={240} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FeatureCard icon="📝" title="Inscriptions en masse" desc="Import CSV de centaines d'étudiants. Vérification automatique des doublons et des pièces manquantes." />
            <FeatureCard icon="⚡" title="Détection de conflits EDT" desc="Le moteur vérifie en temps réel : même salle, même enseignant, même groupe au même créneau." />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[['📋', 'Inscriptions LMD'], ['📅', 'EDT intelligent'], ['🏆', 'Notes & délibérations'], ['📄', 'Documents PDF']].map(([i, t], x) =>
            <div key={x} style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{i}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t}</div>
            </div>
          )}
        </div>
      </Section>

      {/* FINANCES */}
      <Section>
        <SectionTitle badge="Finances & Comptabilité" title="Maîtrisez vos recettes en FCFA" sub="Échéancier automatique, alertes impayés, blocage badge — le recouvrement devient intelligent." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FeatureCard icon="💰" title="Échéancier automatique" desc="Chaque étudiant a un calendrier de paiement. Les échéances passent automatiquement en retard après la date limite." />
            <FeatureCard icon="🔒" title="Blocage intelligent" desc="Impayé > 60 jours → badge bloqué automatiquement → portique campus refuse → accès examen refuse. Paiement confirmé → tout se rouvre." />
            <FeatureCard icon="📱" title="Paiement mobile" desc="Airtel Money, NITA, AMANA, virement, espèces — toutes les méthodes utilisées au Niger." />
          </div>
          <ImagePlaceholder label="Graphique recettes / dépenses en FCFA" icon="💳" h={380} />
        </div>
      </Section>

      {/* CONTRÔLE D'ACCÈS */}
      <Section bg={P.bg}>
        <SectionTitle badge="Sécurité campus" title="Du badge au portique d'examen" sub="La chaîne paiement → badge → portique → salle d'examen est entièrement automatisée." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <ImagePlaceholder label="Scan badge → vérification paiement → accès autorisé" icon="🛡️" h={260} />
          <ImagePlaceholder label="Journal d'accès temps réel" icon="📡" h={260} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <FeatureCard icon="🪪" title="Badges RFID" desc="Chaque étudiant reçoit un badge à l'inscription. Lié à son dossier financier en temps réel." />
          <FeatureCard icon="🎓" title="Accès examens" desc="Le surveillant scanne le badge. Le système vérifie : convocation valide + paiement à jour + badge actif." />
          <FeatureCard icon="📋" title="Traçabilité totale" desc="Chaque entrée, sortie, refus est enregistré avec horodatage. Rapport d'incidents intégré." />
        </div>
      </Section>

      {/* POUR LES ENSEIGNANTS & ÉTUDIANTS */}
      <Section>
        <SectionTitle badge="Enseignants & Étudiants" title="Des interfaces pensées pour le quotidien" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: P.p, marginBottom: 16 }}>👨‍🏫 Enseignants</h3>
            <ImagePlaceholder label="Saisie des notes avec calcul automatique" icon="📝" h={200} />
            <div style={{ marginTop: 16 }}>
              {['Saisie notes CC + Examen avec calcul auto de la moyenne', 'Consultation de l\'emploi du temps et des cours assignés', 'Export CSV des notes pour archivage', 'Notification automatique aux étudiants à la publication'].map((t, i) =>
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', fontSize: 14, color: P.ink }}>
                  <span style={{ color: P.g }}>✓</span> {t}
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#F3812B', marginBottom: 16 }}>🎓 Étudiants</h3>
            <ImagePlaceholder label="Parcours académique L1 → Doctorat" icon="📜" h={200} />
            <div style={{ marginTop: 16 }}>
              {['Consultation des notes après délibération du jury', 'Téléchargement bulletin PDF, attestation, convocation', 'Historique des paiements en FCFA', 'Frise chronologique du parcours académique (L1 → Doctorat)'].map((t, i) =>
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', fontSize: 14, color: P.ink }}>
                  <span style={{ color: P.g }}>✓</span> {t}
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* BIBLIOTHÈQUE + COMMUNICATION */}
      <Section bg={P.bg}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: P.ink, marginBottom: 16 }}>📚 Bibliothèque</h3>
            <div style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, padding: 24 }}>
              {['Catalogue de 9 catégories (Sciences, Droit, Informatique, Médecine...)', 'Gestion des emprunts et retours en un clic', 'Détection automatique des retards', 'Gestion des exemplaires et des emplacements'].map((t, i) =>
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', fontSize: 14, color: P.ink, borderBottom: i < 3 ? `1px solid ${P.bd}` : 'none' }}>
                  <span style={{ color: P.g }}>✓</span> {t}
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: P.ink, marginBottom: 16 }}>📢 Communication</h3>
            <div style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, padding: 24 }}>
              {['Annonces ciblées (tous, étudiants, enseignants, staff)', 'Messagerie privée entre agents et étudiants', 'Push notifications sur mobile', 'Emails automatiques (inscription, notes, impayés, badge)'].map((t, i) =>
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', fontSize: 14, color: P.ink, borderBottom: i < 3 ? `1px solid ${P.bd}` : 'none' }}>
                  <span style={{ color: P.g }}>✓</span> {t}
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* TÉMOIGNAGES */}
      <Section>
        <SectionTitle badge="Témoignages" title="Ils nous font confiance" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { quote: 'Avant Optimus Campus, la publication des résultats prenait 3 semaines. Aujourd\'hui, c\'est instantané après la délibération du jury.', name: 'Dr. A. M.', role: 'Vice-Recteur, Université publique', icon: '🏛️' },
            { quote: 'Le blocage automatique des badges pour les impayés a augmenté notre taux de recouvrement de 15 points en un semestre.', name: 'Mme F. I.', role: 'Responsable comptabilité', icon: '💰' },
            { quote: 'Je peux consulter mes notes et télécharger mes documents depuis mon téléphone. Plus besoin de faire la queue à la scolarité.', name: 'H. M.', role: 'Étudiante en L3 Informatique', icon: '🎓' },
          ].map((t, i) => (
            <div key={i} style={{ background: P.w, border: `1px solid ${P.bd}`, borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{t.icon}</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: P.ink, fontStyle: 'italic', marginBottom: 20 }}>« {t.quote} »</p>
              <div style={{ fontWeight: 700, fontSize: 14, color: P.ink }}>{t.name}</div>
              <div style={{ fontSize: 13, color: P.sl }}>{t.role}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA FINAL */}
      <Section bg={P.p}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Prêt à transformer votre campus ?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.7)', maxWidth: 480, margin: '0 auto 28px' }}>
            Chaque université est unique. Contactez-nous pour une démonstration
            personnalisée et un devis adapté à vos besoins.
          </p>
          <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 32px', borderRadius: 8, background: '#fff', color: P.p, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Demander une démonstration gratuite →</Link>
        </div>
      </Section>
    </div>
  )
}
