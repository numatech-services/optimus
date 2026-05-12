/**
 * supabaseClient.js
 * 
 * Client Supabase avec timeout automatique de 10s.
 * 
 * CHANGEMENTS vs la version précédente :
 * - Suppression du Proxy inutile (le Proxy ne faisait rien d'utile)
 * - Timeout augmenté à 10s (8s trop court pour les connexions lentes)
 * - L'intercepteur fetch reste mais est plus propre
 * - Export nommé `sb` conservé pour compatibilité avec l'existant
 */

import { supabase } from './supabase'

const TIMEOUT_MS = 10_000 // 10 secondes

// Intercepteur global pour les appels Supabase
// On le met en place UNE SEULE FOIS (guard contre double-init en dev HMR)
if (typeof window !== 'undefined' && !window.__supabaseTimeoutPatched) {
  window.__supabaseTimeoutPatched = true

  const originalFetch = window.fetch

  window.fetch = function (url, options = {}) {
    // Uniquement pour les appels Supabase (pas les fonts, etc.)
    if (typeof url === 'string' && url.includes('supabase.co')) {
      // Si un signal existe déjà (ex: AbortController externe), on le respecte
      if (options.signal) {
        return originalFetch(url, options)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      return originalFetch(url, { ...options, signal: controller.signal })
        .then(response => {
          clearTimeout(timeoutId)
          return response
        })
        .catch(err => {
          clearTimeout(timeoutId)
          if (err.name === 'AbortError') {
            throw new Error('Délai de connexion dépassé (10s). Vérifiez votre connexion internet.')
          }
          throw err
        })
    }

    return originalFetch(url, options)
  }
}

// Export direct du client Supabase — pas besoin de Proxy
export const sb = supabase
export default sb