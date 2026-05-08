import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const COLORS = {
  success: { bg: '#E6F0E9', border: '#C6E0CC', text: '#18753C', icon: '#18753C' },
  error:   { bg: '#FEE8E7', border: '#FCC', text: '#E10600', icon: '#E10600' },
  warning: { bg: '#FEF0E5', border: '#fef08a', text: '#a16207', icon: '#F3812B' },
  info:    { bg: '#E3E3FF', border: '#c7d2fe', text: '#4338ca', icon: '#000091' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxWidth: 400,
          }}
          role="status"
          aria-live="polite"
          aria-label="Notifications"
        >
          {toasts.map((toast, i) => {
            const c = COLORS[toast.type] || COLORS.info
            return (
              <div
                key={toast.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 14,
                  boxShadow: '0 8px 24px rgba(0,0,0,.08)',
                  animation: 'toastSlideIn .3s ease forwards',
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: c.icon,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '.85rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {ICONS[toast.type]}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: '.85rem',
                    fontWeight: 600,
                    color: c.text,
                    lineHeight: 1.4,
                  }}
                >
                  {toast.message}
                </span>
                <button
                  onClick={() => removeToast(toast.id)}
                  aria-label="Fermer la notification"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: c.text,
                    fontSize: '1rem',
                    padding: 4,
                    borderRadius: 6,
                    opacity: 0.5,
                    transition: 'opacity .15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px) scale(.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider')
  return ctx
}
