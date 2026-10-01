// Tipi del lato social (progettazione v4, sezioni 8-11): amicizie, chat, notifiche e WebSocket.
// Import unico: import type { AmiciziaResponse, ChatResponse } from '@/types/api'

import type { IstanteIso, UtentePubblicoResponse, Uuid } from './comuni'

// ---------- 8. Amicizie ----------

/**
 * Stato di un'amicizia nelle liste, dal punto di vista di chi chiede. E' un sottoinsieme di
 * StatoAmicizia (quello dei partecipanti): nelle liste non compaiono NESSUNA e NON_DISPONIBILE.
 */
export type StatoAmiciziaLista = 'INVIATA' | 'RICEVUTA' | 'AMICI'

/** ListaAmici, ListaRichiesteRicevute, ListaRichiesteInviate; risposta di Richiedi e Accetta */
export type AmiciziaResponse = {
  id: Uuid
  altroUtente: UtentePubblicoResponse
  stato: StatoAmiciziaLista
  /** Evento in cui ci si e' conosciuti (la richiesta parte sempre da un evento) */
  eventoId: Uuid
  /** Chat della coppia se esiste, anche in sola lettura; null altrimenti */
  chatId: Uuid | null
}

/**
 * RichiediAmicizia: POST /api/friendships → 201 AmiciziaResponse (INVIATA).
 * Errori: 400 RICHIESTA_A_SE_STESSO, 403 NESSUN_TICKET, 404 NON_TROVATO, 409 UTENTE_NON_ATTIVO ·
 * RICHIESTA_GIA_INVIATA · RICHIESTA_GIA_RICEVUTA (proporre "accetta") · GIA_AMICI ·
 * AMICIZIA_NON_DISPONIBILE · CONFLITTO (ricaricare lo stato), 429 TROPPE_RICHIESTE (30 al giorno).
 */
export type RichiediAmiciziaRequest = {
  riceventeId: Uuid
  eventoId: Uuid
}

// ---------- 9. Chat ----------

/** ListaChat: GET /api/chats, dall'ultimo messaggio piu' recente; anche quelle in sola lettura */
export type ChatResponse = {
  id: Uuid
  amico: UtentePubblicoResponse
  /** null se la chat non ha ancora messaggi */
  ultimoMessaggio: UltimoMessaggio | null
  /** Messaggi dell'altro non ancora letti */
  nonLetti: number
  /** false = sola lettura (amicizia rimossa o uno dei due non attivo): niente campo di testo */
  puoiScrivere: boolean
}

export type UltimoMessaggio = {
  testo: string
  mittenteId: Uuid
  inviatoIl: IstanteIso
}

/** Un messaggio: da ListaMessaggi e live da /user/queue/messages */
export type MessaggioResponse = {
  id: Uuid
  chatId: Uuid
  /** Confrontarlo con l'id dell'utente stesso per allineare a destra i propri messaggi */
  mittenteId: Uuid
  testo: string
  letto: boolean
  inviatoIl: IstanteIso
}

/**
 * ListaMessaggi: GET /api/chats/{chatId}/messages?before=&size=
 * A cursore, non a pagine: i messaggi nuovi sposterebbero le pagine e mostrerebbero doppioni.
 */
export type MessaggiResponse = {
  /** Dal piu' recente al piu' vecchio */
  messaggi: MessaggioResponse[]
  /** true se ce ne sono di piu' vecchi: si richiedono con before = id dell'ultimo della lista */
  altri: boolean
}

export type ParametriListaMessaggi = {
  chatId: Uuid
  /** Id del messaggio piu' vecchio gia' caricato; assente per i piu' recenti */
  before?: Uuid
  /** Default 30, massimo 100 */
  size?: number
}

/** InviaMessaggio: SEND /app/chats/{chatId}/send sul WebSocket (non c'e' un endpoint REST) */
export type InviaMessaggioRequest = {
  /** Max 2000, non vuoto */
  testo: string
}

// ---------- 10. Notifiche ----------

/** Categorie: stessi valori nel percorso, in NotificaResponse e nel conteggio dei non letti */
export type CategoriaNotifica = 'events' | 'friendships' | 'chats'

export type TipoNotificaEvento = 'MODIFICA' | 'MANUALE' | 'ISCRIZIONE' | 'ANNULLAMENTO' | 'MODERAZIONE'
export type TipoNotificaAmicizia = 'RICHIESTA' | 'ACCETTATA'
export type TipoNotificaChat = 'NUOVI_MESSAGGI'

type NotificaBase = {
  id: Uuid
  /** Testo pronto da mostrare (con il nome attuale delle persone, "Utente anonimo" se anonimizzate) */
  testo: string
  letta: boolean
  creataIl: IstanteIso
}

/**
 * Una notifica. Il tipo dipende dalla categoria, e cosi' riferimentoId:
 *   events → evento (/events/:id) · friendships → amicizia (/friends) · chats → chat (/chat/:chatId)
 * Live (/user/queue/notifications) arrivano solo events e friendships; un id gia' ricevuto
 * e' una notifica accorpata: va sostituita, senza aumentare il badge.
 */
export type NotificaResponse = NotificaBase &
  (
    | { categoria: 'events'; tipo: TipoNotificaEvento; riferimentoId: Uuid }
    | { categoria: 'friendships'; tipo: TipoNotificaAmicizia; riferimentoId: Uuid }
    | { categoria: 'chats'; tipo: TipoNotificaChat; riferimentoId: Uuid }
  )

/** ContaNonLette: GET /api/notifications/unread-count. chats = chat con messaggi non letti */
export type ConteggiNonLette = Record<CategoriaNotifica, number>

// ---------- 11. WebSocket (STOMP) ----------

/** Destinazioni a cui ci si iscrive, connessi a /ws con "Authorization: Bearer <token>" nel CONNECT */
export const CODE_WEBSOCKET = {
  /** MessaggioResponse: i propri messaggi inviati e quelli ricevuti */
  messaggi: '/user/queue/messages',
  /** NotificaResponse, solo events e friendships */
  notifiche: '/user/queue/notifications',
  /** ErroreWebSocket { codice, messaggio } (lib/errori.ts) */
  errori: '/user/queue/errors',
} as const

/** Destinazione dell'invio di un messaggio */
export const destinazioneInvio = (chatId: Uuid) => `/app/chats/${chatId}/send`

/** Limiti dei campi del lato social */
export const LIMITI_SOCIAL = {
  testoMessaggio: 2000,
  /** Messaggi per pagina della chat: default e massimo */
  messaggiPerPagina: 30,
  messaggiPerPaginaMax: 100,
  /** Messaggi inviabili in un minuto */
  messaggiAlMinuto: 30,
  /** Richieste di amicizia in 24 ore */
  richiesteAmiciziaAlGiorno: 30,
} as const
