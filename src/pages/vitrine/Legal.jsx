import { useState } from 'react'

export default function Legal() {
  const [tab, setTab] = useState('mentions')

  return (
    <div style={{ padding: '48px 24px', maxWidth: 680, margin: '0 auto', fontFamily: "'Marianne','Roboto',sans-serif" }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <button onClick={() => setTab('mentions')} style={{ padding: '8px 16px', borderRadius: 8, border: tab === 'mentions' ? 'none' : '1px solid #E5E5E5', background: tab === 'mentions' ? '#000091' : 'transparent', color: tab === 'mentions' ? '#fff' : '#1E1E1E', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Mentions légales</button>
        <button onClick={() => setTab('privacy')} style={{ padding: '8px 16px', borderRadius: 8, border: tab === 'privacy' ? 'none' : '1px solid #E5E5E5', background: tab === 'privacy' ? '#000091' : 'transparent', color: tab === 'privacy' ? '#fff' : '#1E1E1E', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Politique de confidentialité</button>
      </div>

      {tab === 'mentions' && (
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Mentions légales</h1>
          
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Éditeur</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            Numatech Services SARL<br />
            Siège social : Niamey, Niger<br />
            RCCM : NI-NIA-XXXX-XXXX<br />
            NIF : XXXXXXXXX<br />
            Directeur de la publication : [Nom du dirigeant]<br />
            Contact : contact@optimus-campus.ne
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Hébergement</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            Hostinger International Ltd.<br />
            Base de données : Supabase Inc.<br />
            Localisation : Serveurs européens conformes au RGPD
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Propriété intellectuelle</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            L'ensemble du contenu de la plateforme Optimus Campus (textes, images, code source, 
            base de données, architecture) est la propriété exclusive de Numatech Services SARL.
            Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Responsabilité</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            Numatech Services met tout en œuvre pour assurer la disponibilité et l'exactitude 
            des informations publiées sur la plateforme. Toutefois, la responsabilité de 
            Numatech Services ne saurait être engagée en cas d'interruption temporaire du 
            service pour maintenance ou mise à jour.
          </p>
        </div>
      )}

      {tab === 'privacy' && (
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Politique de confidentialité</h1>
          <p style={{ fontSize: 14, color: '#666666', marginBottom: 24 }}>Dernière mise à jour : 22 mars 2026</p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>1. Données collectées</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            Dans le cadre de la gestion universitaire, Optimus Campus collecte les données 
            suivantes : nom, prénom, date de naissance, genre, adresse email, numéro de 
            téléphone, matricule étudiant, filière, niveau d'études, historique de paiements 
            (montants en FCFA), notes académiques, et logs d'accès au campus.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>2. Finalité du traitement</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            Les données sont traitées exclusivement pour la gestion administrative et 
            pédagogique des universités partenaires : inscriptions, suivi académique, 
            gestion financière, contrôle d'accès campus, et communication institutionnelle.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>3. Sécurité des données</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            Les données sont chiffrées au repos (AES-256) et en transit (TLS 1.3). 
            L'accès est contrôlé par un système RBAC à 8 niveaux avec 57 politiques de 
            sécurité au niveau de la base de données (Row Level Security). 
            L'authentification à deux facteurs est requise pour les administrateurs.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>4. Durée de conservation</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            Les données académiques sont conservées pendant toute la durée du parcours 
            de l'étudiant et archivées pendant 10 ans après l'obtention du diplôme, 
            conformément à la réglementation nigérienne sur l'enseignement supérieur. 
            Les données de paiement sont conservées pendant 5 ans.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>5. Droits des personnes</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666', marginBottom: 24 }}>
            Conformément à la loi nigérienne sur la protection des données personnelles, 
            toute personne concernée dispose d'un droit d'accès, de rectification et de 
            suppression de ses données. Les demandes sont à adresser à : 
            dpo@optimus-campus.ne
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>6. Contact</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#666666' }}>
            Numatech Services SARL — Niamey, Niger<br />
            Email : dpo@optimus-campus.ne<br />
            Téléphone : +227 XX XX XX XX
          </p>
        </div>
      )}
    </div>
  )
}
