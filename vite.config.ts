import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        headers: { Origin: 'http://localhost:3000' },
        timeout: 30000,
        proxyTimeout: 30000,
      },
      '/uploads': {
        target: proxyTarget,
        changeOrigin: true,
        headers: { Origin: 'http://localhost:3000' },
        timeout: 30000,
        proxyTimeout: 30000,
      },
    },
  },
  esbuild: {
    pure: mode === 'production' ? ['console.log'] : [],
    drop: mode === 'production' ? ['debugger'] : [],
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    cssCodeSplit: true,
    sourcemap: mode !== 'production',
    // chunk-geo-data (country-state-city) is ~8.7 MB raw / 2.3 MB gzip by design —
    // it's a full country/state/city JSON dataset and is lazy-loaded only when needed.
    chunkSizeWarningLimit: 9500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── React core ──────────────────────────────────────────────────────
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'chunk-react'
          }

          // ── Router ──────────────────────────────────────────────────────────
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/')) {
            return 'chunk-router'
          }

          // ── FullCalendar (very large) ────────────────────────────────────────
          if (id.includes('node_modules/@fullcalendar/')) {
            return 'chunk-fullcalendar'
          }

          // ── Charts ──────────────────────────────────────────────────────────
          if (id.includes('node_modules/recharts/') ||
              id.includes('node_modules/d3') ||
              id.includes('node_modules/victory')) {
            return 'chunk-charts'
          }

          // ── Bootstrap ───────────────────────────────────────────────────────
          if (id.includes('node_modules/bootstrap/') ||
              id.includes('node_modules/react-bootstrap/') ||
              id.includes('node_modules/react-bootstrap-icons/')) {
            return 'chunk-bootstrap'
          }

          // ── UI / icon libraries ─────────────────────────────────────────────
          if (id.includes('node_modules/lucide-react/') ||
              id.includes('node_modules/react-icons/') ||
              id.includes('node_modules/react-select/') ||
              id.includes('node_modules/react-hot-toast/') ||
              id.includes('node_modules/canvas-confetti/')) {
            return 'chunk-ui-libs'
          }

          // ── Country/state/city data (large JSON dataset) ────────────────────
          if (id.includes('node_modules/country-state-city/')) {
            return 'chunk-geo-data'
          }

          // ── Date / location utilities ───────────────────────────────────────
          if (id.includes('node_modules/date-fns/') ||
              id.includes('node_modules/react-date-range/') ||
              id.includes('node_modules/react-phone-input-2/')) {
            return 'chunk-utils'
          }

          // ── HTTP / auth ─────────────────────────────────────────────────────
          if (id.includes('node_modules/axios/') ||
              id.includes('node_modules/jwt-decode/')) {
            return 'chunk-http'
          }

          // ── Everything else in node_modules ────────────────────────────────
          if (id.includes('node_modules/')) {
            return 'chunk-vendor-misc'
          }
        }
      }
    }
  }
  }
})
