// "Database" in memoria dei dati finti (FE1-03). Le modifiche (nuovi eventi, iscrizioni...)
// restano finche' non si ricarica la pagina. Le date sono relative ad "adesso", cosi' gli
// stati (in corso, programmato, concluso) sono sempre coerenti.
import type {
  ArtistaResponse,
  EventoDettaglioResponse,
  EventoMappaResponse,
  FotoResponse,
  IstanteIso,
  PoiResponse,
  StatoAmicizia,
  TicketResponse,
  UtentePubblicoResponse,
  Uuid,
} from '@/types/api'
import { immagineFinta, statoDa, traOre } from './utili'

// ---------------------------------------------------------------- Immagini

/**
 * Immagini servite dai GET finti, come il backend (decisione 9): nei DTO va il percorso relativo
 * con ?v=, qui il contenuto. Chiave = percorso senza ?v=.
 */
export const immagini = new Map<string, { contenuto: Blob | string; tipo: string }>()
let versioneImmagini = 0

/** Salva un'immagine e restituisce il percorso da mettere nel DTO, es. "/api/artists/a-01/image?v=..." */
export function salvaImmagine(percorso: string, contenuto: Blob | string, tipo = 'image/svg+xml'): string {
  immagini.set(percorso, { contenuto, tipo })
  return `${percorso}?v=${(++versioneImmagini).toString(16).padStart(16, '0')}`
}

/** Toglie l'immagine di un percorso (anche con ?v=) */
export const cancellaImmagine = (percorso: string) => immagini.delete(percorso.split('?')[0])

// ---------------------------------------------------------------- Utenti

/** L'utente "loggato": finche' non c'e' l'autenticazione, i dati finti fanno tutto a nome suo */
export const ID_UTENTE_CORRENTE: Uuid = 'u-0000-valentina'

export const utenti: UtentePubblicoResponse[] = [
  { id: ID_UTENTE_CORRENTE, nome: 'Valentina', cognome: 'Ferro', immagineProfilo: null, attivo: true },
  {
    id: 'u-0001-sofia',
    nome: 'Sofia',
    cognome: 'Moretti',
    immagineProfilo: salvaImmagine('/api/users/u-0001-sofia/avatar', immagineFinta('SM', 320)),
    attivo: true,
  },
  { id: 'u-0002-matteo', nome: 'Matteo', cognome: 'Valenti', immagineProfilo: null, attivo: true },
  { id: 'u-0003-elena', nome: 'Elena', cognome: 'Rostagno', immagineProfilo: null, attivo: true },
  { id: 'u-0004-dario', nome: 'Dario', cognome: 'Lucidi', immagineProfilo: null, attivo: true },
  { id: 'u-0005-anonimo', nome: 'Utente', cognome: 'anonimo', immagineProfilo: null, attivo: false },
]

/** Amicizie viste dall'utente corrente (per statoAmicizia nella lista dei partecipanti) */
export const amicizieCorrente: Record<Uuid, { stato: StatoAmicizia; amiciziaId: Uuid }> = {
  'u-0001-sofia': { stato: 'AMICI', amiciziaId: 'am-01' },
  'u-0002-matteo': { stato: 'INVIATA', amiciziaId: 'am-02' },
  'u-0003-elena': { stato: 'RICEVUTA', amiciziaId: 'am-03' },
}

export const trovaUtente = (id: Uuid) => utenti.find((u) => u.id === id)!

// ---------------------------------------------------------------- Artisti

const artistaImg = (id: Uuid, nome: string, tinta: number) =>
  salvaImmagine(`/api/artists/${id}/image`, immagineFinta(nome, tinta))

export const artisti: ArtistaResponse[] = [
  { id: 'a-01', nome: 'Aura Minimal', immagineUrl: artistaImg('a-01', 'Aura Minimal', 280), attivo: true },
  { id: 'a-02', nome: 'Distorsioni Analogiche', immagineUrl: artistaImg('a-02', 'Distorsioni Analogiche', 190), attivo: true },
  { id: 'a-03', nome: 'Elena Kosh', immagineUrl: artistaImg('a-03', 'Elena Kosh', 320), attivo: true },
  { id: 'a-04', nome: 'Komorebi Sound Lab', immagineUrl: artistaImg('a-04', 'Komorebi Sound Lab', 170), attivo: true },
  { id: 'a-05', nome: 'Marco Jovine Trio', immagineUrl: artistaImg('a-05', 'Marco Jovine Trio', 30), attivo: true },
  { id: 'a-06', nome: 'Vektor Theory Live', immagineUrl: artistaImg('a-06', 'Vektor Theory Live', 250), attivo: true },
  { id: 'a-07', nome: 'Echo Chamber (ritirati)', immagineUrl: null, attivo: false },
]

// ---------------------------------------------------------------- Eventi

export type Partecipazione = { utenteId: Uuid; ticketId: Uuid; codice: Uuid; emessoIl: IstanteIso }

export type EventoFinto = {
  id: Uuid
  titolo: string
  descrizione: string | null
  dataEvento: IstanteIso
  dataFine: IstanteIso
  /** Nel DB ci sono solo PROGRAMMATO e ANNULLATO: gli altri stati si calcolano (statoDa) */
  annullato: boolean
  motivoAnnullamento: string | null
  lat: number
  lng: number
  proprietarioId: Uuid
  foto: FotoResponse[]
  artistiIds: Uuid[]
  poi: PoiResponse[]
  partecipanti: Partecipazione[]
}

let contatore = 0
/** Id nuovo per le risorse create durante la sessione */
export const nuovoId = (prefisso: string): Uuid => `${prefisso}-${Date.now().toString(36)}-${++contatore}`

const foto = (evento: string, titolo: string, tinta: number, quante = 2): FotoResponse[] =>
  Array.from({ length: quante }, (_, i) => ({
    id: `f-${evento}-${i + 1}`,
    url: salvaImmagine(
      `/api/events/e-${evento}/photos/f-${evento}-${i + 1}/image`,
      immagineFinta(i === 0 ? titolo : `${titolo} · ${i + 1}`, tinta + i * 25),
    ),
    didascalia: i === 0 ? `Locandina di ${titolo}` : null,
    copertina: i === 0,
  }))

const iscritto = (evento: string, utenteId: Uuid, oreFa: number): Partecipazione => ({
  utenteId,
  ticketId: `t-${evento}-${utenteId}`,
  codice: crypto.randomUUID(),
  emessoIl: traOre(-oreFa),
})

export const eventi: EventoFinto[] = [
  {
    id: 'e-01',
    titolo: 'Chronos: Parallel Frequencies',
    descrizione: 'Live session con Dark Room Collective. Scanner QR al varco nord.',
    dataEvento: traOre(-2),
    dataFine: traOre(5),
    annullato: false,
    motivoAnnullamento: null,
    lat: 41.8902,
    lng: 12.4922,
    proprietarioId: 'u-0001-sofia',
    foto: foto('01', 'Chronos', 265, 3),
    artistiIds: ['a-03', 'a-06'],
    poi: [
      { id: 'p-01-1', tipo: 'INGRESSO', lat: 41.8912, lng: 12.4902, etichetta: 'Ingresso nord' },
      { id: 'p-01-2', tipo: 'USCITA', lat: 41.8893, lng: 12.4948, etichetta: 'Uscita est' },
      { id: 'p-01-3', tipo: 'EMERGENZA', lat: 41.8889, lng: 12.4906, etichetta: 'Presidio medico' },
    ],
    partecipanti: [
      iscritto('01', ID_UTENTE_CORRENTE, 30),
      iscritto('01', 'u-0002-matteo', 50),
      iscritto('01', 'u-0003-elena', 40),
      iscritto('01', 'u-0005-anonimo', 60),
    ],
  },
  {
    id: 'e-02',
    titolo: 'Nocturne Blue Jazz Quartet',
    descrizione: 'Atmosfere intime con un quartetto di improvvisazione contemporanea.',
    dataEvento: traOre(6),
    dataFine: traOre(10),
    annullato: false,
    motivoAnnullamento: null,
    lat: 41.9006,
    lng: 12.5075,
    proprietarioId: 'u-0002-matteo',
    foto: foto('02', 'Nocturne Blue', 220),
    artistiIds: ['a-05'],
    poi: [{ id: 'p-02-1', tipo: 'INGRESSO', lat: 41.9009, lng: 12.5069, etichetta: 'Ingresso principale' }],
    partecipanti: [iscritto('02', ID_UTENTE_CORRENTE, 5)],
  },
  {
    id: 'e-03',
    titolo: 'Subterranean Resonance V',
    descrizione: 'Sessione underground nei cunicoli recuperati.',
    dataEvento: traOre(-1),
    dataFine: traOre(4),
    annullato: false,
    motivoAnnullamento: null,
    lat: 41.8527,
    lng: 12.4887,
    proprietarioId: ID_UTENTE_CORRENTE,
    foto: foto('03', 'Subterranean V', 150),
    artistiIds: ['a-02', 'a-01'],
    poi: [
      { id: 'p-03-1', tipo: 'INGRESSO', lat: 41.8531, lng: 12.4879, etichetta: null },
      { id: 'p-03-2', tipo: 'EMERGENZA', lat: 41.8522, lng: 12.4893, etichetta: 'PMA centrale' },
    ],
    partecipanti: [iscritto('03', 'u-0001-sofia', 20), iscritto('03', 'u-0004-dario', 10)],
  },
  {
    id: 'e-04',
    titolo: 'Synthwave Retro Bunker',
    descrizione: 'Laser show a 360 gradi e sintetizzatori analogici.',
    dataEvento: traOre(52),
    dataFine: traOre(58),
    annullato: false,
    motivoAnnullamento: null,
    lat: 41.9109,
    lng: 12.4818,
    proprietarioId: 'u-0003-elena',
    foto: foto('04', 'Synthwave Bunker', 300),
    artistiIds: ['a-06'],
    poi: [],
    partecipanti: [],
  },
  {
    id: 'e-05',
    titolo: 'Electric Velvet: Sunrise Session',
    descrizione: null,
    dataEvento: traOre(76),
    dataFine: traOre(82),
    annullato: false,
    motivoAnnullamento: null,
    lat: 41.9231,
    lng: 12.5335,
    proprietarioId: ID_UTENTE_CORRENTE,
    foto: [],
    artistiIds: [],
    poi: [],
    partecipanti: [],
  },
  {
    id: 'e-06',
    titolo: 'Warehouse Distortion Live',
    descrizione: 'Visual 3D immersivi e sintetizzatori modulari dal vivo.',
    dataEvento: traOre(28),
    dataFine: traOre(34),
    annullato: false,
    motivoAnnullamento: null,
    lat: 41.8703,
    lng: 12.4671,
    proprietarioId: 'u-0004-dario',
    foto: foto('06', 'Warehouse Distortion', 10),
    artistiIds: ['a-02'],
    poi: [],
    partecipanti: [iscritto('06', 'u-0001-sofia', 3)],
  },
  // Fuori dalla lista della mappa: concluso e annullato (si vedono nel dettaglio e nei ticket)
  {
    id: 'e-07',
    titolo: 'Komorebi Sunset Ritual',
    descrizione: 'Ambient al tramonto.',
    dataEvento: traOre(-30),
    dataFine: traOre(-26),
    annullato: false,
    motivoAnnullamento: null,
    lat: 41.9145,
    lng: 12.4526,
    proprietarioId: 'u-0003-elena',
    foto: foto('07', 'Komorebi Sunset', 40, 1),
    artistiIds: ['a-04'],
    poi: [],
    partecipanti: [iscritto('07', ID_UTENTE_CORRENTE, 100)],
  },
  {
    id: 'e-08',
    titolo: 'Deep Drone Experience',
    descrizione: 'Droni profondi e architetture acustiche.',
    dataEvento: traOre(100),
    dataFine: traOre(104),
    annullato: true,
    motivoAnnullamento: 'Maltempo previsto: evento rimandato a data da destinarsi.',
    lat: 41.8819,
    lng: 12.5198,
    proprietarioId: 'u-0002-matteo',
    foto: foto('08', 'Deep Drone', 200, 1),
    artistiIds: ['a-04'],
    poi: [],
    partecipanti: [iscritto('08', ID_UTENTE_CORRENTE, 12)],
  },
]

export const trovaEvento = (id: Uuid) => eventi.find((e) => e.id === id)

// ---------------------------------------------------------------- Conversioni in DTO

export function inMappa(e: EventoFinto, distanzaKm: number | null = null): EventoMappaResponse {
  return {
    id: e.id,
    titolo: e.titolo,
    dataEvento: e.dataEvento,
    dataFine: e.dataFine,
    stato: statoDa(e),
    lat: e.lat,
    lng: e.lng,
    copertinaUrl: e.foto.find((f) => f.copertina)?.url ?? null,
    distanzaKm,
  }
}

/** Foto con la copertina per prima, come ListaFoto */
export const fotoOrdinate = (e: EventoFinto) => [...e.foto].sort((a, b) => Number(b.copertina) - Number(a.copertina))

export function inDettaglio(e: EventoFinto): EventoDettaglioResponse {
  return {
    id: e.id,
    titolo: e.titolo,
    descrizione: e.descrizione,
    dataEvento: e.dataEvento,
    dataFine: e.dataFine,
    stato: statoDa(e),
    motivoAnnullamento: e.annullato ? e.motivoAnnullamento : null,
    lat: e.lat,
    lng: e.lng,
    proprietario: trovaUtente(e.proprietarioId),
    foto: fotoOrdinate(e),
    artisti: e.artistiIds
      .map((id) => artisti.find((a) => a.id === id)!)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    poi: e.poi,
    numeroPartecipanti: e.partecipanti.length,
    sonoProprietario: e.proprietarioId === ID_UTENTE_CORRENTE,
    sonoIscritto: e.partecipanti.some((p) => p.utenteId === ID_UTENTE_CORRENTE),
  }
}

export function inTicket(e: EventoFinto, p: Partecipazione): TicketResponse {
  const u = trovaUtente(p.utenteId)
  return {
    id: p.ticketId,
    codice: p.codice,
    emessoIl: p.emessoIl,
    evento: {
      id: e.id,
      titolo: e.titolo,
      dataEvento: e.dataEvento,
      dataFine: e.dataFine,
      stato: statoDa(e),
      lat: e.lat,
      lng: e.lng,
    },
    partecipante: { nome: u.nome, cognome: u.cognome },
  }
}
