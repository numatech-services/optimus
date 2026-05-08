/**
 * Timeout wrapper for async operations.
 * On 3G Niger (RTT 300-800ms), Supabase calls can take 2-15s.
 * This wrapper ensures UI feedback after 8 seconds.
 */
export function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Délai de connexion dépassé. Vérifiez votre connexion internet.')), ms)
    ),
  ])
}

export default withTimeout
