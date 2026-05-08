import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Offline Queue Hook — Optimus Campus
 * 
 * Stores failed Supabase operations when offline and replays them when connectivity returns.
 * Critical for Niger where 3G drops are frequent during form submissions.
 * 
 * Usage:
 *   const { enqueue, pending, isOnline } = useOfflineQueue()
 *   
 *   // In your save handler:
 *   const { error } = await supabase.from('students').insert([data])
 *   if (error && !navigator.onLine) {
 *     enqueue({ table: 'students', action: 'insert', data: [data] })
 *     showToast("Sauvegardé hors ligne — sera envoyé à la reconnexion")
 *   }
 */
export default function useOfflineQueue() {
  const [pending, setPending] = useState([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const processingRef = useRef(false)
  const supabaseRef = useRef(null)

  // Lazy import supabase to avoid circular deps
  useEffect(() => {
    import('../lib/supabase').then(mod => {
      supabaseRef.current = mod.supabase
    })
  }, [])

  // Listen to connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      processQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Process queued operations
  const processQueue = useCallback(async () => {
    if (processingRef.current || !supabaseRef.current) return
    processingRef.current = true

    const queue = [...pending]
    const failed = []

    for (const op of queue) {
      try {
        const supabase = supabaseRef.current
        let result

        if (op.action === 'insert') {
          result = await supabase.from(op.table).insert(op.data)
        } else if (op.action === 'update') {
          result = await supabase.from(op.table).update(op.data).eq('id', op.id)
        } else if (op.action === 'upsert') {
          result = await supabase.from(op.table).upsert(op.data)
        } else if (op.action === 'delete') {
          result = await supabase.from(op.table).delete().eq('id', op.id)
        }

        if (result?.error) {
          console.error(`[OfflineQueue] Failed to replay: ${op.table}.${op.action}`, result.error.message)
          failed.push(op)
        }
      } catch (err) {
        console.error(`[OfflineQueue] Network error on replay:`, err.message)
        failed.push(op)
      }
    }

    setPending(failed)
    processingRef.current = false

    if (queue.length > failed.length) {
      const synced = queue.length - failed.length
      // Dispatch custom event for toast notification
      window.dispatchEvent(new CustomEvent('offline-sync', { 
        detail: { synced, remaining: failed.length }
      }))
    }
  }, [pending])

  // Enqueue a failed operation
  const enqueue = useCallback((operation) => {
    setPending(prev => [...prev, {
      ...operation,
      timestamp: Date.now(),
      id: operation.id || `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }])
  }, [])

  // Clear the queue
  const clearQueue = useCallback(() => setPending([]), [])

  return {
    enqueue,
    pending,
    pendingCount: pending.length,
    isOnline,
    clearQueue,
    processQueue,
  }
}
