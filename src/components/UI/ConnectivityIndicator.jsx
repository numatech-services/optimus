import { useState, useEffect } from 'react'

/**
 * Connectivity indicator — shows real-time network status.
 * Critical for Niger where 3G connections drop frequently.
 * Renders a small banner when offline.
 */
export default function ConnectivityIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    const goOnline = () => { setOnline(true); setTimeout(() => setShowBanner(false), 2000) }
    const goOffline = () => { setOnline(false); setShowBanner(true) }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Initial check
    if (!navigator.onLine) { setOnline(false); setShowBanner(true) }

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Listen for offline sync events
  useEffect(() => {
    const handleSync = (e) => {
      const { synced, remaining } = e.detail
      setSyncMessage(`✅ ${synced} opération(s) synchronisée(s)${remaining > 0 ? ` — ${remaining} en attente` : ''}`)
      setTimeout(() => setSyncMessage(''), 4000)
    }
    window.addEventListener('offline-sync', handleSync)
    return () => window.removeEventListener('offline-sync', handleSync)
  }, [])

  if (!showBanner && !syncMessage) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        padding: '10px 20px',
        textAlign: 'center',
        fontSize: '.85rem',
        fontWeight: 700,
        color: '#fff',
        background: online ? '#18753C' : '#E10600',
        transition: 'all .3s ease',
        animation: 'slideUp .3s ease',
      }}
    >
      {syncMessage ? syncMessage : online ? (
        '✅ Connexion rétablie'
      ) : (
        '⚠️ Pas de connexion internet — les modifications seront sauvegardées à la reconnexion'
      )}
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}
