import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const links = [
    { to: '/', label: 'Accueil' },
    { to: '/modules', label: 'Solutions' },
    { to: '/blog', label: 'Blog' },
    { to: '/a-propos', label: 'À propos' },
    { to: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5%',
        background: scrolled ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.85)',
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${scrolled ? '#E5E5E5' : 'rgba(226,232,240,.4)'}`,
        transition: 'all .3s',
        boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,.05)' : 'none',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#000091', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '.82rem', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,.3)' }}>OC</div>
          <span style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#1E1E1E' }}>Optimus Campus</span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links-desktop" style={{ display: 'flex', gap: 28, fontSize: '.88rem' }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              color: location.pathname === l.to ? '#000091' : '#666666',
              fontWeight: location.pathname === l.to ? 700 : 500,
              textDecoration: 'none', transition: 'color .2s',
              borderBottom: location.pathname === l.to ? '2px solid #000091' : '2px solid transparent',
              paddingBottom: 2,
            }}>{l.label}</Link>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{ background: 'none', border: '1.5px solid #E5E5E5', borderRadius: 10, padding: '8px 18px', fontSize: '.85rem', fontWeight: 600, color: '#1E1E1E', textDecoration: 'none' }}>Connexion</Link>
          <Link to="/contact" style={{ background: '#000091', borderRadius: 10, padding: '8px 20px', fontSize: '.85rem', fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 2px 8px rgba(99,102,241,.3)' }}>Démo</Link>

          {/* Mobile burger */}
          <button className="mobile-burger" onClick={() => setMobileOpen(!mobileOpen)} style={{
            display: 'none', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.4rem', color: '#1E1E1E', padding: 4
          }}>{mobileOpen ? '✕' : '☰'}</button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, zIndex: 99,
          background: 'rgba(255,255,255,.98)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', padding: '24px 5%', gap: 8
        }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} style={{
              padding: '14px 18px', borderRadius: 12, fontSize: '1rem', fontWeight: 600,
              color: location.pathname === l.to ? '#000091' : '#1E1E1E',
              background: location.pathname === l.to ? '#E3E3FF' : 'transparent',
              textDecoration: 'none'
            }}>{l.label}</Link>
          ))}
        </div>
      )}

      <style>{`
        @media(max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .mobile-burger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
