// Tipi del lato eventi (FE1-03), dalla progettazione v4, sezioni 3-7 e 12.
// I nomi dei campi sono quelli dei DTO Java: non tradurli ne' rinominarli.
import type { IstanteIso, StatoAmicizia, UtentePubblicoResponse, Uuid } from './comuni'

/** Stato dell'evento nei DTO: IN_CORSO e CONCLUSO il backend li calcola dalle date */
export type StatoEvento = 'PROGRAMMATO' | 'IN_CORSO' | 'CONCLUSO' | 'ANNULLATO'

/** Tipo di un punto di interesse (POI) dentro l'area dell'evento */
export type TipoPoi = 'INGRESSO' | 'USCITA' | 'EMERGENZA'

// ---------------------------------------------------------------- Risposte

/**
 * Evento nella lista e sulla mappa (GET /api/events, GET /api/users/me/events).
 * La lista pubblica contiene solo eventi PROGRAMMATO e IN_CORSO.
 */
export type EventoMappaResponse = {
  id: Uuid
  titolo: string
  dataEvento: IstanteIso
  dataFine: IstanteIso
  stato: StatoEvento
  lat: number
  lng: number
  /** Percorso relativo della copertina (decisione 9), null se l'evento non ha foto: usare urlImmagine() */
  copertinaUrl: string | null
  /** Distanza dall'utente, null se la posizione non e' stata passata (?lat=&lng=) */
  distanzaKm: number | null
}

/** Foto di un evento; al massimo 10, una sola e' la copertina */
export type FotoResponse = {
  id: Uuid
  /** Percorso relativo "/api/events/{id}/photos/{fotoId}/image?v=..." (decisione 9): usare urlImmagine() */
  url: string
  /** Testo alternativo, max 150 caratteri */
  didascalia: string | null
  copertina: boolean
}

/** Punto di interesse sulla mappa interna dell'evento; al massimo 15, entro 2 km */
export type PoiResponse = {
  id: Uuid
  tipo: TipoPoi
  lat: number
  lng: number
  /** Es. "Ingresso nord", max 50 caratteri */
  etichetta: string | null
}

/** Artista del catalogo (gestito dagli admin) */
export type ArtistaResponse = {
  id: Uuid
  nome: string
  /** Percorso relativo "/api/artists/{artistaId}/image?v=..." (decisione 9), null se manca: usare urlImmagine() */
  immagineUrl: string | null
  /** false = disattivato: non si puo' piu' aggiungere agli eventi, ma resta in quelli dove c'e' */
  attivo: boolean
}

/** Dettaglio dell'evento (GET /api/events/{id}), anche annullato */
export type EventoDettaglioResponse = {
  id: Uuid
  titolo: string
  descrizione: string | null
  dataEvento: IstanteIso
  dataFine: IstanteIso
  stato: StatoEvento
  /** Valorizzato solo con stato ANNULLATO, e solo se il motivo e' stato scritto */
  motivoAnnullamento: string | null
  lat: number
  lng: number
  proprietario: UtentePubblicoResponse
  /** Prima la copertina, poi in ordine di caricamento */
  foto: FotoResponse[]
  /** In ordine alfabetico */
  artisti: ArtistaResponse[]
  poi: PoiResponse[]
  numeroPartecipanti: number
  /** false se chi guarda non ha fatto l'accesso */
  sonoProprietario: boolean
  /** false se chi guarda non ha fatto l'accesso */
  sonoIscritto: boolean
}

/**
 * Ticket di iscrizione a un evento (IscrizioneEvento, VediMiaPartecipazione, MieiTicket).
 * Il ticket vale finche' l'iscrizione esiste: se viene cancellata, non vale piu'.
 */
export type TicketResponse = {
  id: Uuid
  /** Codice univoco (UUID) da mostrare all'ingresso */
  codice: Uuid
  emessoIl: IstanteIso
  /** Riassunto dell'evento, per mostrare il ticket senza chiedere il dettaglio */
  evento: {
    id: Uuid
    titolo: string
    dataEvento: IstanteIso
    dataFine: IstanteIso
    stato: StatoEvento
    lat: number
    lng: number
  }
  partecipante: {
    nome: string
    cognome: string
  }
}

/**
 * Una riga di ListaPartecipanti (GET /api/events/{id}/participants): la vede solo chi ha un
 * ticket per l'evento, oppure il proprietario. Chi fa la richiesta non compare nella lista.
 * Ordine: prima il proprietario (anche se non e' iscritto), poi i partecipanti per emessoIl.
 */
export type PartecipanteResponse = {
  utente: UtentePubblicoResponse
  /** true per il proprietario dell'evento, che compare in cima */
  proprietario: boolean
  statoAmicizia: StatoAmicizia
  /** Valorizzato con INVIATA, RICEVUTA e AMICI; null con NESSUNA e NON_DISPONIBILE */
  amiciziaId: Uuid | null
  /** Chat della coppia (decisione 20): con AMICI c'e' sempre, con INVIATA e RICEVUTA se esiste gia' */
  chatId: Uuid | null
}

// ---------------------------------------------------------------- Richieste
// PATCH (Modifica...Request): tutti i campi facoltativi. Campo assente o null = invariato;
// "" su un testo facoltativo = rimosso. Un body senza nessun campo → 400 RICHIESTA_VUOTA.
// Le date si mandano in ISO 8601 con fuso orario (IstanteIso).

/** CreaEvento: POST /api/events */
export type EventoRequest = {
  /** Obbligatorio, max 150 */
  titolo: string
  /** Max 5000 */
  descrizione?: string
  /** Nel futuro */
  dataEvento: IstanteIso
  /** Nel futuro e dopo dataEvento (altrimenti 400 DATE_NON_VALIDE) */
  dataFine: IstanteIso
  lat: number
  lng: number
}

/** ModificaEvento: PATCH /api/events/{id} (solo il proprietario) */
export type ModificaEventoRequest = {
  /** Max 150, non vuoto */
  titolo?: string
  /** Max 5000, "" = rimuovi */
  descrizione?: string
  /** Non si puo' cambiare a evento iniziato (409 EVENTO_GIA_INIZIATO) */
  dataEvento?: IstanteIso
  dataFine?: IstanteIso
  /** Spostando l'evento, i POI devono restare entro 2 km (409 POI_FUORI_RAGGIO) */
  lat?: number
  lng?: number
}

/** MiglioraDescrizioneAI: POST /api/events/{id}/description/ai (NON salva) */
export type MiglioraDescrizioneRequest = {
  /** Foto dell'evento da mandare all'AI insieme al testo */
  fotoId: Uuid
  /** Max 5000; se manca o e' vuota si usa quella salvata */
  descrizione?: string
}

export type MiglioraDescrizioneResponse = {
  /** Da confermare con ModificaEvento { descrizione } */
  descrizioneProposta: string
}

/** AnnullaEvento: POST /api/events/{id}/cancel (proprietario, motivo facoltativo) */
export type AnnullaEventoRequest = {
  /** Max 500, compare nella notifica ai partecipanti */
  motivo?: string
}

/**
 * CreaFoto: POST /api/events/{id}/photos, in multipart/form-data (non JSON):
 *   const dati = new FormData(); dati.append('file', file); dati.append('didascalia', testo)
 */
export type FotoRequest = {
  /** JPEG, PNG o WEBP, max 5 MB */
  file: File
  /** Max 150, testo alternativo */
  didascalia?: string
}

/** ModificaFoto: PATCH /api/events/{id}/photos/{fotoId} */
export type ModificaFotoRequest = {
  /** Max 150, "" = rimuovi */
  didascalia?: string
  /** Solo true: la foto diventa la copertina (false → 400 COPERTINA_NON_VALIDA) */
  copertina?: true
}

/** CreaPOI: POST /api/events/{id}/pois */
export type PoiRequest = {
  tipo: TipoPoi
  /** Entro 2 km dall'evento (altrimenti 400 POI_TROPPO_LONTANO) */
  lat: number
  lng: number
  /** Max 50, es. "Ingresso nord" */
  etichetta?: string
}

/** ModificaPOI: PATCH /api/events/{id}/pois/{poiId} */
export type ModificaPoiRequest = {
  tipo?: TipoPoi
  lat?: number
  lng?: number
  /** Max 50, "" = rimuovi */
  etichetta?: string
}

/** CreaArtista: POST /api/admin/artists (solo ADMIN) */
export type ArtistaRequest = {
  /** Obbligatorio, max 100, unico senza distinzione di maiuscole */
  nome: string
  /** Solo https, max 500 */
  immagineUrl?: string
}

/** ModificaArtista: PATCH /api/admin/artists/{artistaId} (solo ADMIN) */
export type ModificaArtistaRequest = {
  /** Max 100, non vuoto */
  nome?: string
  /** Solo https, max 500, "" = rimuovi */
  immagineUrl?: string
  /** false = disattivato: sparisce dal catalogo ma resta negli eventi dove c'e' gia' */
  attivo?: boolean
}

/** AnnullaEventoModerazione: POST /api/admin/events/{id}/cancel (solo ADMIN) */
export type AnnullaEventoModerazioneRequest = {
  /** Obbligatorio (a differenza di AnnullaEvento), max 500 */
  motivo: string
}

/**
 * InviaNotificaManuale: POST /api/events/{id}/notifications (solo il proprietario).
 * Descritta nella sezione 10 (notifiche), ma e' un'azione sull'evento: sta qui con le altre.
 * Limite: 5 al giorno per evento (429 TROPPE_RICHIESTE).
 */
export type NotificaManualeRequest = {
  /** Obbligatorio, max 500 */
  testo: string
}

export type NotificaManualeResponse = {
  /** Quanti partecipanti hanno ricevuto la notifica */
  inviate: number
}

// ---------------------------------------------------------------- Parametri di query

/**
 * ListaEventiMappa: GET /api/events?lat=&lng=
 * La posizione dell'utente (solo con il suo consenso) va passata tutta o per niente,
 * arrotondata a 2 decimali (circa 1 km). Cambia l'ORDINE degli eventi, mai il numero.
 */
export type ParametriListaEventi = Record<string, never> | { lat: number; lng: number }

/** ListaArtisti: GET /api/artists?search= (solo artisti attivi, in ordine alfabetico) */
export type ParametriListaArtisti = {
  /** Max 100: cerca il testo nel nome, senza distinzione di maiuscole */
  search?: string
}

// ---------------------------------------------------------------- Limiti

/** Limiti della progettazione v4: per maxLength dei campi e per i controlli prima di inviare */
export const LIMITI_EVENTI = {
  titolo: 150,
  descrizione: 5000,
  motivoAnnullamento: 500,
  testoNotificaManuale: 500,
  notificheManualiAlGiorno: 5,
  didascalia: 150,
  etichettaPoi: 50,
  nomeArtista: 100,
  immagineUrlArtista: 500,
  fotoPerEvento: 10,
  poiPerEvento: 15,
  /** Distanza massima di un POI dall'evento */
  raggioPoiKm: 2,
  /** Dimensione massima di una foto */
  byteFoto: 5 * 1024 * 1024,
  tipiFoto: ['image/jpeg', 'image/png', 'image/webp'],
  /** Decimali della posizione dell'utente in ListaEventiMappa */
  decimaliPosizione: 2,
} as const
