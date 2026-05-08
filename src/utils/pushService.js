/**
 * Push Notification Service — Optimus Campus
 * 
 * Handles Web Push API subscription and notification dispatching.
 * Works with both PWA (browser) and Capacitor (native Android).
 * 
 * Setup:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Add VAPID_PUBLIC_KEY to .env
 * 3. Add VAPID_PRIVATE_KEY to Supabase Secrets
 */

import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Request notification permission
 */
export async function requestPermission() {
  if (!isPushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  return permission // 'granted' | 'denied' | 'default'
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userId) {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null

  try {
    const permission = await requestPermission()
    if (permission !== 'granted') return null

    const registration = await navigator.serviceWorker.ready
    
    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const subJson = subscription.toJSON()

    // Store in Supabase
    const { error } = await supabase.from('push_subscriptions').upsert([{
      user_id: userId,
      endpoint: subJson.endpoint,
      keys_p256dh: subJson.keys.p256dh,
      keys_auth: subJson.keys.auth,
    }], { onConflict: 'user_id' })

    if (error) console.error('[Push] Store subscription error:', error.message)

    return subscription
  } catch (err) {
    console.error('[Push] Subscribe error:', err.message)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId) {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()
    
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err.message)
  }
}

/**
 * Send a local notification (for immediate feedback)
 */
export function showLocalNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const notification = new Notification(title, {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: options.tag || 'optimus-campus',
    data: options.data || {},
    ...options,
  })

  notification.onclick = () => {
    window.focus()
    if (options.url) window.location.href = options.url
    notification.close()
  }

  return notification
}

/**
 * Utility: Convert VAPID key
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

/**
 * Notify on important events (called from components)
 */
export function notifyEvent(type, data) {
  const notifications = {
    payment_received: { title: 'Paiement reçu', body: `${data.montant} FCFA confirmé` },
    grade_published: { title: 'Notes publiées', body: `${data.matiere} — vérifiez vos résultats` },
    exam_reminder: { title: 'Rappel examen', body: `${data.matiere} — ${data.date}` },
    deadline_approaching: { title: 'Échéance proche', body: `${data.description} — ${data.date}` },
    message_received: { title: 'Nouveau message', body: `De ${data.from}: ${data.subject}` },
    announcement: { title: '📢 Annonce', body: data.titre },
    access_denied: { title: '⚠️ Accès refusé', body: `Portique ${data.portique}` },
  }

  const notif = notifications[type]
  if (notif) showLocalNotification(notif.title, notif.body, { tag: type })
}
