/**
 * PaginationBar — compact pagination UI for tables
 * Works with useServerPagination hook
 */
export default function PaginationBar({ page, totalPages, total, pageSize, onPageChange }) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', fontSize: 14 }}>
      <span style={{ color: 'var(--slate)' }}>
        {from}–{to} sur {total}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="btn btn-sm btn-secondary" style={{ minWidth: 36, opacity: page <= 1 ? 0.4 : 1 }}>←</button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p
          if (totalPages <= 7) p = i + 1
          else if (page <= 4) p = i + 1
          else if (page >= totalPages - 3) p = totalPages - 6 + i
          else p = page - 3 + i
          return (
            <button key={p} onClick={() => onPageChange(p)} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`} style={{ minWidth: 36 }}>{p}</button>
          )
        })}
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="btn btn-sm btn-secondary" style={{ minWidth: 36, opacity: page >= totalPages ? 0.4 : 1 }}>→</button>
      </div>
    </div>
  )
}
