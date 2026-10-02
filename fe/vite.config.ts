import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// Il service worker di MSW (public/mockServiceWorker.js) serve solo in sviluppo: main.tsx non lo
// registra mai in produzione, ma Vite copierebbe comunque in dist/ tutto public/ (FE2-15)
const senzaDatiFinti: Plugin = {
  name: 'senza-dati-finti',
  apply: 'build',
  closeBundle() {
    rmSync(path.resolve(import.meta.dirname, 'dist/mockServiceWorker.js'), { force: true })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), senzaDatiFinti],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // In sviluppo il browser vede una sola origine: /api lo inoltra Vite al
    // backend sulla 8080, quindi in locale di CORS non ci si accorge nemmeno.
    // In produzione questo proxy non esiste piu': il sito statico e' un altro
    // dominio, ed e' li' che serve VITE_API_URL.
    proxy: {
      '/api': { target: 'http://localhost:8080' },
      // WebSocket STOMP (FE2-11): ws: true inoltra anche l'upgrade della connessione
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
})
