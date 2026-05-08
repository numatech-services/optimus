import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// ==================== ICÔNES SVG ====================
const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  GraduationCap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  BookOpen: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Clock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>,
  FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="13" x2="8" y2="13"/><line x1="12" y1="17" x2="8" y2="17"/></svg>,
  DollarSign: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Lock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m6.08 0l4.24-4.24M1 12h6m6 0h6m-1.78 7.78l-4.24-4.24m-6.08 0l-4.24 4.24"/></svg>,
  LogOut: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="17 16 21 12 17 8"/><line x1="21" y1="12" x2="9" y2="12"/><polyline points="9 21 3 21 3 3 9 3"/></svg>,
  CheckSquare: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"/><path d="M3 21h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/></svg>,
  BarChart: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Eye: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  AlertTriangle: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Shield: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Wifi: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.94 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  Library: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4 19.5 4 9 20 9 20 19.5 4 19.5"/><polyline points="16 3 5 3 4 5 20 5 19 3"/></svg>,
}

// Map des modules vers les items du menu
const MODULE_ROUTES = {
  scolarité: ['/dashboard/uni-admin/scolarite', '/dashboard/scolarite'],
  finances: ['/dashboard/uni-admin/finances'],
  accès: ['/dashboard/uni-admin/access-control', '/dashboard/uni-admin/access-control/devices', '/dashboard/uni-admin/access-control/badges', '/dashboard/uni-admin/access-control/rules', '/dashboard/uni-admin/access-control/monitor', '/dashboard/uni-admin/access-control/portique', '/dashboard/uni-admin/access-control/liste-acces'],
  examens: ['/dashboard/uni-admin/examens'],
  surveillant: ['/dashboard/surveillant'],
}

const menuByRole = {
  super_admin: [
    { section:'Plateforme' },
    { icon: Icons.Dashboard, label:'Vue globale',    to:'/dashboard/super-admin', end:true },
    { icon: Icons.BarChart, label:'Universités',    to:'/dashboard/super-admin/universities' },
    { icon: Icons.DollarSign, label:'Facturation',    to:'/dashboard/super-admin/billing' },
    { icon: Icons.BarChart, label:'Analytics',      to:'/dashboard/super-admin/analytics' },
    { section:'Administration' },
    { icon: Icons.Users, label:'Utilisateurs',   to:'/dashboard/super-admin/users' },
    { icon: Icons.Settings, label:'Paramètres',     to:'/dashboard/super-admin/settings' },
    { icon: Icons.FileText, label:'Audit log',      to:'/dashboard/super-admin/audit' },
  ],
  admin_universite: [
    { section:'Tableau de bord' },
    { icon: Icons.Dashboard, label:"Vue d'ensemble", to:'/dashboard/uni-admin', end:true },
    { section:'Gestion académique' },
    { icon: Icons.Users, label:'Étudiants',      to:'/dashboard/uni-admin/students' },
    { icon: Icons.Users, label:'Enseignants',    to:'/dashboard/uni-admin/teachers' },
    { icon: Icons.BookOpen, label:'Scolarité',       to:'/dashboard/uni-admin/scolarite', module:'scolarité' },
    { icon: Icons.Calendar, label:'Années académiques', to:'/dashboard/uni-admin/annees-academiques' },
    { icon: Icons.BookOpen, label:'Structure académique', to:'/dashboard/uni-admin/academic-structure' },
    { icon: Icons.FileText, label:'Données académiques', to:'/dashboard/uni-admin/academic-data' },
    { icon: Icons.DollarSign, label:'Finances',        to:'/dashboard/uni-admin/finances', module:'finances' },
    { icon: Icons.Calendar, label:'Échéancier',       to:'/dashboard/uni-admin/echeancier' },
    { icon: Icons.GraduationCap, label:'Bourses (ANAB)',    to:'/dashboard/uni-admin/bourses' },
    { icon: Icons.BookOpen, label:'Salles',           to:'/dashboard/uni-admin/salles' },
    { icon: Icons.FileText, label:'Communication',    to:'/dashboard/uni-admin/communication' },
    { icon: Icons.AlertTriangle, label:'Impayés & Accès', to:'/dashboard/uni-admin/impayes-acces', badge:'NEW' },
    { icon: Icons.CheckSquare, label:'Examens',         to:'/dashboard/uni-admin/examens', module:'examens' },
    { icon: Icons.FileText, label:'Délibérations',    to:'/dashboard/uni-admin/deliberations' },
    { icon: Icons.BarChart, label:'Rapports',        to:'/dashboard/uni-admin/reports' },
    { section:'Sécurité & Accès' },
    { icon: Icons.Shield, label:'Contrôle accès',    to:'/dashboard/uni-admin/access-control', end:true, module:'accès' },
    { icon: Icons.Wifi, label:'Contrôleurs',       to:'/dashboard/uni-admin/access-control/devices', module:'accès' },
    { icon: Icons.Lock, label:'Badges & Cartes',   to:'/dashboard/uni-admin/access-control/badges', module:'accès' },
    { icon: Icons.Lock, label:"Règles d'accès",    to:'/dashboard/uni-admin/access-control/rules', module:'accès' },
    { icon: Icons.Eye, label:'Monitoring live',   to:'/dashboard/uni-admin/access-control/monitor', module:'accès' },
    { icon: Icons.Wifi, label:'Portique DS-S-V1',  to:'/dashboard/uni-admin/access-control/portique', module:'accès' },
    { icon: Icons.FileText, label:'Liste d\'accès',     to:'/dashboard/uni-admin/access-control/liste-acces', module:'accès' },
    { section:'Administration' },
    { icon: Icons.Users, label:'Gestion des agents', to:'/dashboard/uni-admin/agents' },
    { section:'Configuration' },
    { icon: Icons.Settings, label:'Paramètres',     to:'/dashboard/uni-admin/settings' },
  ],
  scolarite: [
    { section:'Tableau de bord' },
    { icon: Icons.Dashboard, label:'Tableau de bord',    to:'/dashboard/scolarite', end:true },
    { section:'Gestion', module:'scolarité' },
    { icon: Icons.CheckSquare, label:'Inscriptions',        to:'/dashboard/scolarite/inscriptions', module:'scolarité' },
    { icon: Icons.Clock, label:'Emplois du temps',    to:'/dashboard/scolarite/edt', module:'scolarité' },
    { icon: Icons.CheckSquare, label:'Examens',             to:'/dashboard/scolarite/examens', module:'examens' },
    { icon: Icons.BarChart, label:'Notes & Résultats',   to:'/dashboard/scolarite/notes', module:'scolarité' },
    { icon: Icons.FileText, label:'Documents',           to:'/dashboard/scolarite/documents', module:'scolarité' },
  ],
  enseignant: [
    { section:'Tableau de bord' },
    { icon: Icons.Dashboard, label:'Tableau de bord',     to:'/dashboard/enseignant', end:true },
    { section:'Mon activité' },
    { icon: Icons.BookOpen, label:'Mes cours',           to:'/dashboard/enseignant/cours' },
    { icon: Icons.Clock, label:'Mon emploi du temps', to:'/dashboard/enseignant/edt' },
    { icon: Icons.FileText, label:'Saisie de notes',     to:'/dashboard/enseignant/notes' },
    { icon: Icons.Users, label:'Mes étudiants',       to:'/dashboard/enseignant/etudiants' },
  ],
  etudiant: [
    { section:'Mon espace' },
    { icon: Icons.Dashboard, label:'Tableau de bord',     to:'/dashboard/etudiant', end:true },
    { section:'Scolarité' },
    { icon: Icons.Clock, label:'Emploi du temps',     to:'/dashboard/etudiant/edt' },
    { icon: Icons.FileText, label:'Mes notes',           to:'/dashboard/etudiant/notes' },
    { icon: Icons.DollarSign, label:'Mes paiements',       to:'/dashboard/etudiant/paiements' },
    { icon: Icons.FileText, label:'Mes documents',       to:'/dashboard/etudiant/documents' },
    { icon: Icons.Lock, label:'Mes examens',         to:'/dashboard/etudiant/examens' },
  ],
  surveillant: [
    { section:'Tableau de bord' },
    { icon: Icons.Dashboard, label:'Tableau de bord',     to:'/dashboard/surveillant', end:true, module:'surveillant' },
    { section:'Contrôle d\'accès', module:'surveillant' },
    { icon: Icons.Eye, label:'Mode scanner',        to:'/dashboard/surveillant/scanner', module:'surveillant' },
    { icon: Icons.Wifi, label:'Flux en direct',      to:'/dashboard/surveillant/monitor', module:'surveillant' },
    { section:'Présence', module:'surveillant' },
    { icon: Icons.FileText, label:'Liste présence',      to:'/dashboard/surveillant/presence', module:'surveillant' },
    { icon: Icons.AlertTriangle, label:'Incidents',           to:'/dashboard/surveillant/incidents', module:'surveillant' },
  ],

  bibliotheque: [
    { section:'Bibliothèque' },
    { icon: Icons.Library, label:'Tableau de bord',     to:'/dashboard/bibliotheque', end:true },
  ],
  comptabilite: [
    { section:'Comptabilité' },
    { icon: Icons.BarChart, label:'Tableau de bord',     to:'/dashboard/comptabilite', end:true },
    { section:'Gestion' },
    { icon: Icons.Lock, label:'Contrôle des badges', to:'/dashboard/comptabilite/badges' },
  ],
}

const roleConfig = {
  super_admin: { label: 'Super Admin', color: '#7c3aed', bgColor: '#ede9fe' },
  admin_universite: { label: 'Admin Université', color: '#2563eb', bgColor: '#eff6ff' },
  scolarite: { label: 'Scolarité', color: '#059669', bgColor: '#ecfdf5' },
  enseignant: { label: 'Enseignant', color: '#0891b2', bgColor: '#ecf0ff' },
  etudiant: { label: 'Étudiant', color: '#7c3aed', bgColor: '#ede9fe' },
  surveillant: { label: 'Surveillant', color: '#ea580c', bgColor: '#fff7ed' },
  bibliotheque: { label: 'Bibliothèque', color: '#4f46e5', bgColor: '#eef2ff' },
  comptabilite: { label: 'Comptabilité', color: '#059669', bgColor: '#ecfdf5' },
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const menu = menuByRole[user?.role] || []
  const roleInfo = roleConfig[user?.role] || { label: user?.role, color: '#666', bgColor: '#f0f0f0' }

  const handleLogout = () => { logout(); navigate('/login') }
  const handleNavClick = () => { if (onClose) onClose() }

  const initials = user?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'U'

  return (
    <aside className={`dash-sidebar${mobileOpen ? ' mobile-open' : ''}`} role="navigation" aria-label="Menu principal">
      {/* Logo */}
      <div className="sidebar-logo" onClick={() => navigate('/')} style={{ cursor:'pointer', padding: '20px 16px' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--primary) 0%, #4c1d95 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 900, fontSize: '.95rem',
          color: '#fff', flexShrink: 0,
          boxShadow: '0 4px 12px rgba(99,102,241,.2)'
        }}>OC</div>
        <div>
          <div style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'.98rem', color:'var(--ink)', lineHeight:1.2, marginTop: 4 }}>
            Optimus Campus
          </div>
          <div style={{ fontSize:'.65rem', color:'var(--slate)', fontWeight:500, marginTop: 2 }}>ERP Universitaire</div>
        </div>
      </div>

      {/* User Role Badge */}
      <div style={{ padding: '12px 16px', margin: '8px 12px', background: roleInfo.bgColor, borderRadius: 10, border: `1px solid ${roleInfo.color}20` }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: roleInfo.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Votre rôle
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: roleInfo.color, marginTop: 4 }}>
          {roleInfo.label}
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Navigation principale" style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {menu.map((item, i, arr) => {
          // Filtrer selon les modules activés
          if (item.module && user?.modules && !user.modules.includes(item.module)) {
            return null
          }
          
          if (item.section) {
            // Vérifier si la section suivante a au moins un item valide
            let hasValidItems = false
            for (let j = i + 1; j < arr.length; j++) {
              if (arr[j].section) break // Prochaine section trouvée
              if (!arr[j].module || (user?.modules && user.modules.includes(arr[j].module))) {
                hasValidItems = true
                break
              }
            }
            if (!hasValidItems) return null
            
            return (
              <div key={i} style={{
                padding:'16px 22px 8px',
                fontSize:'.68rem', fontWeight:700,
                color:'#94a3b8', textTransform:'uppercase',
                letterSpacing:'.08em'
              }}>{item.section}</div>
            )
          }
          return (
            <NavLink
              key={i}
              to={item.to}
              end={item.end}
              onClick={handleNavClick}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              style={({ isActive }) => ({
                padding: '12px 20px',
                margin: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '8px',
                color: isActive ? 'var(--primary)' : 'var(--slate)',
                background: isActive ? 'var(--primary-light)' : 'transparent',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                transition: 'all .2s',
                cursor: 'pointer',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                paddingLeft: isActive ? '17px' : '20px'
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = '#f1f5f9'
                  e.currentTarget.style.color = 'var(--ink)'
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--slate)'
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', flexShrink: 0 }}>
                {item.icon ? <item.icon /> : null}
              </span>
              <span style={{ flex:1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background:'var(--primary)',
                  color:'#fff', fontSize:'.60rem',
                  fontWeight:800, padding:'3px 8px',
                  borderRadius:6, letterSpacing:'.02em'
                }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 12px 20px', borderTop: '1px solid #e2e8f0', marginTop: 'auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
          background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0'
        }}>
          <div style={{
            width:40, height:40, borderRadius:8,
            background: roleInfo.bgColor,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'.85rem',
            color: roleInfo.color, flexShrink:0, border: `2px solid ${roleInfo.bgColor}`
          }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontWeight:700, fontSize:'.82rem', color:'var(--ink)',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
            }}>
              {user?.name || 'Utilisateur'}
            </div>
            <div style={{ fontSize:'.67rem', color: roleInfo.color, marginTop: 2, fontWeight: 600 }}>
              {roleInfo.label}
            </div>
          </div>
          <button onClick={handleLogout} title="Déconnexion"
            style={{
              background:'none', border:'none', cursor:'pointer',
              color:'var(--slate)', padding:'6px',
              borderRadius:6, flexShrink:0, transition:'all .15s',
              display:'flex', alignItems:'center', justifyContent:'center',
              width: 32, height: 32
            }}
            onMouseEnter={e => { e.currentTarget.style.color='#ef4444'; e.currentTarget.style.background='#fee2e2' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--slate)'; e.currentTarget.style.background='none' }}
          >
            <Icons.LogOut />
          </button>
        </div>
      </div>
    </aside>
  )
}
