/**
 * Pagination — composant réutilisable pour toutes les pages de listes.
 * 
 * Props:
 *   page, totalPages, total, pageSize — from usePagination
 *   onNext, onPrev, onGoTo — navigation callbacks
 *   onPageSizeChange — optional, to change items per page
 */
export default function Pagination({ page, totalPages, total, pageSize, onNext, onPrev, onGoTo, onPageSizeChange }) {
  if (totalPages <= 1 && total <= pageSize) return null

  // Generate page numbers to show (max 7 buttons)
  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0', gap: 12, flexWrap: 'wrap'
    }}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Info */}
      <div style={{ fontSize: '.8rem', color: 'var(--slate)' }}>
        {total > 0 ? (
          <>Affichage {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} sur <strong>{total.toLocaleString('fr')}</strong></>
        ) : 'Aucun résultat'}
      </div>

      {/* Page buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={onPrev}
          disabled={page === 1}
          aria-label="Page précédente"
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--snow)',
            cursor: page === 1 ? 'not-allowed' : 'pointer',
            opacity: page === 1 ? 0.4 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.85rem', color: 'var(--ink-60)', transition: 'all .15s'
          }}
        >‹</button>

        {pages.map((p, i) => (
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--slate)', fontSize: '.8rem' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onGoTo(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              style={{
                width: 34, height: 34, borderRadius: 8,
                border: p === page ? 'none' : '1px solid var(--border)',
                background: p === page ? 'var(--primary)' : 'var(--snow)',
                color: p === page ? '#fff' : 'var(--ink-60)',
                fontWeight: p === page ? 700 : 500,
                fontSize: '.82rem', cursor: 'pointer',
                transition: 'all .15s'
              }}
            >{p}</button>
          )
        ))}

        <button
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Page suivante"
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--snow)',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            opacity: page >= totalPages ? 0.4 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.85rem', color: 'var(--ink-60)', transition: 'all .15s'
          }}
        >›</button>
      </div>

      {/* Page size selector */}
      {onPageSizeChange && (
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          aria-label="Nombre par page"
          style={{
            padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--border)',
            fontSize: '.8rem', color: 'var(--ink-60)',
            background: 'var(--snow)', cursor: 'pointer'
          }}
        >
          {[10, 25, 50, 100].map(n => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      )}
    </div>
  )
}
