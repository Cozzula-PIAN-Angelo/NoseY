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

/**
 * Prova del caso "non ho fatto l'accesso": nella console del browser
 *   localStorage.setItem('datiFinti.anonimo', 'true')   poi ricarica la pagina
 *   localStorage.removeItem('datiFinti.anonimo')         per tornare "loggati"
 * In questa modalita' le azioni che richiedono il login rispondono 401 NON_AUTENTICATO.
 */
export function nonLoggato(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('datiFinti.anonimo') === 'true'
  } catch {
    return false
  }
}

/**
 * Prova del caso "il servizio di AI non risponde" (MiglioraDescrizioneAI → 502 SERVIZIO_ESTERNO):
 *   localStorage.setItem('datiFinti.aiGuasta', 'true')    nella console del browser
 *   localStorage.removeItem('datiFinti.aiGuasta')         per farla tornare a rispondere
 */
export function aiGuasta(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('datiFinti.aiGuasta') === 'true'
  } catch {
    return false
  }
}
