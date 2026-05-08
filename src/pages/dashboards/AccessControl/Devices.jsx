import { useState, useEffect } from 'react' // Ajout de useEffect
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Import client Supabase

export default function DevicesPage() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || user?.tenant
  const [devices, setDevices] = useState([])
  const [readers, setReaders] = useState([]) // État pour les lecteurs réels
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', ip:'', port:'4370', protocol:'TCP/IP', location:'' })
  const [testing, setTesting] = useState(null)
  const [testResult, setTestResult] = useState({})

  // ── 1. CHARGEMENT RÉEL ──
  useEffect(() => {
    fetchInfrastructureData()
  }, [tenantId])

  const fetchInfrastructureData = async () => {
    setLoading(true)
    try {
      const [resDev, resRead] = await Promise.all([
        supabase.from('devices').select('*').limit(500).eq('tenant_id', tenantId).order('id', { ascending: true }),
        supabase.from('readers').select('*').limit(500).eq('tenant_id', tenantId).order('id', { ascending: true })
      ])

      if (resDev.data) {
        // Mapping vers variables JS (Zéro omission)
        const mappedDevices = resDev.data.map(d => ({
          ...d,
          // On simule l'affichage des IDs de lecteurs liés pour le design
          readers: resRead.data?.filter(r => (r.controller_id || r.controller) === d.id).map(r => r.id) || []
        }))
        setDevices(mappedDevices)
      }
      if (resRead.data) {
        // Mappage controller_id  -> controller (JS) pour la table du bas
        setReaders(resRead.data.map(r => ({ ...r, controller: r.controller_id || r.controller })))
      }
    } catch (err) {
      console.error("Erreur de synchronisation infrastructure:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE UI (Simulation de test intacte) ──
  const testConnection = (id) => {
    setTesting(id)
    setTimeout(() => {
      setTestResult(prev => ({ ...prev, [id]: Math.random()>.2 ? 'OK' : 'FAIL' }))
      setTesting(null)
    }, 1200)
  }

  // ── 3. ACTIONS CRUD RÉELLES ──
  const toggleStatus = async (id) => {
    const device = devices.find(d => d.id === id)
    const newStatus = device.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'
    let requestError = null
    try {
      const { error } = await supabase
        .from('devices')
        .update({ status: newStatus })
        .eq('id', id)
      requestError = error
    } catch (err) {
      console.error("[Error]", err.message)
      requestError = err
    }
    if (!requestError) {
      fetchInfrastructureData()
    }
  }

  const addDevice = async () => {
    if(!form.name || !form.ip) return
    
    const newId = `CTR-${Math.floor(Math.random() * 900 + 100)}`
    const payload = {
      id: newId,
      name: form.name,
      ip: form.ip,
      port: parseInt(form.port),
      protocol: form.protocol,
      location: form.location,
      status: 'ONLINE',
      firmware: 'V3.4.2',
      tenant_id: tenantId,
    }

    let requestError = null
    try {
      const { error } = await supabase.from('devices').insert([payload])
      requestError = error
    } catch (err) {
      console.error("[Error]", err.message)
      requestError = err
    }

    if (!requestError) {
      setForm({ name:'', ip:'', port:'4370', protocol:'TCP/IP', location:'' })
      setShowAdd(false)
      fetchInfrastructureData()
    }
  }

  if (loading) return <DashLayout title="Matériel"><div>Initialisation de la console matérielle...</div></DashLayout>

  return (
    <DashLayout title="Gestion des contrôleurs" requiredRole="admin_universite">
      <div className="dash-page-title">🖥️ Gestion des contrôleurs physiques</div>
      <div className="dash-page-sub">Configuration des boîtiers de contrôle d'accès TCP/IP et RS485</div>

      {/* Info box - Design Intact */}
      <div className="alert alert-info" style={{ marginBottom:24 }}>
        <span>ℹ️</span>
        <div>
          <strong>Architecture matérielle</strong> — Chaque contrôleur pilote 1 à 4 lecteurs (QR/RFID).
          Protocoles supportés : <strong>TCP/IP</strong> (réseau LAN/Wi-Fi), <strong>RS485</strong> (filaire).
          Port par défaut : <strong>4370</strong> (ZKTeco / compatible Wiegand).
        </div>
      </div>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div className="section-title">Contrôleurs enregistrés</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>+ Ajouter un contrôleur</button>
        </div>

        {/* Formulaire d'ajout - Design Intact */}
        {showAdd && (
          <div style={{ padding:24,background:'var(--mist)',borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,marginBottom:16,fontSize:'.95rem' }}>Nouveau contrôleur</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16 }}>
              {[['Nom',      'name',     'Ex: Contrôleur Amphi B'],
                ['Adresse IP','ip',      '192.168.1.xxx'],
                ['Port',     'port',     '4370'],
                ['Emplacement','location','Ex: Amphi B — Entrée'],
              ].map(([label,key,ph]) => (
                <div key={key} className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" placeholder={ph} value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} />
                </div>
              ))}
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Protocole</label>
                <select className="form-input form-select" value={form.protocol} onChange={e => setForm(p=>({...p,protocol:e.target.value}))}>
                  <option>TCP/IP</option><option>RS485</option><option>USB</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button className="btn btn-primary btn-sm" onClick={addDevice}>Enregistrer</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Annuler</button>
            </div>
          </div>
        )}

        {/* Liste des terminaux - Design Intact */}
        <div style={{ padding:16 }}>
          {devices.map((d,i) => (
            <div key={i} style={{ border:'1px solid var(--border)',borderRadius:12,padding:20,marginBottom:14,background:'#fff' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14 }}>
                <div style={{ display:'flex',gap:14,alignItems:'center' }}>
                  <div style={{ width:44,height:44,borderRadius:10,background:d.status==='ONLINE'?'var(--green-light)':'var(--red-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem' }}>
                    🖥️
                  </div>
                  <div>
                    <div style={{ fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,fontSize: '1rem',color:'var(--ink)' }}>{d.name}</div>
                    <div style={{ fontSize:'.78rem',color:'var(--slate)' }}>{d.location}</div>
                  </div>
                </div>
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  <span className={`badge badge-${d.status==='ONLINE'?'green':'red'}`}>{d.status}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleStatus(d.id)}>
                    {d.status==='ONLINE' ? '⏸ Désactiver' : '▶ Activer'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => testConnection(d.id)} disabled={testing===d.id}>
                    {testing===d.id ? '⏳ Test...' : '🔌 Tester'}
                  </button>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
                {[['Protocole',d.protocol],['Adresse IP',d.ip],['Port',d.port||4370],['Lecteurs',d.readers?.join(', ')||'—']].map(([k,v])=>(
                  <div key={k} style={{ background:'var(--mist)',borderRadius:7,padding:'8px 12px' }}>
                    <div style={{ fontSize:'.68rem',color:'var(--slate)',fontFamily:'Marianne,Roboto,sans-serif',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:'.83rem',fontFamily:k==='Adresse IP'||k==='Port'?'monospace':'inherit',color:'var(--ink)',fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>
              {testResult[d.id] && (
                <div style={{ marginTop:12 }} className={`alert alert-${testResult[d.id]==='OK'?'success':'error'}`}>
                  {testResult[d.id]==='OK' ? '✅ Connexion établie — contrôleur répond correctement.' : '❌ Connexion échouée — vérifiez l\'adresse IP et le câblage réseau.'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Readers Table - Design Intact */}
      <div className="card">
        <div style={{ padding:'16px 24px',borderBottom:'1px solid var(--border)' }}>
          <div className="section-title">📡 Lecteurs par contrôleur</div>
        </div>
        <div className="table-wrap">
          <table role="table">
            <thead><tr><th>ID Lecteur</th><th>Nom</th><th>Contrôleur</th><th>Sens</th><th>Type</th><th>Statut</th></tr></thead>
            <tbody>
              {readers.map((r,i) => (
                <tr key={i}>
                  <td style={{ fontFamily:'monospace',fontSize:'.78rem' }}>{r.id}</td>
                  <td><strong style={{ color:'var(--ink)' }}>{r.name}</strong></td>
                  <td style={{ fontFamily:'monospace',fontSize:'.78rem' }}>{r.controller}</td>
                  <td><span className={`badge badge-${r.side==='entry'?'blue':'teal'}`}>{r.side==='entry'?'ENTRÉE':'SORTIE'}</span></td>
                  <td><span style={{ fontSize:'.78rem',fontWeight:600 }}>{r.type.toUpperCase()}</span></td>
                  <td><span className={`badge badge-${r.status==='ONLINE'?'green':'red'}`}>{r.status}</span></td>
                </tr>
              ))}
              {readers.length === 0 && <tr><td colSpan={6} style={{textAlign:'center', padding:20}}>Aucun lecteur enregistré</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  )
}
