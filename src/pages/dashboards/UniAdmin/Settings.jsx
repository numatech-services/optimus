import { useState, useEffect } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

const TABS = [
  { id: 'general', label: '🏛️ Établissement', desc: 'Informations générales' },
  { id: 'frais', label: '💰 Frais & Bourses', desc: 'Grille tarifaire différenciée' },
  { id: 'notation', label: '📊 Calcul des notes', desc: 'Système de notation LMD' },
  { id: 'formations', label: '🎓 Formations', desc: 'Types de formations et bourses' },
  { id: 'paiements', label: '💳 Paiements', desc: 'Méthodes acceptées' },
  { id: 'notifs', label: '🔔 Notifications', desc: 'Alertes et emails' },
]

const DEFAULT_GRILLE = {
  formation_initiale: {
    boursier: { inscription: 0, scolarite: 0, examen: 0, bibliotheque: 0 },
    non_boursier: { inscription: 15000, scolarite: 50000, examen: 5000, bibliotheque: 3000 }
  },
  formation_continue: {
    boursier: { inscription: 0, scolarite: 0, examen: 0, bibliotheque: 0 },
    non_boursier: { inscription: 25000, scolarite: 150000, examen: 10000, bibliotheque: 5000 }
  }
}

const DEFAULT_FRAIS_ADD = { sport: 2000, assurance: 3000, carte_etudiant: 1500, dossier_administratif: 2500 }

const DEFAULT_NOTATION = {
  type: 'LMD', note_max: 20, note_validation: 10, note_rattrapage: 8,
  coefficient_cc: 0.4, coefficient_examen: 0.6,
  credits_licence: 180, credits_master: 120,
  mentions: [
    { seuil: 16, label: 'Très Bien' }, { seuil: 14, label: 'Bien' },
    { seuil: 12, label: 'Assez Bien' }, { seuil: 10, label: 'Passable' }
  ],
  compensation_ue: true, seuil_compensation: 8
}

function Field({ label, value, onChange, type = 'text', options, suffix, disabled, small }) {
  return (
    <div style={{ marginBottom: small ? 10 : 16 }}>
      <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--ink-60)', marginBottom: 5 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {options ? (
          <select className="form-input form-select" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
            {options.map(o => <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.label}</option>)}
          </select>
        ) : (
          <input className="form-input" type={type} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} disabled={disabled} style={suffix ? { paddingRight: 52 } : {}} />
        )}
        {suffix && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '.75rem', color: 'var(--slate)', fontWeight: 600 }}>{suffix}</span>}
      </div>
    </div>
  )
}

function FraisTable({ title, data, onChange, color }) {
  const labels = { inscription: 'Inscription', scolarite: 'Scolarité', examen: 'Examens', bibliotheque: 'Bibliothèque' }
  return (
    <div style={{ background: '#fff', border: `1px solid var(--border)`, borderRadius: 14, padding: 20, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.9rem', color: 'var(--ink)', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
        {Object.entries(data).map(([key, val]) => (
          <div key={key}>
            <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 3, display: 'block' }}>{labels[key] || key}</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type="number" value={val} onChange={e => onChange(key, Number(e.target.value))} style={{ paddingRight: 42, padding: '8px 42px 8px 12px', fontSize: '.85rem' }} />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '.7rem', color: 'var(--slate)' }}>XOF</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: '.78rem', color: 'var(--slate)', textAlign: 'right' }}>
        Total: <strong style={{ color: 'var(--ink)' }}>{Object.values(data).reduce((a, b) => a + b, 0).toLocaleString('fr')} FCFA</strong>
      </div>
    </div>
  )
}

export default function UniAdminSettings() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || 'univ-niamey'

  const [tab, setTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // États
  const [general, setGeneral] = useState({
    nom: '', type_etablissement: 'PUBLIC', adresse: '', ville: 'Niamey',
    telephone: '', email: '', siteWeb: '', annee_academique: '2025-2026', devise: 'XOF'
  })
  const [grilleFrais, setGrilleFrais] = useState(DEFAULT_GRILLE)
  const [fraisAdd, setFraisAdd] = useState(DEFAULT_FRAIS_ADD)
  const [notation, setNotation] = useState(DEFAULT_NOTATION)
  const [formations, setFormations] = useState(['Formation Initiale', 'Formation Continue'])
  const [typesBourse, setTypesBourse] = useState(["Bourse d'État", "Bourse ANAB", "Bourse d'excellence", "Exonéré"])
  const [methodesPaiement, setMethodesPaiement] = useState(['Espèces', 'Airtel Money', 'NITA', 'AMANA', 'Virement bancaire'])
  const [notifs, setNotifs] = useState({
    emailImpaye: true, emailInscription: true, smsExamen: false, emailResultat: true, emailAcces: false
  })

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  // ── CHARGEMENT ──
  useEffect(() => {
    loadConfig()
  }, [tenantId])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const [resTenant, resConfig] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', tenantId).single(),
        supabase.from('tenant_config').select('*').eq('tenant_id', tenantId).single()
      ])

      if (resTenant.data) {
        const t = resTenant.data
        setGeneral(g => ({ ...g, nom: t.name, ville: t.country === 'Niger' ? 'Niamey' : '', telephone: t.telephone || '', email: t.email || '' }))
      }

      if (resConfig.data) {
        const c = resConfig.data
        if (c.type_etablissement) setGeneral(g => ({ ...g, type_etablissement: c.type_etablissement, annee_academique: c.annee_academique || g.annee_academique }))
        if (c.grille_frais) setGrilleFrais(c.grille_frais)
        if (c.frais_additionnels) setFraisAdd(c.frais_additionnels)
        if (c.systeme_notation) setNotation(c.systeme_notation)
        if (c.formations) setFormations(c.formations)
        if (c.types_bourse) setTypesBourse(c.types_bourse)
        if (c.types_bourse) setTypesBourse(c.types_bourse)
        if (c.methodes_paiement) setMethodesPaiement(c.methodes_paiement)
        if (c.notifications) setNotifs(c.notifications)
      }
    } catch (err) {
      console.error('[Settings] Erreur:', err.message)
    }
    setLoading(false)
  }

  // ── SAUVEGARDE ──
  const handleSave = async (section) => {
    try {
      let payload = {}
      let saveError = null

      if (section === 'general') {
        const { error } = await supabase.from('tenants').update({ name: general.nom }).eq('id', tenantId)
        if (error) throw error
        payload = { type_etablissement: general.type_etablissement, annee_academique: general.annee_academique }
      }
      if (section === 'frais') payload = { grille_frais: grilleFrais, frais_additionnels: fraisAdd }
      if (section === 'notation') payload = { systeme_notation: notation }
      if (section === 'formations') payload = { formations, types_bourse: typesBourse }
      if (section === 'paiements') payload = { methodes_paiement: methodesPaiement }
      if (section === 'notifs') payload = { notifications: notifs }

      if (Object.keys(payload).length > 0) {
        try {
          const { error } = await supabase.from('tenant_config').upsert({ tenant_id: tenantId, ...payload, updated_at: new Date().toISOString() })
          saveError = error
        } catch (err) {
          console.error("[Error]", err.message)
          saveError = err
        }
        if (saveError) throw saveError
      }

      showToast(`Paramètres ${section} enregistrés`)
    } catch (err) {
      console.error('[Settings] Erreur:', err.message)
      showToast('Erreur de sauvegarde', 'error')
    }
  }

  const updateGrille = (formation, type, key, val) => {
    setGrilleFrais(prev => ({ ...prev, [formation]: { ...prev[formation], [type]: { ...prev[formation][type], [key]: val } } }))
  }

  if (loading) return <DashLayout title="Paramètres"><div style={{ padding: 60, textAlign: 'center', color: 'var(--slate)' }}>Chargement de la configuration...</div></DashLayout>

  return (
    <DashLayout title="Paramètres de l'établissement">
      {toast && /* role=status for screen readers */ (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? 'var(--red-light)' : 'var(--green-light)', color: toast.type === 'error' ? 'var(--red)' : '#18753C', padding: '14px 22px', borderRadius: 14, fontWeight: 600, fontSize: '.85rem', boxShadow: '0 8px 24px rgba(0,0,0,.08)', border: `1px solid ${toast.type === 'error' ? '#FCC' : '#C6E0CC'}` }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <div className="dash-page-title">Paramètres</div>
      <div className="dash-page-sub">Configuration avancée de votre établissement</div>

      {/* Badge type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <span className={`badge ${general.type_etablissement === 'PUBLIC' ? 'badge-blue' : general.type_etablissement === 'PRIVE' ? 'badge-purple' : 'badge-teal'}`}>
          {general.type_etablissement}
        </span>
        <span className="badge badge-slate">{general.annee_academique}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        {/* Tabs sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--primary-light)' : 'transparent',
              color: tab === t.id ? 'var(--primary)' : 'var(--ink-60)',
              transition: 'all .15s', textAlign: 'left'
            }}>
              <span style={{ fontSize: '.85rem', fontWeight: tab === t.id ? 700 : 500 }}>{t.label}</span>
              <span style={{ fontSize: '.7rem', color: 'var(--slate)', marginTop: 2 }}>{t.desc}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card card-p" style={{ minHeight: 400 }}>

          {/* ═══ GÉNÉRAL ═══ */}
          {tab === 'general' && (
            <div>
              <div className="section-title" style={{ marginBottom: 20 }}>Informations de l'établissement</div>
              <div className="grid-2">
                <Field label="Nom de l'établissement" value={general.nom} onChange={v => setGeneral(p => ({ ...p, nom: v }))} />
                <Field label="Type d'établissement" value={general.type_etablissement} onChange={v => setGeneral(p => ({ ...p, type_etablissement: v }))}
                  options={[{ value: 'PUBLIC', label: '🏛️ Public' }, { value: 'PRIVE', label: '🏢 Privé' }, { value: 'SEMI_PUBLIC', label: '🤝 Semi-public' }]} />
              </div>
              <div className="grid-2">
                <Field label="Ville" value={general.ville} onChange={v => setGeneral(p => ({ ...p, ville: v }))} />
                <Field label="Année académique" value={general.annee_academique} onChange={v => setGeneral(p => ({ ...p, annee_academique: v }))} />
              </div>
              <div className="grid-2">
                <Field label="Téléphone" value={general.telephone} onChange={v => setGeneral(p => ({ ...p, telephone: v }))} />
                <Field label="Email" value={general.email} onChange={v => setGeneral(p => ({ ...p, email: v }))} type="email" />
              </div>
              <button className="btn btn-primary" onClick={() => handleSave('general')} style={{ marginTop: 8 }}>💾 Enregistrer</button>
            </div>
          )}

          {/* ═══ FRAIS & BOURSES ═══ */}
          {tab === 'frais' && (
            <div>
              <div className="section-title">Grille tarifaire différenciée</div>
              <div className="section-sub" style={{ marginBottom: 24 }}>Frais en FCFA par type de formation et statut boursier</div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', color: 'var(--ink)', marginBottom: 12 }}>📚 Formation Initiale</div>
                <div className="grid-2">
                  <FraisTable title="🎓 Non-boursier" data={grilleFrais.formation_initiale.non_boursier} color="var(--primary)"
                    onChange={(k, v) => updateGrille('formation_initiale', 'non_boursier', k, v)} />
                  <FraisTable title="🏅 Boursier" data={grilleFrais.formation_initiale.boursier} color="var(--green)"
                    onChange={(k, v) => updateGrille('formation_initiale', 'boursier', k, v)} />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', color: 'var(--ink)', marginBottom: 12 }}>📖 Formation Continue</div>
                <div className="grid-2">
                  <FraisTable title="🎓 Non-boursier" data={grilleFrais.formation_continue.non_boursier} color="var(--amber)"
                    onChange={(k, v) => updateGrille('formation_continue', 'non_boursier', k, v)} />
                  <FraisTable title="🏅 Boursier" data={grilleFrais.formation_continue.boursier} color="var(--teal)"
                    onChange={(k, v) => updateGrille('formation_continue', 'boursier', k, v)} />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', color: 'var(--ink)', marginBottom: 12 }}>📋 Frais additionnels (tous étudiants)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {Object.entries(fraisAdd).map(([key, val]) => (
                    <div key={key}>
                      <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 3, display: 'block' }}>
                        {key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input className="form-input" type="number" value={val} onChange={e => setFraisAdd(p => ({ ...p, [key]: Number(e.target.value) }))} style={{ paddingRight: 42 }} />
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '.7rem', color: 'var(--slate)' }}>XOF</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={() => handleSave('frais')}>💾 Enregistrer la grille tarifaire</button>
            </div>
          )}

          {/* ═══ CALCUL DES NOTES ═══ */}
          {tab === 'notation' && (
            <div>
              <div className="section-title">Système de calcul des notes</div>
              <div className="section-sub" style={{ marginBottom: 24 }}>Configuration du système LMD et des règles de validation</div>

              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card card-p" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', marginBottom: 14 }}>📐 Barème</div>
                  <Field label="Note maximale" value={notation.note_max} onChange={v => setNotation(p => ({ ...p, note_max: v }))} type="number" suffix="/20" small />
                  <Field label="Seuil de validation" value={notation.note_validation} onChange={v => setNotation(p => ({ ...p, note_validation: v }))} type="number" suffix="/20" small />
                  <Field label="Seuil de rattrapage" value={notation.note_rattrapage} onChange={v => setNotation(p => ({ ...p, note_rattrapage: v }))} type="number" suffix="/20" small />
                </div>
                <div className="card card-p" style={{ borderLeft: '4px solid var(--green)' }}>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', marginBottom: 14 }}>⚖️ Pondération</div>
                  <Field label="Coefficient CC (contrôle continu)" value={notation.coefficient_cc} onChange={v => setNotation(p => ({ ...p, coefficient_cc: v }))} type="number" suffix="%" small />
                  <Field label="Coefficient Examen" value={notation.coefficient_examen} onChange={v => setNotation(p => ({ ...p, coefficient_examen: v }))} type="number" suffix="%" small />
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--mist)', borderRadius: 8, fontSize: '.78rem', color: 'var(--slate)' }}>
                    Note finale = CC × {notation.coefficient_cc} + Examen × {notation.coefficient_examen}
                  </div>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card card-p" style={{ borderLeft: '4px solid var(--amber)' }}>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', marginBottom: 14 }}>🎓 Crédits ECTS</div>
                  <Field label="Crédits Licence (L1→L3)" value={notation.credits_licence} onChange={v => setNotation(p => ({ ...p, credits_licence: v }))} type="number" small />
                  <Field label="Crédits Master (M1→M2)" value={notation.credits_master} onChange={v => setNotation(p => ({ ...p, credits_master: v }))} type="number" small />
                </div>
                <div className="card card-p" style={{ borderLeft: '4px solid var(--purple)' }}>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', marginBottom: 14 }}>🏅 Mentions</div>
                  {notation.mentions.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input className="form-input" type="number" value={m.seuil} style={{ width: 60, padding: '6px 8px', textAlign: 'center' }}
                        onChange={e => {
                          const updated = [...notation.mentions]
                          updated[i] = { ...updated[i], seuil: Number(e.target.value) }
                          setNotation(p => ({ ...p, mentions: updated }))
                        }} />
                      <span style={{ fontSize: '.75rem', color: 'var(--slate)' }}>→</span>
                      <input className="form-input" value={m.label} style={{ padding: '6px 10px', flex: 1 }}
                        onChange={e => {
                          const updated = [...notation.mentions]
                          updated[i] = { ...updated[i], label: e.target.value }
                          setNotation(p => ({ ...p, mentions: updated }))
                        }} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 18px', background: 'var(--mist)', borderRadius: 12, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem' }}>
                  <input type="checkbox" checked={notation.compensation_ue} onChange={e => setNotation(p => ({ ...p, compensation_ue: e.target.checked }))} />
                  Autoriser la compensation entre UE
                </label>
                {notation.compensation_ue && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '.78rem', color: 'var(--slate)' }}>Seuil minimum :</span>
                    <input className="form-input" type="number" value={notation.seuil_compensation} style={{ width: 60, padding: '4px 8px', textAlign: 'center' }}
                      onChange={e => setNotation(p => ({ ...p, seuil_compensation: Number(e.target.value) }))} />
                    <span style={{ fontSize: '.78rem', color: 'var(--slate)' }}>/20</span>
                  </div>
                )}
              </div>

              <button className="btn btn-primary" onClick={() => handleSave('notation')}>💾 Enregistrer le système de notation</button>
            </div>
          )}

          {/* ═══ FORMATIONS ═══ */}
          {tab === 'formations' && (
            <div>
              <div className="section-title">Types de formations</div>
              <div className="section-sub" style={{ marginBottom: 24 }}>Gérez les formations et les types de bourse reconnus</div>

              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card card-p" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', marginBottom: 14 }}>📚 Formations proposées</div>
                  {formations.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input className="form-input" value={f} style={{ padding: '8px 12px', flex: 1 }}
                        onChange={e => { const u = [...formations]; u[i] = e.target.value; setFormations(u) }} />
                      <button onClick={() => setFormations(formations.filter((_, j) => j !== i))} style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => setFormations([...formations, ''])} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>+ Ajouter une formation</button>
                </div>

                <div className="card card-p" style={{ borderLeft: '4px solid var(--green)' }}>
                  <div style={{ fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', marginBottom: 14 }}>🏅 Types de bourse reconnus</div>
                  {typesBourse.map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input className="form-input" value={b} style={{ padding: '8px 12px', flex: 1 }}
                        onChange={e => { const u = [...typesBourse]; u[i] = e.target.value; setTypesBourse(u) }} />
                      <button onClick={() => setTypesBourse(typesBourse.filter((_, j) => j !== i))} style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => setTypesBourse([...typesBourse, ''])} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>+ Ajouter un type de bourse</button>
                </div>
              </div>

              <button className="btn btn-primary" onClick={() => handleSave('formations')}>💾 Enregistrer</button>
            </div>
          )}

          {/* ═══ PAIEMENTS ═══ */}
          {tab === 'paiements' && (
            <div>
              <div className="section-title">Méthodes de paiement acceptées</div>
              <div className="section-sub" style={{ marginBottom: 24 }}>Configurez les moyens de paiement disponibles pour les étudiants</div>

              {methodesPaiement.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '1.1rem', width: 30, textAlign: 'center' }}>
                    {m.includes('Airtel') ? '📱' : m.includes('NITA') ? '💸' : m.includes('AMANA') ? '💸' : m.includes('Virement') ? '🏦' : '💵'}
                  </span>
                  <input className="form-input" value={m} style={{ padding: '10px 14px', flex: 1 }}
                    onChange={e => { const u = [...methodesPaiement]; u[i] = e.target.value; setMethodesPaiement(u) }} />
                  <button onClick={() => setMethodesPaiement(methodesPaiement.filter((_, j) => j !== i))} style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                </div>
              ))}
              <button onClick={() => setMethodesPaiement([...methodesPaiement, ''])} className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>+ Ajouter une méthode</button>

              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary" onClick={() => handleSave('paiements')}>💾 Enregistrer</button>
              </div>
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {tab === 'notifs' && (
            <div>
              <div className="section-title">Paramètres de notification</div>
              <div className="section-sub" style={{ marginBottom: 24 }}>Activez ou désactivez les alertes automatiques</div>

              {[
                { key: 'emailImpaye', label: 'Email automatique pour les impayés > 60 jours', icon: '💰' },
                { key: 'emailInscription', label: 'Email de confirmation d\'inscription', icon: '📝' },
                { key: 'smsExamen', label: 'SMS de rappel avant les examens', icon: '📱' },
                { key: 'emailResultat', label: 'Email de publication des résultats', icon: '📊' },
                { key: 'emailAcces', label: 'Alerte accès refusé (portique)', icon: '🚪' },
              ].map(n => (
                <div key={n.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', background: notifs[n.key] ? 'var(--primary-light)' : 'var(--mist)',
                  borderRadius: 12, marginBottom: 8, transition: 'all .2s',
                  border: `1px solid ${notifs[n.key] ? 'rgba(99,102,241,.15)' : 'transparent'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.2rem' }}>{n.icon}</span>
                    <span style={{ fontSize: '.88rem', color: 'var(--ink)', fontWeight: 500 }}>{n.label}</span>
                  </div>
                  <label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifs[n.key]} onChange={e => setNotifs(p => ({ ...p, [n.key]: e.target.checked }))}
                      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                    <div style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: notifs[n.key] ? 'var(--primary)' : '#d1d5db',
                      transition: 'background .2s', position: 'relative'
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 2, left: notifs[n.key] ? 22 : 2,
                        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.15)'
                      }} />
                    </div>
                  </label>
                </div>
              ))}
              
              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary" onClick={() => handleSave('notifs')}>💾 Enregistrer les notifications</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashLayout>
  )
}
