/**
 * Supabase client with automatic 8s timeout.
 * Usage: import { sb } from '../lib/supabaseClient'
 * Then use sb.from('table').select('*') instead of supabase.from(...)
 * The timeout is applied at the fetch level via AbortController.
 */
import { supabase } from './supabase'

const TIMEOUT_MS = 8000

// Proxy that wraps each .then() chain with a timeout
export const sb = new Proxy(supabase, {
  get(target, prop) {
    // For .from(), .rpc(), .auth, .storage — return as-is
    // The timeout is handled by the global fetch interceptor below
    return target[prop]
  }
})

// Global fetch timeout — intercepts ALL Supabase requests
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch
  window.fetch = function(url, options = {}) {
    // Only apply to Supabase API calls
    if (typeof url === 'string' && url.includes('supabase.co')) {
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
            throw new Error('Délai de connexion dépassé. Vérifiez votre connexion internet.')
          }
          throw err
        })
    }
    return originalFetch(url, options)
  }
}

export default sb
