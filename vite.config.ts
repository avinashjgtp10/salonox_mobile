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
  css: {
    preprocessorOptions: {
      scss: {
        // Optional: add global SCSS variables here if needed
        // additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    open: true,
    // Vite blocks requests carrying a Host header it doesn't recognize
    // (DNS-rebinding protection) — the ngrok tunnel used to expose this dev
    // server publicly (WhatsApp document fetches, feedback links) sends the
    // tunnel's own hostname, which 403s here without an explicit allow entry.
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
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
      // Only reached when VITE_API_BASE_URL is empty, i.e. the app is talking to
      // the API through this proxy rather than at an absolute origin — which is
      // what makes the dev server usable from a phone on the LAN, where
      // "localhost:3000" would mean the phone itself. socket.ts then connects to
      // the page's own origin, so the websocket needs forwarding too or live
      // calendar updates silently stop working.
      '/socket.io': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
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
          // ── Vite's dynamic-import preload helper is a shared runtime util with
          // no owner — left unpinned, Rollup drops it into whichever feature chunk
          // happens to reference it first, which can wire up a circular chunk
          // dependency (and a "Cannot access X before initialization" TDZ error)
          // between that feature chunk and chunk-vendor-misc. Pin it to chunk-react
          // (always loads first, has no outgoing chunk deps) so it can't do that.
          if (id.includes('vite/preload-helper')) {
            return 'chunk-react'
          }

          // ── React core ──────────────────────────────────────────────────────
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'chunk-react'
          }

          // ── Shared low-level deps (needed eagerly by many other chunks at
          // module-init time — keep with chunk-react, the first chunk loaded,
          // to avoid circular chunk dependencies / TDZ errors) ────────────────
          if (id.includes('node_modules/prop-types/') ||
              id.includes('node_modules/react-is/') ||
              id.includes('node_modules/object-assign/') ||
              id.includes('node_modules/react-redux/') ||
              id.includes('node_modules/@reduxjs/toolkit/') ||
              id.includes('node_modules/redux-persist/') ||
              id.includes('node_modules/redux/') ||
              id.includes('node_modules/redux-thunk/') ||
              id.includes('node_modules/immer/') ||
              id.includes('node_modules/reselect/') ||
              id.includes('node_modules/use-sync-external-store/') ||
              id.includes('node_modules/@standard-schema/')) {
            return 'chunk-react'
          }

          // ── Router ──────────────────────────────────────────────────────────
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/')) {
            return 'chunk-router'
          }

          // ── Calendar / booking views (avoid "Scheduler" in chunk name — triggers ad blockers)
          if (id.includes('src/features/bookings/') ||
              id.includes('src/routes/DashboardRoutes')) {
            return 'chunk-calendar'
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
