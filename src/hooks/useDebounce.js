import { useState, useEffect } from 'react'

/**
 * Debounce a value — waits `delay`ms after last change before updating.
 * Usage: const debouncedSearch = useDebounce(search, 350)
 */
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
