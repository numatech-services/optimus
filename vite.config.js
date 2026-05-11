import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 1. Définition des plugins (React + PWA)
  plugins: [
    react(),
    VitePWA({ 
      // 'prompt' = le SW attend que l'utilisateur recharge manuellement.
      // 'autoUpdate' causait le bug : le vieux SW servait du cache périmé
      // pendant 30s avant que le nouveau prenne la main.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        // On ne cache PAS le HTML principal — toujours récupéré du réseau
        // pour garantir que l'app repart sur la dernière version.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // Ne jamais mettre en cache index.html — c'est la source du bug
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 } }
          },
          {
            // Supabase : NetworkFirst avec timeout COURT (3s).
            // Avant c'était 10s → l'app attendait 10s avant de tomber en erreur.
            // Maintenant si le réseau répond en +3s, on sert le cache et on
            // revalide en arrière-plan.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 2 * 60 }, // 2min max
              networkTimeoutSeconds: 3 // Réduit de 10 à 3 secondes
            }
          },
          {
            // Auth Supabase : jamais depuis le cache
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          }
        ]
      },
      manifest: {
        name: 'Optimus Campus — Université de Niamey',
        short_name: 'Optimus',
        description: 'ERP Universitaire — Université de Niamey',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        screenshots: [
          { src: 'screenshot-desktop.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
          { src: 'screenshot-mobile.jpeg', sizes: '390x844', type: 'image/jpeg' }
        ]
      },
      devOptions: { enabled: true }
    })
  ],

  // 2. Serveur de développement
  server: {
    port: 3000,
    open: true,
    strictPort: false,
  },

  // 3. Configuration du Build de production
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor libs dans des chunks séparés (compatible avec React.lazy)
          if (id.includes('node_modules/react-dom')) return 'vendor'
          if (id.includes('node_modules/react/'))    return 'vendor'
          if (id.includes('node_modules/react-router')) return 'router'
          if (id.includes('node_modules/recharts'))  return 'charts'
          if (id.includes('node_modules/@supabase')) return 'supabase'
        }
      }
    }
  },

  // 4. URL de base
  base: '/',

  // 5. Preview (pour tester le build localement)
  preview: {
    port: 4173,
    open: true,
  }
})