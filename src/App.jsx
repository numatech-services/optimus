import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ConnectivityIndicator from './components/UI/ConnectivityIndicator'
import ErrorBoundary from './components/UI/ErrorBoundary'

// ── LOADING FALLBACK ──
function LoadingScreen() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Marianne,Roboto,sans-serif', color:'var(--slate)', fontSize:'1rem' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 16px' }} />
        Chargement…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── LAZY IMPORTS (code splitting par route) ──

// Vitrine
const Home = lazy(() => import('./pages/vitrine/Home'))
const ModulesPage = lazy(() => import('./pages/vitrine/Modules'))
const AboutPage = lazy(() => import('./pages/vitrine/About'))
const BlogPage = lazy(() => import('./pages/vitrine/Blog'))
const LegalPage = lazy(() => import('./pages/vitrine/Legal'))
const ContactPage = lazy(() => import('./pages/vitrine/Contact'))

// Auth
const Login          = lazy(() => import('./pages/auth/Login'))
const MinistereDashboard = lazy(() => import('./pages/MinistereDashboard'))
const AdminLogin     = lazy(() => import('./pages/auth/AdminLogin'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword  = lazy(() => import('./pages/auth/ResetPassword'))

// Dashboards — index
const SuperAdminDash  = lazy(() => import('./pages/dashboards/SuperAdmin'))
const UniAdminDash    = lazy(() => import('./pages/dashboards/UniAdmin'))
const ScolariteDash   = lazy(() => import('./pages/dashboards/Scolarite'))
const TeacherDash     = lazy(() => import('./pages/dashboards/Teacher'))
const StudentDash     = lazy(() => import('./pages/dashboards/Student'))
const SurveillantDash = lazy(() => import('./pages/dashboards/Surveillant'))
const BibliothequeDash = lazy(() => import('./pages/dashboards/Bibliotheque'))
const ComptabiliteDash = lazy(() => import('./pages/dashboards/Comptabilite'))
const ComptaBadgeControl = lazy(() => import('./pages/dashboards/Comptabilite/BadgeControl'))

// Super Admin sub-pages
const SuperAdminUsers        = lazy(() => import('./pages/dashboards/SuperAdmin/Users'))
const SuperAdminSettings     = lazy(() => import('./pages/dashboards/SuperAdmin/Settings'))
const SuperAdminAnalytics    = lazy(() => import('./pages/dashboards/SuperAdmin/Analytics'))
const SuperAdminAudit        = lazy(() => import('./pages/dashboards/SuperAdmin/Audit'))
const SuperAdminBilling      = lazy(() => import('./pages/dashboards/SuperAdmin/Billing'))
const SuperAdminUniversities = lazy(() => import('./pages/dashboards/SuperAdmin/Universities'))

// Access Control
const AccessControlModule    = lazy(() => import('./pages/dashboards/AccessControl'))
const AccessControlDevices   = lazy(() => import('./pages/dashboards/AccessControl/Devices'))
const AccessControlBadges    = lazy(() => import('./pages/dashboards/AccessControl/Badges'))
const AccessControlRules     = lazy(() => import('./pages/dashboards/AccessControl/Rules'))
const AccessControlMonitor   = lazy(() => import('./pages/dashboards/AccessControl/Monitor'))
const AccessControlPortique  = lazy(() => import('./pages/dashboards/AccessControl/Portique'))
const AccessControlListeAcces = lazy(() => import('./pages/dashboards/AccessControl/ListeAcces'))

// UniAdmin sub-pages
const UniAdminStudents     = lazy(() => import('./pages/dashboards/UniAdmin/Students'))
const UniAdminFinances     = lazy(() => import('./pages/dashboards/UniAdmin/Finances'))
const UniAdminImpayesAcces = lazy(() => import('./pages/dashboards/UniAdmin/ImpayesAcces'))
const UniAdminTeachers     = lazy(() => import('./pages/dashboards/UniAdmin/Teachers'))
const UniAdminExamens      = lazy(() => import('./pages/dashboards/UniAdmin/Examens'))
const UniAdminReports      = lazy(() => import('./pages/dashboards/UniAdmin/Reports'))
const UniAdminSettings     = lazy(() => import('./pages/dashboards/UniAdmin/Settings'))
const UniAdminScolarite    = lazy(() => import('./pages/dashboards/UniAdmin/Scolarite'))
const UniAdminAcademicData = lazy(() => import('./pages/dashboards/UniAdmin/AcademicData'))
const UniAdminAcademicStructure = lazy(() => import('./pages/dashboards/UniAdmin/AcademicStructure'))
const UniAdminAgentManagement = lazy(() => import('./pages/dashboards/UniAdmin/AgentManagement'))
const UniAdminSalles = lazy(() => import('./pages/dashboards/UniAdmin/SallesManagement'))
const UniAdminEcheancier = lazy(() => import('./pages/dashboards/UniAdmin/Echeancier'))
const UniAdminCommunication = lazy(() => import('./pages/dashboards/UniAdmin/Communication'))
const UniAdminAnneesAcademiques = lazy(() => import('./pages/dashboards/UniAdmin/AnneesAcademiques'))
const UniAdminBourses = lazy(() => import('./pages/dashboards/UniAdmin/Bourses'))
const UniAdminDeliberations = lazy(() => import('./pages/dashboards/UniAdmin/Deliberations'))

// Scolarite sub-pages
const ScolariteInscriptions = lazy(() => import('./pages/dashboards/Scolarite/Inscriptions'))
const ScolariteNotes        = lazy(() => import('./pages/dashboards/Scolarite/Notes'))
const ScolariteEDT          = lazy(() => import('./pages/dashboards/Scolarite/EDT'))
const ScolariteExamens      = lazy(() => import('./pages/dashboards/Scolarite/Examens'))
const ScolariteDocuments    = lazy(() => import('./pages/dashboards/Scolarite/Documents'))
const ScolariteMatieres    = lazy(() => import('./pages/dashboards/Scolarite/Matieres'))
const ScolaritePresence     = lazy(() => import('./pages/dashboards/Scolarite/Presence'))

// Teacher sub-pages
const TeacherNotes     = lazy(() => import('./pages/dashboards/Teacher/Notes'))
const TeacherEDT       = lazy(() => import('./pages/dashboards/Teacher/EDT'))
const TeacherCours     = lazy(() => import('./pages/dashboards/Teacher/Cours'))
const TeacherEtudiants = lazy(() => import('./pages/dashboards/Teacher/Etudiants'))

// Student sub-pages
const StudentNotes     = lazy(() => import('./pages/dashboards/Student/Notes'))
const StudentPaiements = lazy(() => import('./pages/dashboards/Student/Paiements'))
const StudentEDT       = lazy(() => import('./pages/dashboards/Student/EDT'))
const StudentDocuments = lazy(() => import('./pages/dashboards/Student/Documents'))
const StudentExamens   = lazy(() => import('./pages/dashboards/Student/Examens'))

// Surveillant sub-pages
const SurveillantScanner   = lazy(() => import('./pages/dashboards/Surveillant/Scanner'))
const SurveillantMonitor   = lazy(() => import('./pages/dashboards/Surveillant/Monitor'))
const SurveillantPresence  = lazy(() => import('./pages/dashboards/Surveillant/Presence'))
const SurveillantIncidents = lazy(() => import('./pages/dashboards/Surveillant/Incidents'))
const SurveillantExamAccess = lazy(() => import('./pages/dashboards/Surveillant/ExamAccess'))

// ── CONSTANTES ──

export const ROLE_ROUTES = {
  super_admin:      '/dashboard/super-admin',
  admin_universite: '/dashboard/uni-admin',
  scolarite:        '/dashboard/scolarite',
  enseignant:       '/dashboard/enseignant',
  etudiant:         '/dashboard/etudiant',
  surveillant:      '/dashboard/surveillant',
  bibliotheque:     '/dashboard/bibliotheque',
  comptabilite:     '/dashboard/comptabilite',
}

// ── GUARD UNIFIÉ (remplace Guard + GuardMulti) ──

function Guard({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(user.role)) {
    return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />
  }

  return children
}

// ── 404 — STYLED ──

function NotFound() {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'var(--bg)', fontFamily:'Marianne,Roboto,sans-serif',
      textAlign:'center', padding:24, position:'relative', overflow:'hidden'
    }}>
      {/* Background decoration */}
      <div style={{ position:'absolute', top:'10%', left:'10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,.05) 0%, transparent 70%)' }} />
      <div style={{ position:'absolute', bottom:'10%', right:'15%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,.04) 0%, transparent 70%)' }} />

      <div style={{ position:'relative', zIndex:1 }}>
        {/* Big 404 */}
        <div style={{
          fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'clamp(6rem,15vw,10rem)',
          color:'var(--primary)', lineHeight:1, opacity:.12, marginBottom:-20,
          letterSpacing:'-.05em', userSelect:'none'
        }}>404</div>

        <div style={{
          width:72, height:72, borderRadius:20,
          background:'var(--primary-light)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'2rem', margin:'0 auto 24px',
          boxShadow:'0 4px 12px rgba(99,102,241,.12)'
        }}>🔍</div>

        <h1 style={{
          fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, fontSize:'1.6rem',
          color:'var(--ink)', marginBottom:10, letterSpacing:'-.02em'
        }}>Page introuvable</h1>

        <p style={{
          color:'var(--slate)', maxWidth:400, margin:'0 auto 32px',
          fontSize:'.92rem', lineHeight:1.6
        }}>
          La page que vous cherchez n'existe pas, a été déplacée, ou vous n'avez pas les droits nécessaires pour y accéder.
        </p>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <a href="/" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'var(--primary)', color:'#fff',
            padding:'12px 28px', borderRadius:12,
            fontWeight:700, fontSize:'.9rem', textDecoration:'none',
            boxShadow:'0 2px 8px rgba(99,102,241,.3)',
            transition:'all .2s'
          }}>← Retour à l'accueil</a>
          <a href="/login" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'var(--snow)', color:'var(--ink)',
            padding:'12px 28px', borderRadius:12,
            border:'1.5px solid var(--border)',
            fontWeight:600, fontSize:'.9rem', textDecoration:'none',
            transition:'all .2s'
          }}>Se connecter</a>
        </div>
      </div>
    </div>
  )
}

// ── ROUTES ──

function AppRoutes() {
  const { user } = useAuth()
  const loginRedirect = user ? ROLE_ROUTES[user.role] : null

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* ── Vitrine ── */}
        <Route path="/" element={<Home />} />
        <Route path="/modules" element={<ModulesPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/mentions-legales" element={<LegalPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* ── Auth ── */}
        <Route path="/login" element={loginRedirect ? <Navigate to={loginRedirect} replace /> : <Login />} />
        <Route path="/ministere" element={<MinistereDashboard />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* ── SUPER ADMIN ── */}
        <Route path="/dashboard/super-admin"              element={<Guard roles="super_admin"><SuperAdminDash /></Guard>} />
        <Route path="/dashboard/super-admin/universities" element={<Guard roles="super_admin"><SuperAdminUniversities /></Guard>} />
        <Route path="/dashboard/super-admin/billing"      element={<Guard roles="super_admin"><SuperAdminBilling /></Guard>} />
        <Route path="/dashboard/super-admin/analytics"    element={<Guard roles="super_admin"><SuperAdminAnalytics /></Guard>} />
        <Route path="/dashboard/super-admin/users"        element={<Guard roles="super_admin"><SuperAdminUsers /></Guard>} />
        <Route path="/dashboard/super-admin/settings"     element={<Guard roles="super_admin"><SuperAdminSettings /></Guard>} />
        <Route path="/dashboard/super-admin/audit"        element={<Guard roles="super_admin"><SuperAdminAudit /></Guard>} />

        {/* ── UNI ADMIN ── */}
        <Route path="/dashboard/uni-admin"                        element={<Guard roles="admin_universite"><UniAdminDash /></Guard>} />
        <Route path="/dashboard/uni-admin/students"               element={<Guard roles="admin_universite"><UniAdminStudents /></Guard>} />
        <Route path="/dashboard/uni-admin/teachers"               element={<Guard roles="admin_universite"><UniAdminTeachers /></Guard>} />
        <Route path="/dashboard/uni-admin/scolarite"              element={<Guard roles="admin_universite"><UniAdminScolarite /></Guard>} />
        <Route path="/dashboard/uni-admin/academic-structure"    element={<Guard roles="admin_universite"><UniAdminAcademicStructure /></Guard>} />
        <Route path="/dashboard/uni-admin/academic-data"          element={<Guard roles="admin_universite"><UniAdminAcademicData /></Guard>} />
        <Route path="/dashboard/uni-admin/finances"               element={<Guard roles="admin_universite"><UniAdminFinances /></Guard>} />
        <Route path="/dashboard/uni-admin/impayes-acces"          element={<Guard roles="admin_universite"><UniAdminImpayesAcces /></Guard>} />
        <Route path="/dashboard/uni-admin/examens"                element={<Guard roles="admin_universite"><UniAdminExamens /></Guard>} />
        <Route path="/dashboard/uni-admin/reports"                element={<Guard roles="admin_universite"><UniAdminReports /></Guard>} />
        <Route path="/dashboard/uni-admin/salles"                  element={<Guard roles="admin_universite"><UniAdminSalles /></Guard>} />
        <Route path="/dashboard/uni-admin/echeancier"              element={<Guard roles="admin_universite"><UniAdminEcheancier /></Guard>} />
        <Route path="/dashboard/uni-admin/annees-academiques"      element={<Guard roles="admin_universite"><UniAdminAnneesAcademiques /></Guard>} />
        <Route path="/dashboard/uni-admin/bourses"                  element={<Guard roles="admin_universite"><UniAdminBourses /></Guard>} />
        <Route path="/dashboard/uni-admin/deliberations"            element={<Guard roles="admin_universite"><UniAdminDeliberations /></Guard>} />
        <Route path="/dashboard/uni-admin/communication"           element={<Guard roles="admin_universite"><UniAdminCommunication /></Guard>} />
        <Route path="/dashboard/uni-admin/agents"                 element={<Guard roles="admin_universite"><UniAdminAgentManagement /></Guard>} />
        <Route path="/dashboard/uni-admin/settings"               element={<Guard roles="admin_universite"><UniAdminSettings /></Guard>} />
        <Route path="/dashboard/scolarite/matieres" element={<Guard roles={["scolarite","admin_universite","enseignant"]}><ScolariteMatieres /></Guard>} />
<Route path="/dashboard/scolarite/presence" element={<Guard roles={["scolarite","admin_universite","surveillant","enseignant"]}><ScolaritePresence /></Guard>} />
        {/* Contrôle d'accès physique */}
        <Route path="/dashboard/uni-admin/access-control"             element={<Guard roles="admin_universite"><AccessControlModule /></Guard>} />
        <Route path="/dashboard/uni-admin/access-control/devices"     element={<Guard roles="admin_universite"><AccessControlDevices /></Guard>} />
        <Route path="/dashboard/uni-admin/access-control/badges"      element={<Guard roles="admin_universite"><AccessControlBadges /></Guard>} />
        <Route path="/dashboard/uni-admin/access-control/rules"       element={<Guard roles="admin_universite"><AccessControlRules /></Guard>} />
        <Route path="/dashboard/uni-admin/access-control/monitor"     element={<Guard roles="admin_universite"><AccessControlMonitor /></Guard>} />
        <Route path="/dashboard/uni-admin/access-control/portique"    element={<Guard roles="admin_universite"><AccessControlPortique /></Guard>} />
        <Route path="/dashboard/uni-admin/access-control/liste-acces" element={<Guard roles="admin_universite"><AccessControlListeAcces /></Guard>} />

        {/* ── SCOLARITE (accessible par scolarité ET admin université) ── */}
        <Route path="/dashboard/scolarite"               element={<Guard roles={["scolarite","admin_universite"]}><ScolariteDash /></Guard>} />
        <Route path="/dashboard/scolarite/inscriptions"  element={<Guard roles={["scolarite","admin_universite"]}><ScolariteInscriptions /></Guard>} />
        <Route path="/dashboard/scolarite/edt"           element={<Guard roles={["scolarite","admin_universite"]}><ScolariteEDT /></Guard>} />
        <Route path="/dashboard/scolarite/examens"       element={<Guard roles={["scolarite","admin_universite"]}><ScolariteExamens /></Guard>} />
        <Route path="/dashboard/scolarite/notes"         element={<Guard roles={["scolarite","admin_universite"]}><ScolariteNotes /></Guard>} />
        <Route path="/dashboard/scolarite/documents"     element={<Guard roles={["scolarite","admin_universite"]}><ScolariteDocuments /></Guard>} />
        <Route path="/dashboard/scolarite/matieres"      element={<Guard roles={["scolarite","admin_universite","enseignant"]}><ScolariteMatieres /></Guard>} />
        <Route path="/dashboard/scolarite/presence"      element={<Guard roles={["scolarite","admin_universite","surveillant","enseignant"]}><ScolaritePresence /></Guard>} />

        {/* ── ENSEIGNANT ── */}
        <Route path="/dashboard/enseignant"           element={<Guard roles="enseignant"><TeacherDash /></Guard>} />
        <Route path="/dashboard/enseignant/cours"     element={<Guard roles="enseignant"><TeacherCours /></Guard>} />
        <Route path="/dashboard/enseignant/edt"       element={<Guard roles="enseignant"><TeacherEDT /></Guard>} />
        <Route path="/dashboard/enseignant/notes"     element={<Guard roles="enseignant"><TeacherNotes /></Guard>} />
        <Route path="/dashboard/enseignant/etudiants" element={<Guard roles="enseignant"><TeacherEtudiants /></Guard>} />

        {/* ── ETUDIANT ── */}
        <Route path="/dashboard/etudiant"            element={<Guard roles="etudiant"><StudentDash /></Guard>} />
        <Route path="/dashboard/etudiant/edt"        element={<Guard roles="etudiant"><StudentEDT /></Guard>} />
        <Route path="/dashboard/etudiant/notes"      element={<Guard roles="etudiant"><StudentNotes /></Guard>} />
        <Route path="/dashboard/etudiant/paiements"  element={<Guard roles="etudiant"><StudentPaiements /></Guard>} />
        <Route path="/dashboard/etudiant/documents"  element={<Guard roles="etudiant"><StudentDocuments /></Guard>} />
        <Route path="/dashboard/etudiant/examens"    element={<Guard roles="etudiant"><StudentExamens /></Guard>} />

        {/* ── SURVEILLANT ── */}
        <Route path="/dashboard/surveillant"           element={<Guard roles="surveillant"><SurveillantDash /></Guard>} />
        <Route path="/dashboard/surveillant/scanner"   element={<Guard roles="surveillant"><SurveillantScanner /></Guard>} />
        <Route path="/dashboard/surveillant/monitor"   element={<Guard roles="surveillant"><SurveillantMonitor /></Guard>} />
        <Route path="/dashboard/surveillant/presence"  element={<Guard roles="surveillant"><SurveillantPresence /></Guard>} />
        <Route path="/dashboard/surveillant/exam-access"          element={<Guard roles="surveillant"><SurveillantExamAccess /></Guard>} />
        <Route path="/dashboard/surveillant/incidents" element={<Guard roles="surveillant"><SurveillantIncidents /></Guard>} />

        {/* ── BIBLIOTHÈQUE ── */}
        <Route path="/dashboard/bibliotheque" element={<Guard roles="bibliotheque"><BibliothequeDash /></Guard>} />

        {/* ── COMPTABILITÉ ── */}
        <Route path="/dashboard/comptabilite" element={<Guard roles="comptabilite"><ComptabiliteDash /></Guard>} />
        <Route path="/dashboard/comptabilite/badges" element={<Guard roles="comptabilite"><ComptaBadgeControl /></Guard>} />

        {/* ── 404 ── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

// ── APP ──

// Récupérer le redirect depuis 404.html (SPA fallback Hostinger)
const savedPath = sessionStorage.getItem('oc_redirect')
if (savedPath) {
  sessionStorage.removeItem('oc_redirect')
  window.history.replaceState(null, '', savedPath)
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ConnectivityIndicator />
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
