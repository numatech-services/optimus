import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook pour gérer l'auto-logout après inactivité + rechargement des données
 * au retour sur l'onglet.
 *
 * @param {Function} logout         - Fonction de déconnexion
 * @param {number}   inactivityMs   - Délai avant auto-logout (défaut : 30 min)
 * @param {Function} onRefresh      - (optionnel) Callback appelé quand l'user
 *                                    revient sur l'onglet après staleAfterMs
 * @param {number}   staleAfterMs   - Délai après lequel onRefresh se déclenche
 *                                    au retour sur l'onglet (défaut : 5 min)
 */
export default function useInactivityLogout(
  logout,
  inactivityMs = 30 * 60 * 1000,   // 30 minutes (était 60 secondes — trop court)
  onRefresh = null,
  staleAfterMs = 5 * 60 * 1000     // 5 minutes (était 30 secondes)
) {
  const inactivityTimerRef = useRef(null)
  const isActivatedRef     = useRef(false)
  const lastActiveAt       = useRef(Date.now())
  const hiddenAt           = useRef(null)
  const onRefreshRef       = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  const markActive = useCallback(() => {
    lastActiveAt.current = Date.now()
  }, [])

  useEffect(() => {
    if (!logout) return

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)

      inactivityTimerRef.current = setTimeout(() => {
        // Ne pas logout si l'onglet est caché — attendre le retour de l'user
        if (document.visibilityState === 'hidden') return

        console.warn('[Inactivité] Auto-logout après inactivité prolongée')
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

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Onglet caché — mémoriser le moment et suspendre le timer
        hiddenAt.current = Date.now()
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
        return
      }

      // Onglet redevenu visible
      const now = Date.now()
      const totalAwayMs = now - lastActiveAt.current

      if (totalAwayMs >= inactivityMs) {
        // Vraiment absent trop longtemps → logout
        console.warn(`[Inactivité] Auto-logout au retour (absent ${Math.round(totalAwayMs / 60000)} min)`)
        localStorage.removeItem('oc_user')
        sessionStorage.clear()
        logout()
        return
      }

      // Retour dans les temps → reset le timer, marquer l'activité
      lastActiveAt.current = now
      hiddenAt.current = null
      resetTimer()

      // Refresh silencieux si données périmées
      if (onRefreshRef.current && totalAwayMs >= staleAfterMs) {
        console.log(`[Refresh] Données périmées (absent ${Math.round(totalAwayMs / 1000)}s), rechargement...`)
        onRefreshRef.current()
      }
    }

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
