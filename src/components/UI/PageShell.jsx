// Shared shell: KPIs + tabs + search — used by all sub-pages
export function KPIRow({ items }) {
  return (
    <div className="kpi-grid" style={{ marginBottom:24 }}>
      {items.map((k,i) => (
        <div className="kpi-card" key={i}>
          <div style={{ display:'flex',justifyContent:'space-between' }}>
            <div className="kpi-label">{k.label}</div>
            <span style={{ fontSize:'1.3rem' }}>{k.icon}</span>
          </div>
          <div className="kpi-value" style={{ color:k.color||'var(--ink)' }}>{k.value}</div>
          <div className="kpi-sub">{k.sub||''}</div>
        </div>
      ))}
    </div>
  )
}

export function SectionCard({ title, action, children, style }) {
  return (
    <div className="card" style={{ marginBottom:20,...style }}>
      <div style={{ padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12 }}>
        <div className="section-title">{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder='🔍 Rechercher…', extra }) {
  return (
    <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
      <input className="form-input" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}
        style={{ flex:1,minWidth:200,padding:'9px 14px',fontSize:'.85rem' }}/>
      {extra}
    </div>
  )
}

export function StatusBadge({ status, map }) {
  const entry = map[status] || { label:status, color:'badge-slate' }
  return <span className={`badge ${entry.color}`}>{entry.label||status}</span>
}

export function EmptyState({ icon='📭', text='Aucun résultat trouvé', sub='' }) {
  return (
    <div style={{ textAlign:'center',padding:'48px 24px',color:'var(--slate)' }}>
      <div style={{ fontSize:'3rem',marginBottom:12 }}>{icon}</div>
      <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize:'1rem',color:'var(--ink)',marginBottom:4 }}>{text}</div>
      {sub && <div style={{ fontSize:'.85rem' }}>{sub}</div>}
    </div>
  )
}
