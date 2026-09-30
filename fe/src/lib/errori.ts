import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

// Corpo delle risposte d'errore del backend (NoseY-endpoint.md, sezione 0).
export type ErroreResponse = {
  status: number
  errore: string
  messaggio: string
  /** Errori di validazione per campo: { email: "formato non valido" } */
  campi?: Record<string, string> | null
  timestamp: string
}

// Errore pronto da mostrare: titolo breve + spiegazione + errori dei singoli campi.
export type ErroreLeggibile = {
  /** Codice HTTP, assente se il server non ha risposto */
  status?: number
  titolo: string
  messaggio: string
  campi: Record<string, string>
}

// Titolo e messaggio di riserva per ogni codice, usati quando il backend non manda
// un messaggio suo. Il messaggio del backend e' piu' preciso ("Email gia' registrata")
// e ha la precedenza.
const perCodice: Record<number, { titolo: string; messaggio: string }> = {
  400: { titolo: 'Dati non validi', messaggio: 'Controlla i campi evidenziati e riprova.' },
  401: { titolo: 'Sessione scaduta', messaggio: 'Accedi di nuovo per continuare.' },
  403: { titolo: 'Operazione non consentita', messaggio: 'Non hai i permessi per questa operazione.' },
  404: { titolo: 'Non trovato', messaggio: 'Quello che cerchi non esiste o è stato rimosso.' },
  409: {
    titolo: 'Operazione non possibile',
    messaggio: "L'operazione è in conflitto con lo stato attuale (ad esempio l'evento è concluso o annullato).",
  },
  429: { titolo: 'Troppe richieste', messaggio: 'Attendi qualche secondo prima di riprovare.' },
  502: {
    titolo: 'Servizio esterno non disponibile',
    messaggio: 'Un servizio esterno (immagini o AI) non risponde. Riprova tra poco.',
  },
}

const erroreServer = { titolo: 'Errore del server', messaggio: 'Si è verificato un problema imprevisto. Riprova tra poco.' }
const erroreRete = {
  titolo: 'Server non raggiungibile',
  messaggio: 'Controlla la connessione a internet e riprova.',
}

export function isErroreResponse(dato: unknown): dato is ErroreResponse {
  return (
    typeof dato === 'object' &&
    dato !== null &&
    typeof (dato as ErroreResponse).status === 'number' &&
    typeof (dato as ErroreResponse).messaggio === 'string'
  )
}

// Errore leggibile a partire dal codice HTTP e dall'eventuale corpo della risposta.
export function erroreDaRisposta(status: number, corpo?: unknown): ErroreLeggibile {
  const base = perCodice[status] ?? (status >= 500 ? erroreServer : { titolo: `Errore ${status}`, messaggio: erroreServer.messaggio })
  const risposta = isErroreResponse(corpo) ? corpo : undefined
  return {
    status,
    titolo: base.titolo,
    messaggio: risposta?.messaggio?.trim() || base.messaggio,
    campi: risposta?.campi ?? {},
  }
}

// Converte qualunque errore (RTK Query, eccezione JS, altro) in un ErroreLeggibile.
// Uso tipico: const { error } = useQualcosaQuery(); const e = error && leggiErrore(error)
export function leggiErrore(errore: FetchBaseQueryError | SerializedError | unknown): ErroreLeggibile {
  if (typeof errore === 'object' && errore !== null && 'status' in errore) {
    const e = errore as FetchBaseQueryError
    if (typeof e.status === 'number') return erroreDaRisposta(e.status, e.data)
    switch (e.status) {
      case 'FETCH_ERROR':
        return { ...erroreRete, campi: {} }
      case 'TIMEOUT_ERROR':
        return { titolo: 'Tempo scaduto', messaggio: 'Il server non ha risposto in tempo. Riprova.', campi: {} }
      case 'PARSING_ERROR':
        // Risposta non JSON (es. pagina d'errore del proxy): conta solo il codice originale
        return erroreDaRisposta(e.originalStatus)
      case 'CUSTOM_ERROR':
        return { titolo: 'Errore', messaggio: e.error, campi: {} }
    }
  }
  if (errore instanceof Error || (typeof errore === 'object' && errore !== null && 'message' in errore)) {
    const messaggio = (errore as { message?: string }).message
    return { titolo: 'Errore', messaggio: messaggio || erroreServer.messaggio, campi: {} }
  }
  return { ...erroreServer, campi: {} }
}
