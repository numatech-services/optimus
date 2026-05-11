import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'

// ── Bannière de mise à jour PWA ──
// Quand une nouvelle version est disponible, on propose de recharger
// au lieu de le faire en silence (ce qui causait le bug de cache).
function PWAUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState(null)

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() { setNeedRefresh(true) },
      onOfflineReady() { console.log('[PWA] Prêt hors ligne') },
    })
    setUpdateSW(() => update)
  }, [])

  if (!needRefresh) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: '#1a2035', color: '#fff', borderRadius: 12,
      padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,.35)', fontFamily: 'Roboto, sans-serif',
      fontSize: '.88rem', fontWeight: 600
    }}>
      🔄 Nouvelle version disponible
      <button
        onClick={() => { updateSW?.(true) }}
        style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}
      >Mettre à jour</button>
      <button
        onClick={() => setNeedRefresh(false)}
        style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
      >✕</button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <PWAUpdateBanner />
    </BrowserRouter>
  </React.StrictMode>
)
