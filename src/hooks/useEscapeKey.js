import { useEffect } from 'react'

export default function useEscapeKey(callback) {
  useEffect(() => {
    if (!callback) return
    const handler = (e) => { if (e.key === 'Escape') callback() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [callback])
}
