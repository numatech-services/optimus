/**
 * Export Data Hook — Optimus Campus
 * Exports any dataset to CSV (universal) or triggers download.
 * 
 * Usage:
 *   const { exportCSV } = useExportData()
 *   exportCSV(data, columns, 'etudiants_2026')
 */

export function exportCSV(data, columns, filename = 'export') {
  if (!data || data.length === 0) return

  // Build headers
  const headers = columns.map(c => c.label || c.key)
  
  // Build rows
  const rows = data.map(item => 
    columns.map(c => {
      let val = c.accessor ? c.accessor(item) : item[c.key]
      if (val === null || val === undefined) val = ''
      // Escape CSV special chars
      val = String(val).replace(/"/g, '""')
      if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`
      return val
    })
  )

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
  
  // BOM for Excel UTF-8
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Import CSV and return parsed rows
 */
export function parseCSV(text) {
  const sep = text.includes(';') ? ';' : text.includes('\t') ? '\t' : ','
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [] }
  
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return obj
  })
  
  return { headers, rows }
}

export default { exportCSV, parseCSV }
