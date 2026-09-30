// Tipi del lato eventi (FE1-03), dalla progettazione v4, sezioni 3-7 e 12.
// I nomi dei campi sono quelli dei DTO Java: non tradurli ne' rinominarli.
import type { IstanteIso, UtentePubblicoResponse, Uuid } from './comuni'

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
  /** URL della foto di copertina, null se l'evento non ha foto */
  copertinaUrl: string | null
  /** Distanza dall'utente, null se la posizione non e' stata passata (?lat=&lng=) */
  distanzaKm: number | null
}

/** Foto di un evento; al massimo 10, una sola e' la copertina */
export type FotoResponse = {
  id: Uuid
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
