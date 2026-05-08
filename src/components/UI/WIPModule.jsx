
import { useNavigate, useLocation } from 'react-router-dom'
import DashLayout from '../Layout/DashLayout'

const moduleNames = {
  // Super Admin
  universities:'Gestion des Universités', billing:'Facturation & Plans',
  analytics:'Analytics Plateforme', users:'Gestion des Utilisateurs',
  settings:'Paramètres Système', audit:"Journal d'Audit",
  // Uni Admin
  students:'Liste des Étudiants', teachers:'Liste des Enseignants',
  scolarite:'Module Scolarité', finances:'Module Finances',
  examens:'Module Examens', reports:'Rapports & Exports',
  // Scolarité
  inscriptions:'Gestion des Inscriptions', edt:'Emplois du Temps',
  notes:'Notes & Résultats', documents:'Documents & Attestations',
  // Enseignant
  cours:'Mes Cours', etudiants:'Mes Étudiants',
  // Étudiant
  paiements:'Mes Paiements',
  // Surveillant
  presence:'Liste de Présence', incidents:"Rapport d'Incidents",
}

export default function WIPModule() {
  const navigate = useNavigate()
  const location = useLocation()
  const slug = location.pathname.split('/').pop()
  const moduleName = moduleNames[slug] || slug.charAt(0).toUpperCase()+slug.slice(1)

  return (
    <DashLayout title={moduleName}>
      <div style={{
        display:'flex',flexDirection:'column',alignItems:'center',
        justifyContent:'center',minHeight:'55vh',textAlign:'center',padding:40
      }} className="fade-in">
        <div style={{ fontSize:'3.5rem',marginBottom:20 }}>🏗️</div>
        <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:800,fontSize:'1.6rem',color:'var(--ink)',marginBottom:10 }}>
          {moduleName}
        </div>
        <div style={{ fontSize:'.95rem',color:'var(--slate)',maxWidth:460,lineHeight:1.7,marginBottom:28 }}>
          Ce module est disponible dans la version complète d'Optimus Campus.
          Ce prototype présente les tableaux de bord principaux pour démonstration.
        </div>
        <div style={{ background:'var(--primary-light)',border:'1px solid rgba(99,102,241,.15)',borderRadius:12,padding:'14px 20px',marginBottom:32,display:'flex',gap:10,alignItems:'flex-start',maxWidth:440,textAlign:'left' }}>
          <span style={{ fontSize:'1.1rem',flexShrink:0 }}>💡</span>
          <span style={{ fontSize:'.83rem',color:'var(--primary)',lineHeight:1.6 }}>
            En production, cette section affiche et manipule les données réelles de votre établissement en temps réel.
          </span>
        </div>
        <div style={{ display:'flex',gap:12,flexWrap:'wrap',justifyContent:'center' }}>
          <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ padding:'10px 24px' }}>← Retour</button>
          <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ padding:'10px 24px' }}>Site vitrine</button>
        </div>
      </div>
    </DashLayout>
  )
}
