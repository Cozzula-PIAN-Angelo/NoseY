// Endpoint finti degli eventi (progettazione v4, sezione 3, piu' MieiEventi e la notifica manuale).
import { delay, http, HttpResponse } from 'msw'
import { LIMITI_EVENTI, type EventoMappaResponse } from '@/types/api'
import { eventi, ID_UTENTE_CORRENTE, inDettaglio, inMappa, nuovoId, type EventoFinto } from '../dati'
import {
  distanzaKm,
  errore,
  latValida,
  leggiJson,
  lngValida,
  nessunContenuto,
  nonVuoto,
  statoDa,
} from '../utili'
import { api, evento, eventoDelProprietario, RITARDO } from './comuni'

const nelFuturo = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v)) && Date.parse(v) > Date.now()
const dataValida = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v))

/** Ora degli invii della notifica manuale, per evento (limite di 5 nelle ultime 24 ore) */
const notificheInviate = new Map<string, number[]>()
const GIORNO_MS = 24 * 3_600_000

export const handlerEventi = [
  // ListaEventiMappa: solo PROGRAMMATO e IN_CORSO; la posizione cambia l'ordine, mai il numero
  http.get(api('/events'), async ({ request }) => {
    await delay(RITARDO)
    const query = new URL(request.url).searchParams
    const lat = query.get('lat')
    const lng = query.get('lng')
    if ((lat === null) !== (lng === null)) return errore('VALIDAZIONE', { lat: 'lat e lng vanno passati insieme' })

    const visibili = eventi.filter((e) => ['PROGRAMMATO', 'IN_CORSO'].includes(statoDa(e)))
    let lista: EventoMappaResponse[]
    if (lat !== null && lng !== null) {
      const posizione = { lat: Number(lat), lng: Number(lng) }
      if (!latValida(posizione.lat) || !lngValida(posizione.lng)) return errore('VALIDAZIONE', { lat: 'Posizione non valida' })
      lista = visibili
        .map((e) => inMappa(e, Math.round(distanzaKm(posizione, e) * 100) / 100))
        .sort((a, b) => a.distanzaKm! - b.distanzaKm!)
    } else {
      lista = visibili.map((e) => inMappa(e)).sort((a, b) => Date.parse(a.dataEvento) - Date.parse(b.dataEvento))
    }
    return HttpResponse.json(lista)
  }),

  // MieiEventi: tutti i miei, compresi conclusi e annullati, per data decrescente
  http.get(api('/users/me/events'), async () => {
    await delay(RITARDO)
    const miei = eventi
      .filter((e) => e.proprietarioId === ID_UTENTE_CORRENTE)
      .sort((a, b) => Date.parse(b.dataEvento) - Date.parse(a.dataEvento))
    return HttpResponse.json(miei.map((e) => inMappa(e)))
  }),

  // VediEvento: pubblico, anche annullato
  http.get(api('/events/:id'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = evento(params.id)
    return risposta ?? HttpResponse.json(inDettaglio(e))
  }),

  // CreaEvento
  http.post(api('/events'), async ({ request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    const campi: Record<string, string> = {}
    if (!nonVuoto(b.titolo) || b.titolo.length > LIMITI_EVENTI.titolo) campi.titolo = 'Obbligatorio, massimo 150 caratteri'
    if (b.descrizione != null && (typeof b.descrizione !== 'string' || b.descrizione.length > LIMITI_EVENTI.descrizione))
      campi.descrizione = 'Massimo 5000 caratteri'
    if (!nelFuturo(b.dataEvento)) campi.dataEvento = 'Deve essere una data futura'
    if (!nelFuturo(b.dataFine)) campi.dataFine = 'Deve essere una data futura'
    if (!latValida(b.lat)) campi.lat = 'Latitudine non valida'
    if (!lngValida(b.lng)) campi.lng = 'Longitudine non valida'
    if (Object.keys(campi).length) return errore('VALIDAZIONE', campi)
    if (Date.parse(b.dataFine as string) <= Date.parse(b.dataEvento as string)) return errore('DATE_NON_VALIDE')

    const nuovo: EventoFinto = {
      id: nuovoId('e'),
      titolo: (b.titolo as string).trim(),
      descrizione: nonVuoto(b.descrizione) ? b.descrizione.trim() : null,
      dataEvento: b.dataEvento as string,
      dataFine: b.dataFine as string,
      annullato: false,
      motivoAnnullamento: null,
      lat: b.lat as number,
      lng: b.lng as number,
      proprietarioId: ID_UTENTE_CORRENTE,
      foto: [],
      artistiIds: [],
      poi: [],
      partecipanti: [],
    }
    eventi.push(nuovo)
    return HttpResponse.json(inDettaglio(nuovo), { status: 201 })
  }),

  // ModificaEvento: tutti i campi facoltativi, "" su descrizione = rimuovi
  http.patch(api('/events/:id'), async ({ params, request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    const presenti = ['titolo', 'descrizione', 'dataEvento', 'dataFine', 'lat', 'lng'].filter((k) => b[k] != null)
    const campi: Record<string, string> = {}
    if (b.titolo != null && (!nonVuoto(b.titolo) || b.titolo.length > LIMITI_EVENTI.titolo)) campi.titolo = 'Massimo 150 caratteri, non vuoto'
    if (b.descrizione != null && (typeof b.descrizione !== 'string' || b.descrizione.length > LIMITI_EVENTI.descrizione))
      campi.descrizione = 'Massimo 5000 caratteri'
    if (b.dataEvento != null && !dataValida(b.dataEvento)) campi.dataEvento = 'Data non valida'
    if (b.dataFine != null && !dataValida(b.dataFine)) campi.dataFine = 'Data non valida'
    if (b.lat != null && !latValida(b.lat)) campi.lat = 'Latitudine non valida'
    if (b.lng != null && !lngValida(b.lng)) campi.lng = 'Longitudine non valida'
    if (Object.keys(campi).length) return errore('VALIDAZIONE', campi)
    if (presenti.length === 0) return errore('RICHIESTA_VUOTA')

    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    const cambiaInizio = b.dataEvento != null && b.dataEvento !== e.dataEvento
    const cambiaFine = b.dataFine != null && b.dataFine !== e.dataFine
    if (cambiaInizio && statoDa(e) === 'IN_CORSO') return errore('EVENTO_GIA_INIZIATO')
    if ((cambiaInizio && !nelFuturo(b.dataEvento)) || (cambiaFine && !nelFuturo(b.dataFine))) return errore('DATA_NON_FUTURA')
    const inizio = (b.dataEvento as string) ?? e.dataEvento
    const fine = (b.dataFine as string) ?? e.dataFine
    if (Date.parse(fine) <= Date.parse(inizio)) return errore('DATE_NON_VALIDE')
    const nuovaPosizione = { lat: (b.lat as number) ?? e.lat, lng: (b.lng as number) ?? e.lng }
    if (e.poi.some((p) => distanzaKm(nuovaPosizione, p) > LIMITI_EVENTI.raggioPoiKm)) return errore('POI_FUORI_RAGGIO')

    if (b.titolo != null) e.titolo = (b.titolo as string).trim()
    if (b.descrizione != null) e.descrizione = nonVuoto(b.descrizione) ? b.descrizione.trim() : null
    e.dataEvento = inizio
    e.dataFine = fine
    e.lat = nuovaPosizione.lat
    e.lng = nuovaPosizione.lng
    return HttpResponse.json(inDettaglio(e))
  }),

  // MiglioraDescrizioneAI: NON salva, propone soltanto
  http.post(api('/events/:id/description/ai'), async ({ params, request }) => {
    const b = await leggiJson(request)
    if (typeof b.fotoId !== 'string') return errore('VALIDAZIONE', { fotoId: 'Obbligatorio' })
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    if (!e.foto.some((f) => f.id === b.fotoId)) return errore('NON_TROVATO')
    const testo = nonVuoto(b.descrizione) ? b.descrizione.trim() : e.descrizione
    if (!testo) return errore('DESCRIZIONE_MANCANTE')
    await delay(1500) // l'AI e' lenta: utile per provare la rotellina
    return HttpResponse.json({
      descrizioneProposta: `${testo}\n\nUn'esperienza da vivere dal vivo: luci, suono e atmosfera pensati per una notte che non si dimentica. (Proposta dei dati finti)`,
    })
  }),

  // AnnullaEvento: motivo facoltativo, irreversibile
  http.post(api('/events/:id/cancel'), async ({ params, request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    if (b.motivo != null && (typeof b.motivo !== 'string' || b.motivo.length > LIMITI_EVENTI.motivoAnnullamento))
      return errore('VALIDAZIONE', { motivo: 'Massimo 500 caratteri' })
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    e.annullato = true
    e.motivoAnnullamento = nonVuoto(b.motivo) ? b.motivo.trim() : null
    return nessunContenuto()
  }),

  // InviaNotificaManuale: al massimo 5 nelle ultime 24 ore per evento, poi 429 TROPPE_RICHIESTE
  http.post(api('/events/:id/notifications'), async ({ params, request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    if (!nonVuoto(b.testo) || b.testo.length > LIMITI_EVENTI.testoNotificaManuale)
      return errore('VALIDAZIONE', { testo: 'Obbligatorio, massimo 500 caratteri' })
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    const adesso = Date.now()
    const recenti = (notificheInviate.get(e.id) ?? []).filter((t) => t > adesso - GIORNO_MS)
    if (recenti.length >= LIMITI_EVENTI.notificheManualiAlGiorno) return errore('TROPPE_RICHIESTE')
    notificheInviate.set(e.id, [...recenti, adesso])
    return HttpResponse.json({ inviate: e.partecipanti.length }, { status: 201 })
  }),
]
