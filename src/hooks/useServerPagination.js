import { useState, useCallback } from 'react'

/**
 * Server-side pagination hook for Supabase
 * 
 * Usage:
 *   const { page, pageSize, from, to, totalPages, setPage, setTotal } = useServerPagination(25)
 *   
 *   // In your query:
 *   const { data, count } = await supabase.from('students')
 *     .select('*', { count: 'exact' })
 *     .range(from, to)
 *   setTotal(count)
 */
export default function useServerPagination(initialPageSize = 25) {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(0)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const totalPages = Math.ceil(total / pageSize)

  const goTo = useCallback((p) => {
    setPage(Math.max(1, Math.min(p, totalPages || 1)))
  }, [totalPages])

  const next = useCallback(() => goTo(page + 1), [page, goTo])
  const prev = useCallback(() => goTo(page - 1), [page, goTo])

  return { page, pageSize, from, to, total, totalPages, setPage: goTo, setTotal, next, prev }
}
