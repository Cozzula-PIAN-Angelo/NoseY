/// <reference types="vite/client" />

// Variabili d'ambiente del frontend (valori e spiegazione in fe/.env.example).
// Vite le legge al momento della build: solo quelle con prefisso VITE_ arrivano al browser.
interface ImportMetaEnv {
  /** Indirizzo del backend senza / finale; vuota in sviluppo (proxy di Vite) */
  readonly VITE_API_URL?: string
  /** "false" per usare il backend vero al posto dei dati finti (MSW), solo in sviluppo */
  readonly VITE_DATI_FINTI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
