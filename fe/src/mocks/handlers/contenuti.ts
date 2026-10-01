// Endpoint finti di foto, POI e artisti dell'evento (progettazione v4, sezioni 4, 5 e 6).
import { delay, http, HttpResponse } from 'msw'
import { LIMITI_EVENTI, type PoiResponse, type TipoPoi } from '@/types/api'
import { artisti, cancellaImmagine, fotoOrdinate, nuovoId, salvaImmagine } from '../dati'
import { distanzaKm, errore, latValida, leggiJson, lngValida, nessunContenuto } from '../utili'
import { api, evento, eventoDelProprietario, RITARDO } from './comuni'

const TIPI_POI: TipoPoi[] = ['INGRESSO', 'USCITA', 'EMERGENZA']

export const handlerContenuti = [
  // ---------------------------------------------------------------- Foto

  http.get(api('/events/:id/photos'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = evento(params.id)
    return risposta ?? HttpResponse.json(fotoOrdinate(e))
  }),

  // CreaFoto: multipart/form-data con "file" e "didascalia"
  http.post(api('/events/:id/photos'), async ({ params, request }) => {
    await delay(RITARDO * 2)
    const dati = await request.formData().catch(() => null)
    const file = dati?.get('file')
    const didascalia = dati?.get('didascalia')
    if (!(file instanceof File) || file.size > LIMITI_EVENTI.byteFoto || !(LIMITI_EVENTI.tipiFoto as readonly string[]).includes(file.type))
      return errore('FILE_NON_VALIDO')
    if (typeof didascalia === 'string' && didascalia.length > LIMITI_EVENTI.didascalia)
      return errore('VALIDAZIONE', { didascalia: 'Massimo 150 caratteri' })
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    if (e.foto.length >= LIMITI_EVENTI.fotoPerEvento) return errore('LIMITE_FOTO')

    const id = nuovoId('f')
    const foto = {
      id,
      // Come il backend: percorso relativo del GET pubblico, servito da handlers/immagini.ts
      url: salvaImmagine(`/api/events/${e.id}/photos/${id}/image`, file, file.type),
      didascalia: typeof didascalia === 'string' && didascalia.trim() ? didascalia.trim() : null,
      copertina: !e.foto.some((f) => f.copertina),
    }
    e.foto.push(foto)
    return HttpResponse.json(foto, { status: 201 })
  }),

  // ModificaFoto: didascalia ("" = rimuovi) e/o copertina: true
  http.patch(api('/events/:id/photos/:fotoId'), async ({ params, request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    if (b.didascalia != null && (typeof b.didascalia !== 'string' || b.didascalia.length > LIMITI_EVENTI.didascalia))
      return errore('VALIDAZIONE', { didascalia: 'Massimo 150 caratteri' })
    if (b.didascalia == null && b.copertina == null) return errore('RICHIESTA_VUOTA')
    if (b.copertina === false) return errore('COPERTINA_NON_VALIDA')
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    const foto = e.foto.find((f) => f.id === params.fotoId)
    if (!foto) return errore('NON_TROVATO')
    if (b.didascalia != null) foto.didascalia = (b.didascalia as string).trim() || null
    if (b.copertina === true) e.foto.forEach((f) => (f.copertina = f === foto))
    return HttpResponse.json(foto)
  }),

  // CancellaFoto: se era la copertina, passa alla foto piu' vecchia rimasta
  http.delete(api('/events/:id/photos/:fotoId'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    const indice = e.foto.findIndex((f) => f.id === params.fotoId)
    if (indice < 0) return errore('NON_TROVATO')
    const [tolta] = e.foto.splice(indice, 1)
    cancellaImmagine(tolta.url)
    if (tolta.copertina && e.foto.length) e.foto[0].copertina = true
    return nessunContenuto()
  }),

  // ---------------------------------------------------------------- POI

  http.get(api('/events/:id/pois'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = evento(params.id)
    return risposta ?? HttpResponse.json(e.poi)
  }),

  http.post(api('/events/:id/pois'), async ({ params, request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    const campi: Record<string, string> = {}
    if (!TIPI_POI.includes(b.tipo as TipoPoi)) campi.tipo = 'INGRESSO, USCITA o EMERGENZA'
    if (!latValida(b.lat)) campi.lat = 'Latitudine non valida'
    if (!lngValida(b.lng)) campi.lng = 'Longitudine non valida'
    if (b.etichetta != null && (typeof b.etichetta !== 'string' || b.etichetta.length > LIMITI_EVENTI.etichettaPoi))
      campi.etichetta = 'Massimo 50 caratteri'
    if (Object.keys(campi).length) return errore('VALIDAZIONE', campi)
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    if (e.poi.length >= LIMITI_EVENTI.poiPerEvento) return errore('LIMITE_POI')
    const punto = { lat: b.lat as number, lng: b.lng as number }
    if (distanzaKm(e, punto) > LIMITI_EVENTI.raggioPoiKm) return errore('POI_TROPPO_LONTANO')

    const poi: PoiResponse = {
      id: nuovoId('p'),
      tipo: b.tipo as TipoPoi,
      ...punto,
      etichetta: typeof b.etichetta === 'string' && b.etichetta.trim() ? b.etichetta.trim() : null,
    }
    e.poi.push(poi)
    return HttpResponse.json(poi, { status: 201 })
  }),

  http.patch(api('/events/:id/pois/:poiId'), async ({ params, request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    const campi: Record<string, string> = {}
    if (b.tipo != null && !TIPI_POI.includes(b.tipo as TipoPoi)) campi.tipo = 'INGRESSO, USCITA o EMERGENZA'
    if (b.lat != null && !latValida(b.lat)) campi.lat = 'Latitudine non valida'
    if (b.lng != null && !lngValida(b.lng)) campi.lng = 'Longitudine non valida'
    if (b.etichetta != null && (typeof b.etichetta !== 'string' || b.etichetta.length > LIMITI_EVENTI.etichettaPoi))
      campi.etichetta = 'Massimo 50 caratteri'
    if (Object.keys(campi).length) return errore('VALIDAZIONE', campi)
    if (['tipo', 'lat', 'lng', 'etichetta'].every((k) => b[k] == null)) return errore('RICHIESTA_VUOTA')
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    const poi = e.poi.find((p) => p.id === params.poiId)
    if (!poi) return errore('NON_TROVATO')
    const punto = { lat: (b.lat as number) ?? poi.lat, lng: (b.lng as number) ?? poi.lng }
    if (distanzaKm(e, punto) > LIMITI_EVENTI.raggioPoiKm) return errore('POI_TROPPO_LONTANO')

    if (b.tipo != null) poi.tipo = b.tipo as TipoPoi
    poi.lat = punto.lat
    poi.lng = punto.lng
    if (b.etichetta != null) poi.etichetta = (b.etichetta as string).trim() || null
    return HttpResponse.json(poi)
  }),

  http.delete(api('/events/:id/pois/:poiId'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    const indice = e.poi.findIndex((p) => p.id === params.poiId)
    if (indice < 0) return errore('NON_TROVATO')
    e.poi.splice(indice, 1)
    return nessunContenuto()
  }),

  // ---------------------------------------------------------------- Artisti

  // ListaArtisti: solo attivi, in ordine alfabetico, ?search= senza distinzione di maiuscole
  http.get(api('/artists'), async ({ request }) => {
    await delay(RITARDO)
    const cerca = (new URL(request.url).searchParams.get('search') ?? '').trim().toLowerCase()
    const lista = artisti
      .filter((a) => a.attivo && a.nome.toLowerCase().includes(cerca))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
    return HttpResponse.json(lista)
  }),

  // VediArtista: anche se disattivato
  http.get(api('/artists/:artistaId'), async ({ params }) => {
    await delay(RITARDO)
    const artista = artisti.find((a) => a.id === params.artistaId)
    return artista ? HttpResponse.json(artista) : errore('NON_TROVATO')
  }),

  http.post(api('/events/:id/artists/:artistaId'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    const artista = artisti.find((a) => a.id === params.artistaId)
    if (!artista) return errore('NON_TROVATO')
    if (!artista.attivo) return errore('ARTISTA_NON_ATTIVO')
    if (e.artistiIds.includes(artista.id)) return errore('ARTISTA_GIA_ASSOCIATO')
    e.artistiIds.push(artista.id)
    return HttpResponse.json(artista, { status: 201 })
  }),

  http.delete(api('/events/:id/artists/:artistaId'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = eventoDelProprietario(params.id)
    if (risposta) return risposta
    const indice = e.artistiIds.indexOf(params.artistaId as string)
    if (indice < 0) return errore('NON_TROVATO')
    e.artistiIds.splice(indice, 1)
    return nessunContenuto()
  }),
]
