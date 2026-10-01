// In sviluppo BASE e' vuota e il proxy di Vite inoltra /api alla 8080.
// In produzione arriva da VITE_API_URL, iniettata durante la build.
// Esportata perche' la usa anche RTK Query (src/store/apiSlice.ts).
export const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/**
 * Indirizzo di un'immagine del backend (decisione 9): nei DTO foto, copertine, artisti e avatar
 * arrivano come percorso relativo di un GET pubblico, es. "/api/events/{id}/photos/{fotoId}/image?v=3".
 * Qui si aggiunge BASE (vuota in sviluppo, VITE_API_URL in produzione); null se non c'e' immagine.
 * Uso: <img src={urlImmagine(evento.copertinaUrl) ?? segnaposto} />
 */
export function urlImmagine(percorso: string | null | undefined): string | null {
  if (!percorso) return null
  // Gia' completo (http..., data:, blob:): si usa cosi' com'e'
  if (!percorso.startsWith('/')) return percorso
  return `${BASE}${percorso}`
}

export type Stato = {
  servizio: string
  database: string
  ora: string
}

async function chiama<T>(percorso: string, opzioni?: RequestInit): Promise<T> {
  const risposta = await fetch(`${BASE}${percorso}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opzioni,
  })
  if (!risposta.ok) {
    const testo = await risposta.text()
    throw new Error(testo || `${risposta.status} ${risposta.statusText}`)
  }
  return risposta.status === 204 ? (undefined as T) : ((await risposta.json()) as T)
}

export const api = {
  indirizzo: BASE || '(stessa origine, proxy di Vite)',
  stato: () => chiama<Stato>('/api/stato'),
}
