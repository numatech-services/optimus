import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      // 'autoUpdate' : le nouveau SW s'active immédiatement sans attendre
      // l'utilisateur. C'est le bon choix pour une app de données en temps réel.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        // On ne cache PAS le HTML principal
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        navigateFallback: null,
        // IMPORTANT : skip waiting + claim immédiatement
        // Évite que le vieux SW continue à tourner en arrière-plan
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }
            }
          },
          {
            // Supabase REST API : NetworkOnly = JAMAIS de cache.
            // C'est la racine du bug : le cache servait des données périmées
            // après inactivité ou changement d'onglet.
            // Les données doivent TOUJOURS venir du réseau.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Auth Supabase : toujours depuis le réseau
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Storage Supabase : toujours depuis le réseau
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
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

  server: {
    port: 3000,
    open: true,
    strictPort: false,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'vendor'
          if (id.includes('node_modules/react/'))    return 'vendor'
          if (id.includes('node_modules/react-router')) return 'router'
          if (id.includes('node_modules/recharts'))  return 'charts'
          if (id.includes('node_modules/@supabase')) return 'supabase'
        }
      }
    }
  },

  base: '/',

  preview: {
    port: 4173,
    open: true,
  }
})