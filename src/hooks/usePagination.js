import { useState, useCallback, useMemo } from 'react'

const DEFAULT_PAGE_SIZE = 25

/**
 * Server-side pagination helper for Supabase.
 * 
 * Usage:
 *   const { page, pageSize, from, to, totalPages, setTotal, next, prev, goTo, setPageSize } = usePagination(25)
 *   
 *   // In your Supabase query:
 *   supabase.from('students').select('*', { count: 'exact' }).range(from, to)
 *   
 *   // After query:
 *   setTotal(count)
 */
export default function usePagination(initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(0)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  // Supabase range indices (0-based, inclusive)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const next = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages))
  }, [totalPages])

  const prev = useCallback(() => {
    setPage(p => Math.max(p - 1, 1))
  }, [])

  const goTo = useCallback((p) => {
    setPage(Math.max(1, Math.min(p, totalPages)))
  }, [totalPages])

  const reset = useCallback(() => setPage(1), [])

  return {
    page,
    pageSize,
    from,
    to,
    total,
    totalPages,
    setTotal,
    setPageSize,
    next,
    prev,
    goTo,
    reset,
    // Helper: is this the first/last page?
    isFirst: page === 1,
    isLast: page >= totalPages,
  }
}
