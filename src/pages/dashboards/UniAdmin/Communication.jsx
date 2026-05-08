import { useState, useEffect } from 'react'
import SkeletonLoader from '../../../components/UI/SkeletonLoader'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { notifyEvent } from '../../../utils/pushService'

const CIBLES = [
  { id: 'tous', label: 'Tout le monde' },
  { id: 'etudiants', label: 'Étudiants' },
  { id: 'enseignants', label: 'Enseignants' },
  { id: 'staff', label: 'Personnel' },
]

export default function Communication() {
  const { user } = useAuth()
  const tid = user?.tenant_id
  const [tab, setTab] = useState('annonces')
  const [annonces, setAnnonces] = useState([])
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [formA, setFormA] = useState({ titre: '', contenu: '', cible: 'tous', important: false })
  const [formM, setFormM] = useState({ destinataire_id: '', sujet: '', contenu: '' })

  const load = async () => {
    setLoading(true)
    const [{ data: ann }, { data: msg }, { data: usr }] = await Promise.all([
      supabase.from('annonces').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(500),
      supabase.from('messages').select('*').or(`expediteur_id.eq.${user?.id},destinataire_id.eq.${user?.id}`).order('created_at', { ascending: false }).limit(500),
      supabase.from('users').select('id, name, email, role').eq('tenant_id', tid).limit(500),
    ])
    if (ann) setAnnonces(ann)
    if (msg) setMessages(msg)
    if (usr) setUsers(usr)
    setLoading(false)
  }

  useEffect(() => { if (tid && user?.id) load() }, [tid, user?.id])

  const publishAnnonce = async () => {
    if (!formA.titre || !formA.contenu) return
    if (formA.titre.length < 3) return
    if (formA.contenu.length < 10) return
    try {
      await supabase.from('annonces').insert([{
        ...formA, auteur_id: user?.id, auteur_nom: user?.name, tenant_id: tid, publie: true,
      }])
    } catch (err) {
      console.error("[Error]", err.message)
    }
    // Envoyer push notification à tous les utilisateurs ciblés
    try {
      notifyEvent('announcement', { titre: formA.titre })
      
      // Envoyer email aux destinataires ciblés
      const targetRoles = formA.cible === 'tous' ? null 
        : formA.cible === 'etudiants' ? ['etudiant'] 
        : formA.cible === 'enseignants' ? ['enseignant'] 
        : ['scolarite','surveillant','bibliotheque','comptabilite']
      
        .from('users')
        .select('id, email, name')
        .eq('tenant_id', tid)
        .limit(500)
      if (targets) {
        const filtered = targetRoles ? targets.filter(u => targetRoles.includes(u.role)) : targets
        // Insérer les notifications en base pour chaque destinataire
        const notifs = filtered.map(u => ({
          type: 'announcement', role: u.role || 'etudiant',
          titre: '📢 ' + formA.titre, detail: formA.contenu,
          tenant_id: tid, canal: 'push',
        }))
        if (notifs.length > 0) {
          try {
            await supabase.from('notifications').insert(notifs.slice(0, 100))
          } catch (err) {
            console.error("[Error]", err.message)
          }
        }
      }
      try {
        const { data: targets } = await supabase
      } catch (err) {
        console.error("[Error]", err.message)
      }
    } catch (err) {
      console.error('[Communication] Push/email error:', err.message)
    }

    setModal(null)
    setFormA({ titre: '', contenu: '', cible: 'tous', important: false })
    load()
  }

  const sendMessage = async () => {
    if (!formM.destinataire_id || !formM.contenu) return
    if (formM.contenu.length < 2) return
    const dest = users.find(u => u.id === formM.destinataire_id)
    try {
      await supabase.from('messages').insert([{
        expediteur_id: user?.id, expediteur_nom: user?.name,
        destinataire_id: formM.destinataire_id, destinataire_nom: dest?.name || '',
        sujet: formM.sujet, contenu: formM.contenu, tenant_id: tid,
      }])
    } catch (err) {
      console.error("[Error]", err.message)
    }
    setModal(null)
    // Push notification au destinataire
    notifyEvent('message_received', { from: user?.name, subject: formM.sujet || 'Nouveau message' })
    
    setFormM({ destinataire_id: '', sujet: '', contenu: '' })
    load()
  }

  const markRead = async (id) => {
    try {
      await supabase.from('messages').update({ lu: true }).eq('id', id)
    } catch (err) {
      console.error("[Error]", err.message)
    }
    setMessages(prev => prev.map(m => m.id === id ? { ...m, lu: true } : m))
  }

  const unread = messages.filter(m => m.destinataire_id === user?.id && !m.lu).length

  if (loading) return <DashLayout title="Communication"><SkeletonLoader /><SkeletonLoader /></DashLayout>

  return (
    <DashLayout title="Communication">
      <div className="dash-page-title">Communication</div>
      <div className="dash-page-sub">Annonces et messagerie interne</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab('annonces')} className={`btn btn-sm ${tab === 'annonces' ? 'btn-primary' : 'btn-secondary'}`}>
          📢 Annonces ({annonces.length})
        </button>
        <button onClick={() => setTab('messages')} className={`btn btn-sm ${tab === 'messages' ? 'btn-primary' : 'btn-secondary'}`}>
          ✉️ Messages {unread > 0 && <span style={{ background: '#E10600', color: '#fff', fontSize: '.6rem', fontWeight: 800, padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>{unread}</span>}
        </button>
        <div style={{ marginLeft: 'auto' }}>
          {tab === 'annonces' && <button className="btn btn-primary btn-sm" onClick={() => setModal('annonce')}>+ Publier</button>}
          {tab === 'messages' && <button className="btn btn-primary btn-sm" onClick={() => setModal('message')}>+ Nouveau message</button>}
        </div>
      </div>

      {/* ANNONCES */}
      {tab === 'annonces' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {annonces.length === 0 ? (
            <div className="card card-p" style={{ textAlign: 'center', color: 'var(--slate)', padding: 48 }}>Aucune annonce publiée</div>
          ) : annonces.map((a, i) => (
            <div key={i} className="card card-p" style={{ borderLeft: a.important ? '3px solid #E10600' : '3px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink)' }}>{a.titre}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--slate)', marginTop: 2 }}>
                    Par {a.auteur_nom || 'Admin'} · {new Date(a.created_at).toLocaleDateString('fr-FR')} · Cible : {a.cible}
                  </div>
                </div>
                {a.important && <span className="badge badge-red">URGENT</span>}
              </div>
              <p style={{ fontSize: '.9rem', color: 'var(--ink)', lineHeight: 1.6 }}>{a.contenu}</p>
            </div>
          ))}
        </div>
      )}

      {/* MESSAGES */}
      {tab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.length === 0 ? (
            <div className="card card-p" style={{ textAlign: 'center', color: 'var(--slate)', padding: 48 }}>Aucun message</div>
          ) : messages.map((m, i) => {
            const isReceived = m.destinataire_id === user?.id
            return (
              <div key={i} className="card card-p" onClick={() => isReceived && !m.lu && markRead(m.id)}
                style={{ cursor: isReceived && !m.lu ? 'pointer' : 'default', opacity: m.lu ? 0.8 : 1, borderLeft: isReceived ? (m.lu ? '3px solid var(--border)' : '3px solid var(--primary)') : '3px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                    {isReceived ? `De : ${m.expediteur_nom}` : `À : ${m.destinataire_nom}`}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!m.lu && isReceived && <span className="badge badge-blue">Nouveau</span>}
                    <span style={{ fontSize: '.72rem', color: 'var(--slate)' }}>{new Date(m.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                {m.sujet && <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{m.sujet}</div>}
                <p style={{ fontSize: '.85rem', color: 'var(--slate)', lineHeight: 1.5 }}>{m.contenu}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Annonce */}
      {modal === 'annonce' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 16, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="section-title">📢 Publier une annonce</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="form-group"><label className="form-label">Titre *</label><input className="form-input" value={formA.titre} onChange={e => setFormA(p => ({ ...p, titre: e.target.value }))} placeholder="Titre de l'annonce" /></div>
              <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" rows={4} value={formA.contenu} onChange={e => setFormA(p => ({ ...p, contenu: e.target.value }))} placeholder="Contenu de l'annonce..." style={{ resize: 'vertical' }} /></div>
              <div className="grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">Destinataires</label>
                  <select className="form-input form-select" value={formA.cible} onChange={e => setFormA(p => ({ ...p, cible: e.target.value }))}>
                    {CIBLES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'end', paddingBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={formA.important} onChange={e => setFormA(p => ({ ...p, important: e.target.checked }))} />
                    Marquer comme urgent
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={publishAnnonce} style={{ flex: 1 }}>Publier l'annonce</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Message */}
      {modal === 'message' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, borderRadius: 16, padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="section-title">✉️ Nouveau message</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Destinataire *</label>
                <select className="form-input form-select" value={formM.destinataire_id} onChange={e => setFormM(p => ({ ...p, destinataire_id: e.target.value }))}>
                  <option value="">Sélectionner...</option>
                  {users.filter(u => u.id !== user?.id).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Sujet</label><input className="form-input" value={formM.sujet} onChange={e => setFormM(p => ({ ...p, sujet: e.target.value }))} placeholder="Objet du message" /></div>
              <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" rows={4} value={formM.contenu} onChange={e => setFormM(p => ({ ...p, contenu: e.target.value }))} placeholder="Votre message..." style={{ resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={sendMessage} style={{ flex: 1 }}>Envoyer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  )
}
