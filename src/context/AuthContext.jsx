import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { enrichAuthProfile } from '../utils/identityResolver'
import useInactivityLogout from '../hooks/useInactivityLogout'

const AuthContext = createContext(null)

export const LOGIN_ROUTES = {
  super_admin:      '/dashboard/super-admin',
  admin_universite: '/dashboard/uni-admin',
  scolarite:        '/dashboard/scolarite',
  enseignant:       '/dashboard/enseignant',
  etudiant:         '/dashboard/etudiant',
  surveillant:      '/dashboard/surveillant',
  bibliotheque:     '/dashboard/bibliotheque',
  comptabilite:     '/dashboard/comptabilite',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (email) => {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, role, tenant_id, avatar')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      return null
    }

    // Charger les modules du tenant si l'utilisateur appartient à une université
    let modules = []
    if (profile.tenant_id && profile.role !== 'super_admin') {
      try {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('modules')
          .eq('id', profile.tenant_id)
          .single()
        modules = tenant?.modules || []
      } catch (err) {
        console.log('Modules non disponibles')
      }
    }

    return enrichAuthProfile({ ...profile, modules })
  }, [])

  // ── 1. Initialisation + écoute des changements de session Supabase ──
  useEffect(() => {
    let mounted = true

    // A) Restauration initiale depuis localStorage
    // Sécurité : seuls id, email, name, role, tenant_id sont stockés (pas de mot de passe, token, ou données sensibles)
    try {
      const stored = localStorage.getItem('oc_user')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.email && parsed?.role) {
          setUser(parsed)
          loadProfile(parsed.email)
            .then((profile) => {
              if (profile && mounted) {
                localStorage.setItem('oc_user', JSON.stringify(profile))
                setUser(profile)
              }
            })
            .catch(() => {})
        } else {
          localStorage.removeItem('oc_user')
        }
      }
    } catch {
      localStorage.removeItem('oc_user')
    }
    setLoading(false)

    // B) Écoute Supabase Auth : gère le refresh de token, l'expiration, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // Recovery event — user clicked the password reset link.
        // Don't auto-login; let ResetPassword.jsx handle the session.
        if (event === 'PASSWORD_RECOVERY') return

        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          // Session expirée ou déconnexion
          localStorage.removeItem('oc_user')
          if (mounted) setUser(null)
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // Nouvelle connexion ou refresh réussi — recharger le profil
          try {
            const profile = await loadProfile(session.user.email)

            if (profile && mounted) {
              localStorage.setItem('oc_user', JSON.stringify(profile))
              setUser(profile)
            }
          } catch {
            // Silencieux — le profil local est déjà en place
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [loadProfile])

  // ── 2. Login sécurisé ──
  const login = useCallback(async (email, password) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (authError || !authData?.user) {
        return { success: false, error: 'Email ou mot de passe incorrect.' }
      }

      // Small delay to avoid AbortError race with onAuthStateChange SIGNED_IN event
      // Both fire simultaneously; the delay lets onAuthStateChange settle first
      await new Promise(r => setTimeout(r, 250))

      // Récupérer le profil sans le mot de passe
      const profile = await loadProfile(authData.user.email)

      if (!profile) {
        return { success: false, error: 'Profil utilisateur introuvable.' }
      }

      // Vérifier si l'abonnement du tenant est actif (sauf super_admin)
      if (profile.role !== 'super_admin' && profile.tenant_id) {
        try {
          const { data: tenantCheck } = await supabase.rpc('check_tenant_access', { p_tenant_id: profile.tenant_id })
          if (tenantCheck === false) {
            await supabase.auth.signOut()
            return { success: false, error: 'L\'abonnement de votre établissement a expiré. Contactez votre administrateur.' }
          }
        } catch {
          // Si la fonction n'existe pas encore, on laisse passer
        }
      }

      localStorage.setItem('oc_user', JSON.stringify(profile))
      setUser(profile)

      return {
        success: true,
        user: profile,
        redirect: LOGIN_ROUTES[profile.role] || '/login'
      }
    } catch (err) {
      console.error('[Auth] Erreur:', err.message)
      return { success: false, error: 'Erreur de connexion au serveur.' }
    }
  }, [loadProfile])

  // ── 3. Logout ──
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Silencieux
    }
    // Nettoyage complet du cache et sessions
    localStorage.removeItem('oc_user')
    sessionStorage.clear()
    setUser(null)
  }, [])

  // ── 4. Inactivité (30 minutes) ──
  // Auto-logout après 30 min d'inactivité réelle (pas de logout au changement d'onglet)
  useInactivityLogout(user ? logout : null, 30 * 60 * 1000)

  // ── 5. Vérification de session (appelable par les pages) ──
  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        localStorage.removeItem('oc_user')
        setUser(null)
        return false
      }
      return true
    } catch {
      return false
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
