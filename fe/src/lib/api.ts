// In sviluppo BASE e' vuota e il proxy di Vite inoltra /api alla 8080.
// In produzione arriva da VITE_API_URL, iniettata durante la build.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

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
