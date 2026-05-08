/**
 * Payment Service — Optimus Campus
 * 
 * Scaffold pour l'intégration des API de paiement en ligne au Niger.
 * Le développeur API devra implémenter les fonctions marquées TODO.
 * 
 * Prestataires supportés :
 * - Airtel Money (API Airtel Africa)
 * - NITA (API locale Niger)
 * - AMANA (API locale Niger)
 * - Virement bancaire (confirmation manuelle)
 * - Espèces (confirmation manuelle)
 */

import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_PAYMENT_API_URL || ''

/**
 * Initier un paiement mobile (Airtel Money / NITA / AMANA)
 * 
 * @param {object} params
 * @param {string} params.studentId - ID de l'étudiant
 * @param {string} params.echeanceId - ID de l'échéance
 * @param {number} params.montant - Montant en FCFA
 * @param {string} params.methode - 'AIRTEL_MONEY' | 'NITA' | 'AMANA'
 * @param {string} params.telephone - Numéro de téléphone (format +227)
 * @param {string} params.tenantId
 * @returns {object} { success, transactionId, message }
 */
export async function initierPaiement({ studentId, echeanceId, montant, methode, telephone, tenantId }) {
  // 1. Créer la transaction en base
  const { data: tx, error } = await supabase.from('transactions_paiement').insert([{
    student_id: studentId,
    echeance_id: echeanceId,
    montant,
    methode,
    telephone,
    statut: 'INITIÉE',
    tenant_id: tenantId,
  }]).select().single()

  if (error) return { success: false, message: 'Erreur création transaction : ' + error.message }

  // 2. Appeler l'API du prestataire
  // TODO: Le développeur API doit implémenter cette partie
  try {
    if (methode === 'AIRTEL_MONEY') {
      // TODO: Appeler l'API Airtel Money
      // const response = await fetch(`${API_BASE}/airtel/initiate`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AIRTEL_TOKEN}` },
      //   body: JSON.stringify({
      //     reference: tx.id,
      //     subscriber: { msisdn: telephone.replace('+227', '') },
      //     transaction: { amount: montant, currency: 'XOF', id: tx.id }
      //   })
      // })
      // const result = await response.json()
      // Update transaction with external reference
      // await supabase.from('transactions_paiement').update({ reference_externe: result.data.transaction.id, statut: 'EN_ATTENTE' }).eq('id', tx.id)
      
      await supabase.from('transactions_paiement').update({ statut: 'EN_ATTENTE' }).eq('id', tx.id)
      return { success: true, transactionId: tx.id, message: 'Paiement initié — en attente de confirmation Airtel Money' }

    } else if (methode === 'NITA' || methode === 'AMANA') {
      // TODO: Appeler l'API NITA ou AMANA
      await supabase.from('transactions_paiement').update({ statut: 'EN_ATTENTE' }).eq('id', tx.id)
      return { success: true, transactionId: tx.id, message: `Paiement initié — en attente de confirmation ${methode}` }

    } else {
      // Espèces ou virement — confirmation manuelle
      return { success: true, transactionId: tx.id, message: 'Transaction enregistrée — confirmation manuelle requise' }
    }
  } catch (err) {
    await supabase.from('transactions_paiement').update({ statut: 'ÉCHOUÉE', metadata: { error: err.message } }).eq('id', tx.id)
    return { success: false, message: 'Erreur paiement : ' + err.message }
  }
}

/**
 * Confirmer un paiement (callback du prestataire ou confirmation manuelle)
 */
export async function confirmerPaiement(transactionId) {
  const { data: tx } = await supabase.from('transactions_paiement').select('*').eq('id', transactionId).single()
  if (!tx) return { success: false, message: 'Transaction introuvable' }

  // Marquer la transaction comme confirmée
  await supabase.from('transactions_paiement').update({ statut: 'CONFIRMÉE' }).eq('id', transactionId)

  // Marquer l'échéance comme payée
  if (tx.echeance_id) {
    await supabase.from('echeances').update({ statut: 'PAYÉ', paiement_id: transactionId }).eq('id', tx.echeance_id)
  }

  // Créer le paiement dans la table principale
  await supabase.from('paiements').insert([{
    student_id: tx.student_id,
    montant: tx.montant,
    methode: tx.methode,
    statut: 'PAYÉ',
    reference: tx.reference_externe || transactionId,
    tenant_id: tx.tenant_id,
  }])

  return { success: true, message: 'Paiement confirmé' }
}

/**
 * Vérifier le statut d'un paiement auprès du prestataire
 */
export async function verifierStatut(transactionId) {
  const { data: tx } = await supabase.from('transactions_paiement').select('*').eq('id', transactionId).single()
  if (!tx) return { statut: 'INCONNU' }

  // TODO: Interroger l'API du prestataire pour le statut en temps réel
  // if (tx.methode === 'AIRTEL_MONEY' && tx.reference_externe) {
  //   const response = await fetch(`${API_BASE}/airtel/status/${tx.reference_externe}`)
  //   const result = await response.json()
  //   return { statut: result.data.transaction.status }
  // }

  return { statut: tx.statut, montant: tx.montant, methode: tx.methode }
}

/**
 * Webhook endpoint pour les callbacks des prestataires
 * À implémenter dans une Supabase Edge Function
 * 
 * POST /functions/v1/payment-webhook
 * Body: { provider: 'airtel', transaction_id: '...', status: 'SUCCESS' }
 */
export const WEBHOOK_TEMPLATE = `
// supabase/functions/payment-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { provider, transaction_id, status } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  if (status === 'SUCCESS') {
    // Confirmer la transaction
    await supabase.from('transactions_paiement')
      .update({ statut: 'CONFIRMÉE', reference_externe: transaction_id })
      .eq('reference_externe', transaction_id)
    
    // Marquer l'échéance payée
    const { data: tx } = await supabase.from('transactions_paiement')
      .select('echeance_id').eq('reference_externe', transaction_id).single()
    
    if (tx?.echeance_id) {
      await supabase.from('echeances')
        .update({ statut: 'PAYÉ' }).eq('id', tx.echeance_id)
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
`
