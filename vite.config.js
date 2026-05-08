import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 1. Définition des plugins (React + PWA)
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        // Cache les assets statiques agressivement
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching pour les fonts Google
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
            // Cache les requêtes Supabase API avec stale-while-revalidate
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 10
            }
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