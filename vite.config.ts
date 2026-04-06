import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── React core ──────────────────────────────────────────────────────
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'chunk-react'
          }

          // ── State management ────────────────────────────────────────────────
          if (id.includes('node_modules/@reduxjs/') ||
              id.includes('node_modules/react-redux/') ||
              id.includes('node_modules/redux/') ||
              id.includes('node_modules/immer/') ||
              id.includes('node_modules/reselect/')) {
            return 'chunk-redux'
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

          // ── Date / location utilities ───────────────────────────────────────
          if (id.includes('node_modules/date-fns/') ||
              id.includes('node_modules/react-date-range/') ||
              id.includes('node_modules/country-state-city/') ||
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
}))
