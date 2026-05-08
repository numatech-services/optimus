import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const REQUIRED_COLS = ['nom', 'prenom']
const OPTIONAL_COLS = ['email', 'telephone', 'filiere', 'annee', 'genre', 'status', 'type_formation', 'est_boursier', 'type_bourse']
const BATCH_SIZE = 50

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [], error: 'Le fichier doit contenir au moins un en-tête et une ligne de données.' }

  // Detect separator (comma, semicolon, tab)
  const firstLine = lines[0]
  const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

  const headers = firstLine.split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map(v => v.trim().replace(/^['"]|['"]$/g, ''))
    if (values.length < 2 || values.every(v => !v)) continue
    const row = {}
    headers.forEach((h, j) => { row[h] = values[j] || '' })
    rows.push(row)
  }

  return { headers, rows, error: null }
}

function validateRow(row, index) {
  const errors = []
  if (!row.nom?.trim()) errors.push(`Ligne ${index + 1}: nom manquant`)
  if (!row.prenom?.trim()) errors.push(`Ligne ${index + 1}: prénom manquant`)
  if (row.email && !row.email.includes('@')) errors.push(`Ligne ${index + 1}: email invalide "${row.email}"`)
  if (row.genre && !['M', 'F'].includes(row.genre.toUpperCase())) errors.push(`Ligne ${index + 1}: genre doit être M ou F`)
  return errors
}

export default function CSVImporter({ tenantId, onComplete, onClose }) {
  const [step, setStep] = useState('upload') // upload | preview | importing | done
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState({ headers: [], rows: [] })
  const [validationErrors, setValidationErrors] = useState([])
  const [progress, setProgress] = useState(0)
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, errors: [] })
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.name.endsWith('.csv') && !f.name.endsWith('.txt')) {
      return alert('Veuillez sélectionner un fichier .csv')
    }

    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers, rows, error } = parseCSV(ev.target.result)
      if (error) return alert(error)

      // Check required columns exist
      const missing = REQUIRED_COLS.filter(c => !headers.includes(c))
      if (missing.length > 0) {
        return alert(`Colonnes manquantes dans le CSV: ${missing.join(', ')}\n\nColonnes détectées: ${headers.join(', ')}`)
      }

      // Validate all rows
      const allErrors = []
      rows.forEach((row, i) => {
        allErrors.push(...validateRow(row, i))
      })

      setParsed({ headers, rows })
      setValidationErrors(allErrors)
      setStep('preview')
    }
    reader.readAsText(f, 'UTF-8')
  }

  const handleImport = async () => {
    setStep('importing')
    setProgress(0)

    const rows = parsed.rows
    const total = rows.length
    let success = 0
    let failed = 0
    const errors = []

    // Process in batches
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
        id: 'ETU-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
        nom: row.nom?.trim(),
        prenom: row.prenom?.trim(),
        email: row.email?.trim() || null,
        tel: row.telephone?.trim() || row.tel?.trim() || null,
        filiere: row.filiere?.trim() || null,
        annee: row.annee?.trim() || null,
        genre: row.genre?.toUpperCase()?.trim() || null,
        status: row.status?.toUpperCase()?.trim() || 'ACTIF',
        type_formation: row.type_formation?.trim() || 'Formation Initiale',
        est_boursier: row.est_boursier === 'true' || row.est_boursier === 'oui' || row.est_boursier === '1',
        type_bourse: row.type_bourse?.trim() || null,
        tenant_id: tenantId,
      }))

      try {
        const { error } = await supabase.from('students').insert(batch)
        if (error) {
          failed += batch.length
          errors.push(`Lot ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        } else {
          success += batch.length
        }
      } catch (err) {
        failed += batch.length
        errors.push(`Lot ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`)
      }

      setProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100)))

      // Small delay to avoid rate limiting on Supabase Free
      if (i + BATCH_SIZE < total) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    setImportResult({ success, failed, errors })
    setProgress(100)
    setStep('done')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 600, borderRadius: 16, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>📥 Import CSV massif</div>
            <div style={{ fontSize: '.78rem', color: 'var(--slate)', marginTop: 2 }}>
              {step === 'upload' && 'Sélectionnez un fichier CSV'}
              {step === 'preview' && `${parsed.rows.length} lignes détectées`}
              {step === 'importing' && `Import en cours... ${progress}%`}
              {step === 'done' && 'Import terminé'}
            </div>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--slate)' }}>×</button>
          )}
        </div>

        <div style={{ padding: 24 }}>
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 14, padding: 40,
                  textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                  background: 'var(--bg)'
                }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)' }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; if (e.dataTransfer.files[0]) { const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); fileRef.current.files = dt.files; handleFile({ target: { files: e.dataTransfer.files } }) } }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
                <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.95rem', marginBottom: 6 }}>Glissez votre fichier CSV ici</div>
                <div style={{ fontSize: '.82rem', color: 'var(--slate)' }}>ou cliquez pour parcourir</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />

              <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--primary-light)', borderRadius: 12, fontSize: '.82rem', color: 'var(--primary)', lineHeight: 1.6 }}>
                <strong>Format attendu :</strong> nom, prenom (obligatoires), email, telephone, filiere, annee, genre (M/F), status, type_formation, est_boursier, type_bourse
              </div>
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <div>
              {validationErrors.length > 0 && (
                <div style={{ padding: '12px 16px', background: 'var(--red-light)', borderRadius: 10, marginBottom: 16, maxHeight: 120, overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '.82rem', marginBottom: 6 }}>⚠️ {validationErrors.length} avertissement(s)</div>
                  {validationErrors.slice(0, 10).map((e, i) => (
                    <div key={i} style={{ fontSize: '.78rem', color: 'var(--red)', marginBottom: 2 }}>{e}</div>
                  ))}
                  {validationErrors.length > 10 && <div style={{ fontSize: '.78rem', color: 'var(--red)' }}>...et {validationErrors.length - 10} autres</div>}
                </div>
              )}

              <div style={{ fontSize: '.85rem', marginBottom: 16 }}>
                <strong>{parsed.rows.length}</strong> étudiants à importer · Colonnes: <code style={{ background: 'var(--mist)', padding: '2px 6px', borderRadius: 4, fontSize: '.78rem' }}>{parsed.headers.join(', ')}</code>
              </div>

              {/* Preview table */}
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
                <table role="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr>{parsed.headers.slice(0, 5).map(h => <th key={h} style={{ padding: '8px 10px', background: 'var(--bg)', textAlign: 'left', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', fontSize: '.68rem' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>{parsed.headers.slice(0, 5).map(h => <td key={h} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-light)' }}>{row[h]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > 5 && <div style={{ padding: '8px 10px', fontSize: '.75rem', color: 'var(--slate)', textAlign: 'center' }}>...et {parsed.rows.length - 5} autres lignes</div>}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => { setStep('upload'); setFile(null); setParsed({ headers: [], rows: [] }) }}>← Retour</button>
                <button className="btn btn-primary" onClick={handleImport} style={{ flex: 1 }}>
                  📥 Importer {parsed.rows.length} étudiants
                </button>
              </div>
            </div>
          )}

          {/* STEP: Importing */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏳</div>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12 }}>Import en cours...</div>
              <div style={{ background: 'var(--mist)', borderRadius: 10, height: 12, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 10, transition: 'width .3s ease', width: `${progress}%` }} />
              </div>
              <div style={{ fontSize: '.85rem', color: 'var(--slate)' }}>{progress}% — Veuillez ne pas fermer cette fenêtre</div>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>{importResult.failed === 0 ? '✅' : '⚠️'}</div>
              <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
                {importResult.failed === 0 ? 'Import réussi !' : 'Import terminé avec des erreurs'}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ padding: '12px 20px', background: 'var(--green-light)', borderRadius: 10 }}>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#18753C' }}>{importResult.success}</div>
                  <div style={{ fontSize: '.75rem', color: '#18753C' }}>importés</div>
                </div>
                {importResult.failed > 0 && (
                  <div style={{ padding: '12px 20px', background: 'var(--red-light)', borderRadius: 10 }}>
                    <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--red)' }}>{importResult.failed}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--red)' }}>échoués</div>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div style={{ textAlign: 'left', padding: '10px 14px', background: 'var(--red-light)', borderRadius: 10, marginBottom: 16, maxHeight: 100, overflowY: 'auto', fontSize: '.78rem', color: 'var(--red)' }}>
                  {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              <button className="btn btn-primary" onClick={() => { onComplete?.(); onClose() }}>Fermer et actualiser</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
