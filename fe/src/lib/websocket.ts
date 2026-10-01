import { Client, ReconnectionTimeMode, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { useSyncExternalStore } from 'react'
import { BASE } from './api'

// Connessione STOMP al backend (progettazione v4, sezione 11; decisioni 11 e 22): una sola per
// tutta l'app, aperta da components/layout/ConnessioneLive finche' c'e' una sessione.
// Le pagine non la aprono: si iscrivono alle code e inviano con le funzioni qui sotto.
//
//   // in un useEffect: la funzione restituita annulla l'iscrizione
//   useEffect(() => iscriviti<MessaggioResponse>('/user/queue/messages', (m) => ...), [])
//   invia(`/app/chats/${chatId}/send`, { testo })   // false se in quel momento non e' connessa
//   const stato = useStatoConnessione()             // 'connesso' → indicatore verde

export type StatoConnessione = 'assente' | 'connessione' | 'connesso' | 'riconnessione'

/** Chi ha aperto la connessione (ConnessioneLive) viene avvisato di questi due casi */
export type EventiConnessione = {
  /** Di nuovo connessi dopo una caduta (deploy, backend sospeso da Render): si ricarica cio' che e' arrivato nel frattempo */
  riconnesso: () => void
  /** Il backend ha rifiutato il token: la connessione si ferma, niente nuovi tentativi */
  tokenNonValido: () => void
}

// In sviluppo BASE e' vuota: stesso host della pagina, /ws lo inoltra il proxy di Vite.
// In produzione da VITE_API_URL: https://... → wss://...
function indirizzo() {
  if (BASE) return `${BASE.replace(/^http/, 'ws')}/ws`
  const protocollo = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocollo}//${window.location.host}/ws`
}

type Iscrizione = {
  destinazione: string
  callback: (corpo: unknown) => void
  /** Iscrizione STOMP della connessione attuale; si rifa' a ogni riconnessione */
  stomp?: StompSubscription
}
const iscrizioni = new Set<Iscrizione>()

let stato: StatoConnessione = 'assente'
const osservatori = new Set<() => void>()
function cambiaStato(nuovo: StatoConnessione) {
  if (nuovo === stato) return
  stato = nuovo
  osservatori.forEach((o) => o())
}

let eventi: EventiConnessione | null = null
/** true dopo il primo CONNECTED: da li' in poi ogni CONNECTED e' una riconnessione */
let giaConnesso = false

const client = new Client({
  // Primo tentativo dopo 1 secondo, poi il doppio a ogni fallimento fino a 30: su Render
  // gratuito il backend sospeso impiega circa un minuto a ripartire. Dopo una connessione
  // riuscita l'attesa torna a 1 secondo.
  reconnectDelay: 1000,
  maxReconnectDelay: 30_000,
  reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
  onConnect: () => {
    cambiaStato('connesso')
    iscrizioni.forEach((i) => (i.stomp = sottoscrivi(i)))
    if (giaConnesso) eventi?.riconnesso()
    giaConnesso = true
  },
  onWebSocketClose: () => {
    // Le iscrizioni STOMP muoiono con la connessione: si rifanno al prossimo CONNECTED
    iscrizioni.forEach((i) => (i.stomp = undefined))
    if (client.active) cambiaStato(giaConnesso ? 'riconnessione' : 'connessione')
  },
  // Frame ERROR del CONNECT: header message = codice (interfacce.md, WebSocket STOMP).
  // Gli altri errori arrivano su /user/queue/errors e non chiudono la connessione.
  onStompError: (frame) => {
    if (frame.headers.message !== 'TOKEN_NON_VALIDO') return
    fermaPerToken()
  },
})

function sottoscrivi(i: Iscrizione) {
  return client.subscribe(i.destinazione, (messaggio: IMessage) => {
    let corpo: unknown
    try {
      corpo = JSON.parse(messaggio.body)
    } catch {
      return // corpo non JSON: il backend manda sempre DTO, si ignora
    }
    i.callback(corpo)
  })
}

/** Apre la connessione con il token della sessione. Solo per ConnessioneLive. */
export function connetti(token: string, eventiConnessione: EventiConnessione) {
  eventi = eventiConnessione
  giaConnesso = false
  client.brokerURL = indirizzo()
  client.connectHeaders = { Authorization: `Bearer ${token}` }
  cambiaStato('connessione')
  // Se la connessione di prima si sta ancora chiudendo, activate() aspetta che finisca
  client.activate()
}

/** Chiude la connessione e smette di riprovare (uscita, token cambiato). Solo per ConnessioneLive. */
export function disconnetti() {
  eventi = null
  giaConnesso = false
  cambiaStato('assente')
  void client.deactivate()
}

/** TOKEN_NON_VALIDO (al CONNECT o su /user/queue/errors dopo un SEND): riprovare con lo stesso token non serve */
export function fermaPerToken() {
  const avvisa = eventi
  disconnetti()
  avvisa?.tokenNonValido()
}

/**
 * Riceve i messaggi di una coda (/user/queue/messages, /user/queue/notifications,
 * /user/queue/errors), gia' convertiti dal JSON. Vale anche prima della connessione e
 * sopravvive alle riconnessioni. Restituisce la funzione che annulla l'iscrizione.
 */
export function iscriviti<T>(destinazione: string, callback: (corpo: T) => void): () => void {
  const i: Iscrizione = { destinazione, callback: callback as (corpo: unknown) => void }
  iscrizioni.add(i)
  if (client.connected) i.stomp = sottoscrivi(i)
  return () => {
    iscrizioni.delete(i)
    if (client.connected) i.stomp?.unsubscribe()
  }
}

/** SEND verso /app/**, con il corpo in JSON. false se ora non c'e' connessione (il messaggio non parte). */
export function invia(destinazione: string, corpo: unknown): boolean {
  if (!client.connected) return false
  client.publish({ destination: destinazione, body: JSON.stringify(corpo) })
  return true
}

function osserva(osservatore: () => void) {
  osservatori.add(osservatore)
  return () => {
    osservatori.delete(osservatore)
  }
}

/** Stato della connessione, per l'indicatore nelle pagine chat e notifiche */
export function useStatoConnessione(): StatoConnessione {
  return useSyncExternalStore(osserva, () => stato)
}
