import { useEffect, useRef } from 'react'

/**
 * Hook pour gérer l'auto-logout après inactivité
 * Vide le cache et appelle logout() après 1 minute sans activité
 * 
 * Activités détectées: clic, clavier, scroll, toucher
 */
export default function useInactivityLogout(logout, inactivityMs = 60000) {
  const inactivityTimerRef = useRef(null)
  const isActivatedRef = useRef(false)

  useEffect(() => {
    if (!logout) return

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }

      inactivityTimerRef.current = setTimeout(() => {
        console.warn('[Inactivité] Auto-logout après 1 minute d\'inactivité')
        
        // Vider le cache
        localStorage.removeItem('oc_user')
        sessionStorage.clear()
        
        // Faire le logout
        logout()
      }, inactivityMs)
    }

    // Événements à écouter
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      if (isActivatedRef.current) {
        resetTimer()
      }
    }

    // Activation des listeners au premier mouvement
    const activateListeners = () => {
      if (!isActivatedRef.current) {
        isActivatedRef.current = true
        console.log('[Inactivité] Timer d\'inactivité activé')
        resetTimer()
        
        // Ajouter les listeners
        events.forEach(event => {
          document.addEventListener(event, handleActivity, true)
        })
      }
    }

    // Écouter le premier clic/clavier pour activer le système
    const firstActivityListener = () => {
      activateListeners()
      document.removeEventListener('mousedown', firstActivityListener, true)
      document.removeEventListener('keydown', firstActivityListener, true)
    }

    document.addEventListener('mousedown', firstActivityListener, true)
    document.addEventListener('keydown', firstActivityListener, true)

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }

      document.removeEventListener('mousedown', firstActivityListener, true)
      document.removeEventListener('keydown', firstActivityListener, true)

      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [logout, inactivityMs])
}
