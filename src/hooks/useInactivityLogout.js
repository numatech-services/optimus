import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook pour gérer l'auto-logout après inactivité + rechargement des données
 * au retour sur l'onglet.
 *
 * @param {Function} logout         - Fonction de déconnexion
 * @param {number}   inactivityMs   - Délai avant auto-logout (défaut : 60s)
 * @param {Function} onRefresh      - (optionnel) Callback appelé quand l'user
 *                                    revient sur l'onglet après staleAfterMs
 * @param {number}   staleAfterMs   - Délai après lequel onRefresh se déclenche
 *                                    au retour sur l'onglet (défaut : 30s)
 *
 * Usage minimal (comportement identique à l'ancienne version) :
 *   useInactivityLogout(logout)
 *
 * Usage avec refresh :
 *   useInactivityLogout(logout, 60000, () => {
 *     fetchEtudiants()
 *     fetchPaiements()
 *   }, 30000)
 */
export default function useInactivityLogout(
  logout,
  inactivityMs = 60_000,
  onRefresh = null,
  staleAfterMs = 30_000
) {
  const inactivityTimerRef = useRef(null)
  const isActivatedRef     = useRef(false)
  const lastActiveAt       = useRef(Date.now())
  const onRefreshRef       = useRef(onRefresh)

  // Garder la ref à jour sans recréer les listeners
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  // Exposé pour que les composants puissent reset le timer après un fetch réussi
  const markActive = useCallback(() => {
    lastActiveAt.current = Date.now()
  }, [])

  useEffect(() => {
    if (!logout) return

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)

      inactivityTimerRef.current = setTimeout(() => {
        console.warn('[Inactivité] Auto-logout après inactivité')
        localStorage.removeItem('oc_user')
        sessionStorage.clear()
        logout()
      }, inactivityMs)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      if (isActivatedRef.current) {
        lastActiveAt.current = Date.now()
        resetTimer()
      }
    }

    // --- NOUVEAU : rechargement au retour sur l'onglet ---
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return

      const awayMs = Date.now() - lastActiveAt.current

      if (awayMs >= inactivityMs) {
        // L'user était absent plus longtemps que le délai de logout → logout
        console.warn('[Inactivité] Auto-logout au retour (inactivité longue)')
        localStorage.removeItem('oc_user')
        sessionStorage.clear()
        logout()
        return
      }

      // L'user revient dans la fenêtre active → reset le timer
      resetTimer()

      // Si les données sont périmées, déclencher le refresh
      if (onRefreshRef.current && awayMs >= staleAfterMs) {
        console.log(`[Refresh] Données périmées (absent ${Math.round(awayMs / 1000)}s), rechargement...`)
        lastActiveAt.current = Date.now()
        onRefreshRef.current()
      }
    }

    // Activation des listeners au premier mouvement (comportement original conservé)
    const activateListeners = () => {
      if (!isActivatedRef.current) {
        isActivatedRef.current = true
        lastActiveAt.current   = Date.now()
        resetTimer()
        events.forEach(e => document.addEventListener(e, handleActivity, true))
      }
    }

    const firstActivityListener = () => {
      activateListeners()
      document.removeEventListener('mousedown', firstActivityListener, true)
      document.removeEventListener('keydown',   firstActivityListener, true)
    }

    document.addEventListener('mousedown',        firstActivityListener, true)
    document.addEventListener('keydown',          firstActivityListener, true)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      document.removeEventListener('mousedown',        firstActivityListener, true)
      document.removeEventListener('keydown',          firstActivityListener, true)
      document.removeEventListener('visibilitychange', handleVisibility)
      events.forEach(e => document.removeEventListener(e, handleActivity, true))
    }
  }, [logout, inactivityMs, staleAfterMs])

  return { markActive }
}