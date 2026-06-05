import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Set VITE_BASE_PATH env var for GitHub Pages sub-path deployment.
// Example: VITE_BASE_PATH=/traxxo/ npm run build
// Leave unset (or '/') for root domain / custom domain deployment.
const BASE = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['Bright_logo.png', 'favicon.ico'],
      manifest: {
        name: 'TRΛXXO — Business Management',
        short_name: 'TRΛXXO',
        description:
          'Complete business management system for retail, pharmacy, hardware, supermarket, and wholesale businesses.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: BASE,
        scope: BASE,
        lang: 'en',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: 'Bright_logo.png', sizes: '72x72',   type: 'image/png' },
          { src: 'Bright_logo.png', sizes: '96x96',   type: 'image/png' },
          { src: 'Bright_logo.png', sizes: '128x128', type: 'image/png' },
          { src: 'Bright_logo.png', sizes: '144x144', type: 'image/png' },
          { src: 'Bright_logo.png', sizes: '152x152', type: 'image/png' },
          { src: 'Bright_logo.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'Bright_logo.png', sizes: '384x384', type: 'image/png' },
          { src: 'Bright_logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Sales',
            short_name: 'Sales',
            description: 'Record a new sale',
            url: BASE + '?page=sales',
            icons: [{ src: 'Bright_logo.png', sizes: '192x192' }],
          },
          {
            name: 'Inventory',
            short_name: 'Inventory',
            description: 'Manage product inventory',
            url: BASE + '?page=inventory',
            icons: [{ src: 'Bright_logo.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cache the app shell and all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
        // Supabase API calls should never be cached
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//, /^\/storage\//],
        runtimeCaching: [
          {
            // Cache images at runtime with cache-first strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'traxxo-images',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Google Fonts (if ever added)
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'traxxo-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          icons:    ['lucide-react'],
        },
      },
    },
  },
});
