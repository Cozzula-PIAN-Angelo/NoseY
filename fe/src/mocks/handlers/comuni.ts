import { BASE } from '@/lib/api'
import { ID_UTENTE_CORRENTE, trovaEvento, type EventoFinto } from '../dati'
import { errore, statoDa } from '../utili'

/** Percorso completo, con VITE_API_URL se impostata (come RTK Query) */
export const api = (percorso: string) => `${BASE}/api${percorso}`

/** Ritardo di rete simulato, per vedere caricamenti e rotelline */
export const RITARDO = 400

type Esito = { evento: EventoFinto; risposta?: undefined } | { evento?: undefined; risposta: Response }

/** Evento da leggere: 404 se non esiste */
export function evento(id: unknown): Esito {
  const e = typeof id === 'string' ? trovaEvento(id) : undefined
  return e ? { evento: e } : { risposta: errore('NON_TROVATO') }
}

/**
 * Evento da modificare, con i controlli nell'ordine del backend:
 * 404 NON_TROVATO → 403 NON_PROPRIETARIO → 409 EVENTO_CONCLUSO / EVENTO_ANNULLATO
 */
export function eventoDelProprietario(id: unknown): Esito {
  const esito = evento(id)
  if (!esito.evento) return esito
  if (esito.evento.proprietarioId !== ID_UTENTE_CORRENTE) return { risposta: errore('NON_PROPRIETARIO') }
  const stato = statoDa(esito.evento)
  if (stato === 'CONCLUSO') return { risposta: errore('EVENTO_CONCLUSO') }
  if (stato === 'ANNULLATO') return { risposta: errore('EVENTO_ANNULLATO') }
  return esito
}
