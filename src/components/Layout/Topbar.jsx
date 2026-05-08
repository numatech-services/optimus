import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, User, Settings, HelpCircle, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const roleLabels = {
  super_admin:'Super Admin', admin_universite:'Admin Univ.',
  scolarite:'Scolarité', enseignant:'Enseignant',
  etudiant:'Étudiant', surveillant:'Surveillant',
}
const roleColors = {
  super_admin:'var(--gold)', admin_universite:'var(--blue)',
  scolarite:'var(--teal)', enseignant:'var(--green)',
  etudiant:'var(--slate)', surveillant:'var(--red)',
}

const TYPE_ICON = {
  impayé: '💳', portique: '🚪', inscription: '📝', note: '📊',
  examen: '📋', paiement: '💰', relance: '📲', default: '🔔',
}

export default function Topbar({ title, onMenuToggle }) {
  const { user, logout } = useAuth()
  const navigate            = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUser,   setShowUser]   = useState(false)
  const [notifs, setNotifs] = useState([])
  const [notifsLoaded, setNotifsLoaded] = useState(false)

  // ── Chargement des notifications depuis Supabase ──
  useEffect(() => {
    if (!user || notifsLoaded) return
    async function loadNotifs() {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('role', user.role)
          .order('created_at', { ascending: false })
          .limit(10)

        if (data && data.length > 0) {
          setNotifs(data.map(n => ({
            id: n.id,
            icon: TYPE_ICON[n.type] || '🔔',
            text: n.titre || n.title || 'Notification',
            detail: n.detail || '',
            time: n.date || n.created_at,
            read: n.lu || false,
            link: n.link || null
          })))
        } else {
          // Fallback si la table est vide
          setNotifs([
            { id:'d1', icon:'📝', text:'3 dossiers en attente',   time:'5 min', read:false },
            { id:'d2', icon:'💰', text:'47 impayés à relancer',   time:'1h',   read:false },
            { id:'d3', icon:'🚪', text:'Accès refusé — badge',    time:'2h',   read:false },
          ])
        }
      } catch {
        setNotifs([
          { id:'d1', icon:'📝', text:'3 dossiers en attente', time:'5 min', read:false },
        ])
      }
      setNotifsLoaded(true)
    }
    loadNotifs()
  }, [user, notifsLoaded])

  const unread = notifs.filter(n => !n.read).length
  const initials = user?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'U'
  const roleColor = roleColors[user?.role] || 'var(--slate)'

  const handleLogout = async () => { 
    setShowUser(false)
    await logout()
    navigate('/')
  }

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read:true })))
  const markRead    = id => setNotifs(prev => prev.map(n => n.id===id ? { ...n, read:true } : n))

  return (
    <header className="dash-topbar" style={{ position:'sticky', top:0, zIndex:100 }} role="banner">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="topbar-hamburger"
        aria-label="Menu"
        style={{ background:'none', border:'none', cursor:'pointer', padding:'6px 8px', borderRadius:8, color:'var(--ink)', display: 'flex', alignItems: 'center' }}
      >
        <Menu size={20} />
      </button>

      {/* Title */}
      <span className="topbar-title" style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:700, fontSize:'1rem', color:'var(--ink)', flex:1 }}>
        {title}
      </span>

      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {/* Date */}
        <div className="topbar-date" style={{ fontSize:'.78rem', color:'var(--slate)' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
        </div>

        {/* Role badge */}
        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'.7rem', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800,
          background: roleColor + '18', color: roleColor, border:`1px solid ${roleColor}30`,
          display:'inline-block', whiteSpace:'nowrap' }}>
          {roleLabels[user?.role] || user?.role}
        </span>

        {/* 🔔 Notifications */}
        <div style={{ position:'relative' }}>
          <button
            onClick={() => { setShowNotifs(p => !p); setShowUser(false) }}
            style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:'6px', borderRadius:8, color:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span style={{ position:'absolute', top:2, right:2, width:16, height:16, background:'var(--red)', color:'#fff', borderRadius:'50%', fontSize:'.58rem', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
                {unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div onClick={()=>setShowNotifs(false)} style={{ position:'fixed', inset:0, zIndex:199 }}/>
              <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, width:340, background:'#fff', borderRadius:14, boxShadow:'0 8px 40px rgba(0,0,0,.14)', zIndex:200, overflow:'hidden', border:'1px solid var(--border)' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, color:'var(--ink)', fontSize:'.92rem' }}>Notifications {unread>0 && <span style={{ color:'var(--red)' }}>({unread})</span>}</span>
                  {unread>0 && <button onClick={markAllRead} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--blue)', fontSize:'.75rem', fontWeight:600 }}>Tout marquer lu</button>}
                </div>
                <div style={{ maxHeight:360, overflowY:'auto' }}>
                  {notifs.map(n => (
                    <div key={n.id} onClick={()=>{ markRead(n.id); setShowNotifs(false); if(n.link) navigate(n.link); }} style={{ padding:'12px 18px', display:'flex', gap:12, alignItems:'flex-start', borderBottom:'1px solid #f7f9fc', cursor:'pointer', background:n.read?'#fff':'var(--primary-light)', transition:'background .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--primary-light)'}
                      onMouseLeave={e=>e.currentTarget.style.background=n.read?'#fff':'var(--primary-light)'}>
                      <span style={{ fontSize:'1.1rem', flexShrink:0, marginTop:2 }}>{n.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'.82rem', color:'var(--ink)', fontWeight:n.read?400:600, lineHeight:1.4 }}>{n.text}</div>
                        {n.detail && <div style={{ fontSize:'.72rem', color:'var(--slate)', marginTop:1, opacity:.8 }}>{n.detail}</div>}
                        <div style={{ fontSize:'.7rem', color:'var(--slate)', marginTop:3 }}>{typeof n.time === 'string' && n.time.includes('T') ? new Date(n.time).toLocaleString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : n.time}</div>
                      </div>
                      {!n.read && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--blue)', flexShrink:0, marginTop:6 }}/>}
                    </div>
                  ))}
                </div>
                <div style={{ padding:'10px 18px', textAlign:'center', borderTop:'1px solid var(--border-light)' }}>
                  <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--blue)', fontSize:'.8rem', fontWeight:600 }}>
                    Voir toutes les notifications →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 👤 User menu */}
        <div style={{ position:'relative' }}>
          <button
            onClick={() => { setShowUser(p => !p); setShowNotifs(false) }}
            style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:10, transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--mist)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
          >
            <div style={{ width:34, height:34, borderRadius:10, background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:900, fontSize:'.75rem', color:'var(--primary)', flexShrink:0 }}>
              {user?.avatar || initials}
            </div>
            <span className="topbar-username" style={{ fontSize:'.85rem', fontWeight:600, color:'var(--ink)', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.name}
            </span>
            <span style={{ color:'var(--slate)', fontSize:'.7rem' }}>▾</span>
          </button>

          {showUser && (
            <>
              <div onClick={()=>setShowUser(false)} style={{ position:'fixed', inset:0, zIndex:199 }}/>
              <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, width:240, background:'#fff', borderRadius:14, boxShadow:'0 8px 40px rgba(0,0,0,.14)', zIndex:200, overflow:'hidden', border:'1px solid var(--border)' }}>
                <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border-light)', background:'var(--mist)' }}>
                  <div style={{ fontWeight:700, color:'var(--ink)', fontSize:'.9rem' }}>{user?.name}</div>
                  <div style={{ fontSize:'.75rem', color:'var(--slate)', marginTop:2 }}>{user?.email}</div>
                  <span style={{ marginTop:6, display:'inline-block', padding:'2px 10px', borderRadius:20, fontSize:'.68rem', fontFamily:'Marianne,Roboto,sans-serif', fontWeight:800, background:roleColor+'20', color:roleColor }}>
                    {roleLabels[user?.role]}
                  </span>
                </div>
                {[
                  { Icon: User, label:'Mon profil', action:()=>setShowUser(false) },
                  { Icon: Settings, label:'Paramètres', action:()=>setShowUser(false) },
                  { Icon: HelpCircle, label:'Aide & support', action:()=>setShowUser(false) },
                ].map((item,i) => {
                  const ComponentIcon = item.Icon
                  return (
                    <div key={i} onClick={item.action} style={{ padding:'10px 18px', display:'flex', gap:10, alignItems:'center', cursor:'pointer', fontSize:'.85rem', color:'var(--ink)', transition:'background .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--mist)'}
                      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <ComponentIcon size={16} />{item.label}
                    </div>
                  )
                })}
                <div style={{ borderTop:'1px solid var(--border-light)' }}>
                  <div onClick={handleLogout} style={{ padding:'10px 18px', display:'flex', gap:10, alignItems:'center', cursor:'pointer', fontSize:'.85rem', color:'var(--red)', transition:'background .15s', fontWeight:600 }}
                    onMouseEnter={e=>e.currentTarget.style.background='#fef0ee'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <LogOut size={16} /> Déconnexion
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
