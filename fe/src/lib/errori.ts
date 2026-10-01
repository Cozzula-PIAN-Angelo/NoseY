import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { isCodiceErrore, TESTI_ERRORE, type CodiceErrore, type TestoErrore } from './codiciErrore'

// Corpo delle risposte d'errore del backend (be/.../common/ErroreResponse.java).
export type ErroreResponse = {
  status: number
  /** Stringa stabile in MAIUSCOLO: il frontend decide in base a questa, MAI a "messaggio" */
  codice: string
  errore: string
  /** Testo per chi sviluppa: all'utente si mostra il testo del catalogo, non questo */
  messaggio: string
  /** Errori di validazione per campo, valorizzato solo con codice VALIDAZIONE */
  campi: Record<string, string>
  timestamp: string
}

// Errore dal WebSocket, su /user/queue/errors.
export type ErroreWebSocket = { codice: string; messaggio: string }

// Errore pronto da mostrare all'utente.
export type ErroreLeggibile = {
  /** Codice del backend, per decidere cosa fare (es. EMAIL_NON_VERIFICATA → pagina di verifica) */
  codice?: CodiceErrore
  /** Codice HTTP, assente se il server non ha risposto o l'errore arriva dal WebSocket */
  status?: number
  titolo: string
  messaggio: string
  /** Errori dei singoli campi: <TextField errore={e.campi.email} /> */
  campi: Record<string, string>
}

// Riserva per codici che il frontend non conosce ancora: si guarda solo lo status HTTP.
const perStatus: Record<number, CodiceErrore> = {
  400: 'VALIDAZIONE',
  401: 'NON_AUTENTICATO',
  403: 'ACCESSO_NEGATO',
  404: 'NON_TROVATO',
  409: 'CONFLITTO',
  429: 'TROPPE_RICHIESTE',
  500: 'ERRORE_INTERNO',
  502: 'SERVIZIO_ESTERNO',
}

const erroreRete: TestoErrore = {
  titolo: 'Server non raggiungibile',
  messaggio: 'Controlla la connessione a internet e riprova.',
}

export function isErroreResponse(dato: unknown): dato is ErroreResponse {
  return (
    typeof dato === 'object' &&
    dato !== null &&
    typeof (dato as ErroreResponse).status === 'number' &&
    typeof (dato as ErroreResponse).codice === 'string'
  )
}

function daCodice(codice: CodiceErrore, status?: number, campi: Record<string, string> = {}): ErroreLeggibile {
  return { codice, status, ...TESTI_ERRORE[codice], campi }
}

// Errore leggibile a partire dallo status HTTP e dal corpo della risposta.
export function erroreDaRisposta(status: number, corpo?: unknown): ErroreLeggibile {
  if (isErroreResponse(corpo) && isCodiceErrore(corpo.codice)) {
    return daCodice(corpo.codice, status, corpo.codice === 'VALIDAZIONE' ? (corpo.campi ?? {}) : {})
  }
  // 502/503/504 senza ErroreResponse non vengono dal backend ma da chi sta davanti (proxy di
  // Vite col backend spento, Render che lo sta riavviando): non e' SERVIZIO_ESTERNO (l'AI)
  if (!isErroreResponse(corpo) && [502, 503, 504].includes(status)) return { ...erroreRete, status, campi: {} }
  // Codice sconosciuto o risposta senza ErroreResponse (es. proxy): conta solo lo status
  const codice = perStatus[status] ?? (status >= 500 ? 'ERRORE_INTERNO' : undefined)
  if (codice) return { ...daCodice(codice, status), codice: undefined }
  return { status, titolo: `Errore ${status}`, messaggio: TESTI_ERRORE.ERRORE_INTERNO.messaggio, campi: {} }
}

// Converte qualunque errore (RTK Query, WebSocket, eccezione JS...) in un ErroreLeggibile.
// Uso tipico: const { error } = useQualcosaQuery(); const e = error && leggiErrore(error)
export function leggiErrore(errore: FetchBaseQueryError | SerializedError | ErroreWebSocket | unknown): ErroreLeggibile {
  if (typeof errore === 'object' && errore !== null) {
    // RTK Query
    if ('status' in errore) {
      const e = errore as FetchBaseQueryError
      if (typeof e.status === 'number') return erroreDaRisposta(e.status, e.data)
      switch (e.status) {
        case 'FETCH_ERROR':
          return { ...erroreRete, campi: {} }
        case 'TIMEOUT_ERROR':
          return { titolo: 'Tempo scaduto', messaggio: 'Il server non ha risposto in tempo. Riprova.', campi: {} }
        case 'PARSING_ERROR':
          // Risposta non JSON (es. pagina d'errore del proxy): conta solo lo status originale
          return erroreDaRisposta(e.originalStatus)
        case 'CUSTOM_ERROR':
          return { ...TESTI_ERRORE.ERRORE_INTERNO, campi: {} }
      }
    }
    // WebSocket: { codice, messaggio } senza status
    const codice = (errore as { codice?: unknown }).codice
    if (isCodiceErrore(codice)) return daCodice(codice)
  }
  // Eccezione JS o altro: il suo messaggio e' tecnico, all'utente si mostra quello generico
  return { ...TESTI_ERRORE.ERRORE_INTERNO, campi: {} }
}
