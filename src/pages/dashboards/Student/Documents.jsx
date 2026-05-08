import { useState, useEffect, useMemo } from 'react'
import DashLayout from '../../../components/Layout/DashLayout'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase' // Client Supabase réel
import { generateAttestation, generateBulletin, generateConvocation, printDocument } from '../../../utils/pdfService'
import { resolveStudentContext } from '../../../utils/identityResolver'

const TYPES = ['Attestation de scolarité', 'Relevé de notes', 'Certificat de réussite', 'Convocation examen']

export default function StudentDocuments() {
  const { user } = useAuth()
  const matricule = user?.matricule || 'ETU-2024-0847'
  
  // ── États des données Supabase ──
  const [loading, setLoading] = useState(true)
  const [dbData, setDbData] = useState([]) // Toutes les demandes
  
  // ── États UI (Design d'origine) ──
  const [selected, setSelected] = useState('')
  const [toast, setToast]       = useState(null)
  
  const showToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── 1. CHARGEMENT RÉEL (Zéro Omission) ──
  useEffect(() => {
    fetchDocuments()
  }, [user, matricule])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const { student, studentId, matricule: resolvedMatricule, tenantId } = await resolveStudentContext(user)

      if (!studentId) {
        setDbData([])
        return
      }

      const { data, error } = await supabase
        .from('document_requests')
        .select('*').limit(500)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (data) {
        // Mappage -> Variables JS d'origine
        const mapped = data
          .filter(d => [studentId, resolvedMatricule, student?.id].includes(d.student_id))
          .map(d => ({
          id: d.id,
          type: d.type,
          date: new Date(d.created_at).toLocaleDateString('fr-FR'),
          statut: ['TREATED', 'PRÊT', 'REMIS'].includes(d.status) ? 'DISPONIBLE' : 'EN ATTENTE'
        }))
        setDbData(mapped)
      }
    } catch (err) {
      console.error("Erreur Sync Documents:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. LOGIQUE DE DEMANDE RÉELLE (Insert) ──
  const handleDemande = async () => {
    if (!selected) return
    
    try {
      const { student, studentId, tenantId } = await resolveStudentContext(user)
      if (!studentId) return

      const { error } = await supabase
        .from('document_requests')
        .insert([{
          type: selected,
          student_id: studentId,
          student_name: student ? `${student.prenom || ''} ${student.nom || ''}`.trim() : user?.name,
          tenant_id: tenantId,
          status: 'EN ATTENTE'
        }])
      if (!error) {
        showToast(`Demande de "${selected}" envoyée à la scolarité`)
        setSelected('')
        fetchDocuments()
      } else {
        showToast("Erreur lors de l'envoi de la demande", "error")
      }
    } catch (err) {
      console.error("[Error]", err.message)
    }
  }

  // ── 3. FILTRAGE DES DONNÉES (Design Intact) ──
  const disponibles = useMemo(() => dbData.filter(d => d.statut === 'DISPONIBLE'), [dbData])
  const enCours = useMemo(() => dbData.filter(d => d.statut === 'EN ATTENTE'), [dbData])

  const handleDownload = async (documentType) => {
    const { student, studentId } = await resolveStudentContext(user)
    if (!studentId || !student) return

    if (documentType === 'Attestation de scolarité') {
      printDocument(generateAttestation(student, { name: user?.tenant_id || user?.tenant || 'Université' }))
      return
    }

    if (documentType === 'Relevé de notes') {
      const { data: notes } = await supabase.from('notes').select('*').eq('student_id', studentId).limit(500)
      const printableNotes = (notes || []).map(note => ({
        ...note,
        coef: note.coef || note.coefficient || 1,
        noteFinal: note.note_final,
        noteCC: note.note_cc,
        noteExamen: note.note_examen,
      }))
      printDocument(generateBulletin(student, printableNotes))
      return
    }

    if (documentType === 'Convocation examen') {
      const { data: convocations } = await supabase.from('convocations').select('*, examens(*)').eq('student_id', studentId).limit(100)
      const printableConvocations = (convocations || []).map((convocation) => ({
        matiere: convocation.examens?.matiere || convocation.matiere,
        code: convocation.examens?.code || convocation.code,
        date: convocation.examens?.date_examen ? new Date(convocation.examens.date_examen).toLocaleDateString('fr-FR') : convocation.date,
        heure: convocation.examens?.heure || convocation.heure,
        salle: convocation.salle || convocation.examens?.salle,
        table: convocation.numero_table || convocation.place,
      }))
      printDocument(generateConvocation(student, printableConvocations))
      return
    }

    showToast(`Téléchargement de "${documentType}" lancé...`)
  }

  if (loading) return <DashLayout title="Documents"><div style={{padding:60, textAlign:'center', fontFamily:'Marianne,Roboto,sans-serif'}}>Accès au coffre-fort numérique...</div></DashLayout>

  return (
    <DashLayout title="Mes Documents" requiredRole="etudiant">
      
      {/* Toast - Design 100% Intact */}
      {toast && /* role=status for screen readers */ (
        <div className="fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, padding: '12px 20px', borderRadius: 10, background: 'var(--green)', color: '#fff', fontFamily: 'Marianne, Roboto, sans-serif', fontWeight: 700, fontSize: '.88rem', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          ✅ {toast}
        </div>
      )}

      <div className="dash-page-title">Mes Documents</div>
      <div className="dash-page-sub">{user?.name} · {matricule} · Documents administratifs sécurisés</div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        
        {/* Colonne Gauche : Documents Disponibles - Design Intact */}
        <div className="card card-p">
          <div className="section-title" style={{ marginBottom: 16 }}>Documents disponibles (Prêts)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {disponibles.length > 0 ? disponibles.map((d) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--mist)', borderRadius: 9 }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.88rem' }}>{d.type}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--slate)', marginTop: 2 }}>Émis le {d.date}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => handleDownload(d.type)}>⬇️ PDF</button>
              </div>
            )) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate)', fontSize: '.85rem', background: 'var(--mist)', borderRadius: 10 }}>
                Aucun document n'a été encore traité.
              </div>
            )}
          </div>
        </div>

        {/* Colonne Droite : Formulaire & Suivi - Design Intact */}
        <div className="card card-p">
          <div className="section-title" style={{ marginBottom: 16 }}>Faire une demande officielle</div>
          
          <div className="form-group">
            <label className="form-label">Type de document souhaité</label>
            <select className="form-input form-select" value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">— Sélectionner un document —</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ background: 'var(--mist)', borderRadius: 8, padding: 12, fontSize: '.8rem', color: 'var(--slate)', marginBottom: 16, lineHeight: 1.5 }}>
            📋 <strong>Délai de traitement :</strong> 2 à 5 jours ouvrables.<br/>
            Vous recevrez une notification dès que le document sera disponible au téléchargement.
          </div>

          <button className="btn btn-primary btn-full" onClick={handleDemande} disabled={!selected} style={{ padding: 12, width: '100%', cursor: !selected ? 'not-allowed' : 'pointer' }}>
            📤 Envoyer la demande
          </button>

          {/* Liste des demandes en cours - Design Intact */}
          {enCours.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '.78rem', color: 'var(--slate)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>Suivi des demandes en cours</div>
              {enCours.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: '.82rem' }}>
                  <span>{d.type}</span>
                  <span className="badge badge-gold">Traitement en cours</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashLayout>
  )
}
