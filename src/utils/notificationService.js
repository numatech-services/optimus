import { supabase } from '../lib/supabase'

/**
 * Notification Service — Optimus Campus
 * 
 * Gère l'envoi d'emails et SMS via Supabase Edge Functions.
 * Les Edge Functions appellent le provider email (Resend/Brevo) et SMS (Twilio/Vonage).
 * 
 * CONFIGURATION REQUISE dans Supabase Dashboard > Edge Functions > Secrets :
 *   RESEND_API_KEY=re_xxxx (ou BREVO_API_KEY)
 *   SMS_API_KEY=xxxx (Twilio/Vonage)
 *   SMS_SENDER=+227XXXXXXXX
 *   APP_URL=https://votre-domaine.com
 */

// ── TYPES DE NOTIFICATION ──
export const NOTIF_TYPES = {
  // Inscription & Compte
  ACCOUNT_CREATED: 'account_created',
  INSCRIPTION_VALIDATED: 'inscription_validated',
  PASSWORD_RESET: 'password_reset',

  // Paiements
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PAYMENT_OVERDUE_30: 'payment_overdue_30',
  PAYMENT_OVERDUE_60: 'payment_overdue_60',

  // Examens & Notes
  EXAM_REMINDER_48H: 'exam_reminder_48h',
  RESULTS_PUBLISHED: 'results_published',
  GRADES_ADDED: 'grades_added',

  // Emploi du temps
  SCHEDULE_UPDATED: 'schedule_updated',

  // Accès
  ACCESS_DENIED: 'access_denied',
  BADGE_EXPIRED: 'badge_expired',

  // Documents
  DOCUMENT_READY: 'document_ready',
}

// ── TEMPLATES EMAIL ──
const EMAIL_TEMPLATES = {
  [NOTIF_TYPES.ACCOUNT_CREATED]: {
    subject: '🎓 Bienvenue sur Optimus Campus — {{university}}',
    body: `Bonjour {{prenom}} {{nom}},

Votre compte a été créé avec succès sur la plateforme Optimus Campus de {{university}}.

📧 Email : {{email}}
🎓 Rôle : {{role}}
📅 Année : {{annee}}

Connectez-vous dès maintenant : {{app_url}}/login

Cordialement,
Le service de scolarité — {{university}}`
  },

  [NOTIF_TYPES.INSCRIPTION_VALIDATED]: {
    subject: '✅ Inscription validée — {{university}}',
    body: `Bonjour {{prenom}},

Votre inscription pour l'année {{annee}} a été validée avec succès.

📚 Filière : {{filiere}}
🆔 Matricule : {{matricule}}

Vous pouvez maintenant accéder à votre espace étudiant : {{app_url}}/login

{{university}} — Service de scolarité`
  },

  [NOTIF_TYPES.PASSWORD_RESET]: {
    subject: '🔑 Réinitialisation de mot de passe — Optimus Campus',
    body: `Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe.

Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
{{reset_link}}

Ce lien est valide pendant 1 heure.

Si vous n'avez pas fait cette demande, ignorez cet email.

Optimus Campus — {{university}}`
  },

  [NOTIF_TYPES.PAYMENT_CONFIRMED]: {
    subject: '💰 Paiement reçu — {{montant}} FCFA',
    body: `Bonjour {{prenom}},

Nous confirmons la réception de votre paiement :

💰 Montant : {{montant}} FCFA
📝 Description : {{description}}
💳 Méthode : {{methode}}
📅 Date : {{date}}
🆔 Référence : {{reference}}

Merci !
{{university}} — Service financier`
  },

  [NOTIF_TYPES.PAYMENT_OVERDUE_30]: {
    subject: '⚠️ Rappel — Paiement en retard de 30 jours',
    body: `Bonjour {{prenom}},

Nous vous informons qu'un paiement est en retard de plus de 30 jours :

💰 Montant dû : {{montant}} FCFA
📝 Description : {{description}}
⏰ Date d'échéance dépassée : {{date_echeance}}

Veuillez régulariser votre situation au plus tôt.

Méthodes de paiement acceptées : Airtel Money, NITA, AMANA, Espèces.

{{university}} — Service financier`
  },

  [NOTIF_TYPES.PAYMENT_OVERDUE_60]: {
    subject: '🚨 URGENT — Impayé critique (> 60 jours) — Risque de suspension',
    body: `Bonjour {{prenom}},

⚠️ AVERTISSEMENT : Votre paiement est en retard de plus de 60 jours.

💰 Montant dû : {{montant}} FCFA
📝 Description : {{description}}

Sans régularisation sous 7 jours :
- Votre accès au campus sera suspendu
- Votre badge sera désactivé
- Vous ne pourrez pas passer les examens

Contactez le service financier immédiatement.

{{university}}`
  },

  [NOTIF_TYPES.EXAM_REMINDER_48H]: {
    subject: '📋 Rappel examen dans 48h — {{matiere}}',
    body: `Bonjour {{prenom}},

Rappel : vous avez un examen dans 48 heures.

📚 Matière : {{matiere}}
📅 Date : {{date}}
⏰ Heure : {{heure}}
🏛️ Salle : {{salle}}
⏱️ Durée : {{duree}}

N'oubliez pas votre carte d'étudiant et votre convocation.

Bonne chance !
{{university}}`
  },

  [NOTIF_TYPES.RESULTS_PUBLISHED]: {
    subject: '📊 Résultats disponibles — {{matiere}} {{semestre}}',
    body: `Bonjour {{prenom}},

Les résultats de {{matiere}} ({{semestre}}) sont maintenant disponibles.

Consultez vos notes sur votre espace étudiant : {{app_url}}/dashboard/etudiant/notes

{{university}} — Service de scolarité`
  },

  [NOTIF_TYPES.GRADES_ADDED]: {
    subject: '📝 Nouvelles notes saisies — {{matiere}}',
    body: `Bonjour {{prenom}},

De nouvelles notes ont été saisies pour {{matiere}}.

Consultez vos résultats : {{app_url}}/dashboard/etudiant/notes

{{university}}`
  },

  [NOTIF_TYPES.SCHEDULE_UPDATED]: {
    subject: '📅 Emploi du temps mis à jour',
    body: `Bonjour {{prenom}},

Votre emploi du temps a été modifié. Veuillez consulter la nouvelle version.

{{app_url}}/dashboard/etudiant/edt

{{university}}`
  },

  [NOTIF_TYPES.ACCESS_DENIED]: {
    subject: '🚫 Tentative d\'accès refusée',
    body: `Alerte sécurité :

Une tentative d'accès a été refusée.

👤 Étudiant : {{nom}} {{prenom}}
🆔 Matricule : {{matricule}}
🚪 Portique : {{portique}}
📅 Date : {{date}}
❌ Raison : {{raison}}

Action requise si récurrent.

{{university}} — Sécurité`
  },

  [NOTIF_TYPES.DOCUMENT_READY]: {
    subject: '📄 Votre document est prêt — {{type_document}}',
    body: `Bonjour {{prenom}},

Votre document "{{type_document}}" est prêt à être récupéré au service de scolarité.

🆔 Référence : {{reference}}

{{university}}`
  },
}

// ── RENDER TEMPLATE ──
function renderTemplate(template, data) {
  let result = { subject: template.subject, body: template.body }
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result.subject = result.subject.replace(regex, value || '')
    result.body = result.body.replace(regex, value || '')
  }
  return result
}

// ── ENVOYER UN EMAIL ──
export async function sendEmail(type, recipientEmail, templateData) {
  try {
    const template = EMAIL_TEMPLATES[type]
    if (!template) {
      console.error(`[Notif] Template inconnu: ${type}`)
      return { success: false, error: 'Template inconnu' }
    }

    const { subject, body } = renderTemplate(template, {
      ...templateData,
      app_url: window.location.origin,
    })

    // Appeler la Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject,
        text: body,
        type,
      }
    })

    if (error) throw error

    // Logger la notification dans la table
    await logNotification({
      type,
      canal: 'email',
      destinataire: recipientEmail,
      sujet: subject,
      tenant_id: templateData.tenant_id,
      student_id: templateData.student_id,
    })

    return { success: true, data }
  } catch (err) {
    console.error(`[Notif] Erreur email ${type}:`, err.message)
    return { success: false, error: err.message }
  }
}

// ── ENVOYER UN SMS ──
export async function sendSMS(phone, message) {
  try {
    // Format Niger: +227 XXXXXXXX
    const formattedPhone = phone.startsWith('+') ? phone : `+227${phone.replace(/\s/g, '')}`

    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: formattedPhone,
        message,
      }
    })

    if (error) throw error

    await logNotification({
      type: 'sms',
      canal: 'sms',
      destinataire: formattedPhone,
      sujet: message.slice(0, 100),
    })

    return { success: true, data }
  } catch (err) {
    console.error('[Notif] Erreur SMS:', err.message)
    return { success: false, error: err.message }
  }
}

// ── LOGGER DANS LA TABLE NOTIFICATIONS ──
async function logNotification({ type, canal, destinataire, sujet, tenant_id, student_id }) {
  try {
    await supabase.from('notifications').insert([{
      type,
      role: 'system',
      titre: sujet,
      detail: `${canal} → ${destinataire}`,
      lu: false,
      tenant_id,
    }])
  } catch {
    // Silencieux — le log n'est pas critique
  }
}

// ── RACCOURCIS POUR LES CAS COURANTS ──

export async function notifyAccountCreated(student, university) {
  return sendEmail(NOTIF_TYPES.ACCOUNT_CREATED, student.email, {
    prenom: student.prenom, nom: student.nom,
    email: student.email, role: 'Étudiant',
    annee: student.annee, university,
    tenant_id: student.tenant_id,
    student_id: student.id,
  })
}

export async function notifyInscriptionValidated(student, university) {
  return sendEmail(NOTIF_TYPES.INSCRIPTION_VALIDATED, student.email, {
    prenom: student.prenom, filiere: student.filiere,
    matricule: student.id, annee: student.annee, university,
    tenant_id: student.tenant_id, student_id: student.id,
  })
}

export async function notifyPaymentConfirmed(student, paiement, university) {
  return sendEmail(NOTIF_TYPES.PAYMENT_CONFIRMED, student.email, {
    prenom: student.prenom,
    montant: paiement.montant?.toLocaleString('fr'),
    description: paiement.description || paiement.desc,
    methode: paiement.methode, date: paiement.date,
    reference: paiement.id, university,
    tenant_id: student.tenant_id, student_id: student.id,
  })
}

export async function notifyPaymentOverdue(student, paiement, university, days) {
  const type = days >= 60 ? NOTIF_TYPES.PAYMENT_OVERDUE_60 : NOTIF_TYPES.PAYMENT_OVERDUE_30
  return sendEmail(type, student.email, {
    prenom: student.prenom,
    montant: paiement.montant?.toLocaleString('fr'),
    description: paiement.description || paiement.desc,
    date_echeance: paiement.date, university,
    tenant_id: student.tenant_id, student_id: student.id,
  })
}

export async function notifyExamReminder(student, examen, university) {
  // Email
  await sendEmail(NOTIF_TYPES.EXAM_REMINDER_48H, student.email, {
    prenom: student.prenom,
    matiere: examen.matiere, date: examen.date_examen,
    heure: examen.heure, salle: examen.salle,
    duree: examen.duree, university,
    tenant_id: student.tenant_id, student_id: student.id,
  })
  // SMS
  if (student.tel) {
    await sendSMS(student.tel, `[${university}] Rappel examen ${examen.matiere} le ${examen.date_examen} à ${examen.heure}, salle ${examen.salle}. Bonne chance !`)
  }
}

export async function notifyResultsPublished(students, matiere, semestre, university, tenantId) {
  const promises = students.map(s =>
    sendEmail(NOTIF_TYPES.RESULTS_PUBLISHED, s.email, {
      prenom: s.prenom, matiere, semestre, university,
      tenant_id: tenantId, student_id: s.id,
    })
  )
  return Promise.allSettled(promises)
}

export async function notifyGradesAdded(students, matiere, university, tenantId) {
  const promises = students.map(s =>
    sendEmail(NOTIF_TYPES.GRADES_ADDED, s.email, {
      prenom: s.prenom, matiere, university,
      tenant_id: tenantId, student_id: s.id,
    })
  )
  return Promise.allSettled(promises)
}

export async function notifyScheduleUpdated(students, university, tenantId) {
  const promises = students.map(s =>
    sendEmail(NOTIF_TYPES.SCHEDULE_UPDATED, s.email, {
      prenom: s.prenom, university,
      tenant_id: tenantId, student_id: s.id,
    })
  )
  return Promise.allSettled(promises)
}

export async function notifyAccessDenied(student, portique, raison, adminEmail, university, tenantId) {
  // Notify admin
  await sendEmail(NOTIF_TYPES.ACCESS_DENIED, adminEmail, {
    nom: student.nom, prenom: student.prenom,
    matricule: student.id, portique,
    date: new Date().toLocaleString('fr-FR'),
    raison, university, tenant_id: tenantId,
  })
  // Notify student
  if (student.email) {
    await sendEmail(NOTIF_TYPES.ACCESS_DENIED, student.email, {
      nom: student.nom, prenom: student.prenom,
      matricule: student.id, portique,
      date: new Date().toLocaleString('fr-FR'),
      raison, university, tenant_id: tenantId,
    })
  }
}

export async function notifyDocumentReady(student, typeDocument, reference, university) {
  return sendEmail(NOTIF_TYPES.DOCUMENT_READY, student.email, {
    prenom: student.prenom, type_document: typeDocument,
    reference, university,
    tenant_id: student.tenant_id, student_id: student.id,
  })
}

// ── MOT DE PASSE OUBLIÉ (via Supabase Auth) ──
export async function sendPasswordReset(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[Auth] Reset password error:', err.message)
    return { success: false, error: err.message }
  }
}
