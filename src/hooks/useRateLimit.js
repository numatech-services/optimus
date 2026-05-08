import { useState, useCallback, useRef } from 'react'

/**
 * Rate limit hook — prevents rapid-fire form submissions.
 * Usage: const { isLimited, checkLimit } = useRateLimit(3, 60000) // 3 attempts per minute
 */
export default function useRateLimit(maxAttempts = 5, windowMs = 60000) {
  const attemptsRef = useRef([])
  const [isLimited, setIsLimited] = useState(false)

  const checkLimit = useCallback(() => {
    const now = Date.now()
    // Remove expired attempts
    attemptsRef.current = attemptsRef.current.filter(t => now - t < windowMs)
    
    if (attemptsRef.current.length >= maxAttempts) {
      setIsLimited(true)
      setTimeout(() => setIsLimited(false), windowMs)
      return false // blocked
    }
    
    attemptsRef.current.push(now)
    return true // allowed
  }, [maxAttempts, windowMs])

  return { isLimited, checkLimit }
}
