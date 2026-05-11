import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function DashLayout({ children, title = 'Tableau de bord', requiredRole }) {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check localStorage as fallback during initial render race condition
  const storedUser = (() => {
    try {
      const s = localStorage.getItem('oc_user')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })()
  const effectiveUser = user || storedUser

  if (loading && !storedUser) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Marianne,Roboto,sans-serif', color:'var(--slate)', fontSize:'1rem' }}>
      Chargement...
    </div>
  )

  if (!effectiveUser) return <Navigate to="/login" replace />

  const roleRoutes = {
    super_admin:'/dashboard/super-admin', admin_universite:'/dashboard/uni-admin',
    scolarite:'/dashboard/scolarite', enseignant:'/dashboard/enseignant',
    etudiant:'/dashboard/etudiant', surveillant:'/dashboard/surveillant',
  }
  const roles = Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : []
  if (roles.length > 0 && !roles.includes(effectiveUser.role)) {
    return <Navigate to={roleRoutes[effectiveUser.role] || '/login'} replace />
  }

  return (
    <div className="dash-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          onKeyDown={e => { if (e.key === 'Escape') setSidebarOpen(false) }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:150 }}
          className="sidebar-overlay"
          role="presentation"
          aria-hidden="true" />
      )}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="dash-main" role="document">
        <Topbar title={title} onMenuToggle={() => setSidebarOpen(p => !p)} />
        <main className="dash-content fade-in" aria-label={title}>
          {children}
        </main>
      </div>
    </div>
  )
}