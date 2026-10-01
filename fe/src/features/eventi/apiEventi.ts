// Funzioni di chiamata alle API del lato eventi (FE1-03, passo 5): endpoint RTK Query aggiunti
// all'unica API dell'app (store/apiSlice.ts, Decisione 1). Token, 401 e stato del login li gestisce
// la baseQuery di quell'API (FE2-02): qui non serve fare nulla, valgono anche per questi endpoint.
// Riferimento: progettazione v4, sezioni 2 (miei eventi e ticket), 3-7 e 10 (notifica manuale).
import { apiSlice } from '@/store/apiSlice'
import { LIMITI_EVENTI } from '@/types/api'
import type {
  AnnullaEventoRequest,
  ArtistaResponse,
  EventoDettaglioResponse,
  EventoMappaResponse,
  EventoRequest,
  FotoResponse,
  MiglioraDescrizioneRequest,
  MiglioraDescrizioneResponse,
  ModificaEventoRequest,
  ModificaFotoRequest,
  ModificaPoiRequest,
  NotificaManualeRequest,
  NotificaManualeResponse,
  ParametriListaArtisti,
  ParametriListaEventi,
  PartecipanteResponse,
  PoiRequest,
  PoiResponse,
  TicketResponse,
  Uuid,
} from '@/types/api'

// Etichette della cache: dopo una modifica RTK Query ricarica da solo le liste e i dettagli
// che la contengono (es. dopo l'iscrizione: dettaglio dell'evento e i miei ticket).
const LISTA = 'LISTA'
const MIEI = 'MIEI'

/** Posizione arrotondata a 2 decimali (~1 km), come chiede la progettazione (sezione 3) */
const arrotonda = (n: number) => Number(n.toFixed(LIMITI_EVENTI.decimaliPosizione))

const apiConEtichette = apiSlice.enhanceEndpoints({
  addTagTypes: ['Evento', 'Ticket', 'Partecipanti', 'Foto', 'Poi', 'Artista'],
})

export const apiEventi = apiConEtichette.injectEndpoints({
  endpoints: (build) => ({
    // ---------------------------------------------------------------- Eventi (sezione 3)

    /** ListaEventiMappa: solo programmati e in corso; la posizione cambia l'ordine, non il numero */
    listaEventi: build.query<EventoMappaResponse[], ParametriListaEventi | void>({
      query: (posizione) => ({
        url: '/api/events',
        params:
          posizione && 'lat' in posizione
            ? { lat: arrotonda(posizione.lat), lng: arrotonda(posizione.lng) }
            : undefined,
      }),
      providesTags: [{ type: 'Evento', id: LISTA }],
    }),

    vediEvento: build.query<EventoDettaglioResponse, Uuid>({
      query: (id) => `/api/events/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Evento', id }],
    }),

    creaEvento: build.mutation<EventoDettaglioResponse, EventoRequest>({
      query: (dati) => ({ url: '/api/events', method: 'POST', body: dati }),
      invalidatesTags: [
        { type: 'Evento', id: LISTA },
        { type: 'Evento', id: MIEI },
      ],
    }),

    modificaEvento: build.mutation<EventoDettaglioResponse, { id: Uuid; dati: ModificaEventoRequest }>({
      query: ({ id, dati }) => ({ url: `/api/events/${id}`, method: 'PATCH', body: dati }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Evento', id },
        { type: 'Evento', id: LISTA },
        { type: 'Evento', id: MIEI },
        { type: 'Ticket', id: MIEI },
      ],
    }),

    /** AnnullaEvento: irreversibile, il motivo (facoltativo) arriva ai partecipanti */
    annullaEvento: build.mutation<void, { id: Uuid; dati?: AnnullaEventoRequest }>({
      query: ({ id, dati }) => ({ url: `/api/events/${id}/cancel`, method: 'POST', body: dati ?? {} }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Evento', id },
        { type: 'Evento', id: LISTA },
        { type: 'Evento', id: MIEI },
        { type: 'Ticket', id: MIEI },
      ],
    }),

    /** MiglioraDescrizioneAI: propone soltanto, si salva poi con modificaEvento */
    miglioraDescrizione: build.mutation<MiglioraDescrizioneResponse, { id: Uuid; dati: MiglioraDescrizioneRequest }>({
      query: ({ id, dati }) => ({ url: `/api/events/${id}/description/ai`, method: 'POST', body: dati }),
    }),

    /** InviaNotificaManuale (sezione 10): restituisce quanti partecipanti l'hanno ricevuta */
    inviaNotificaManuale: build.mutation<NotificaManualeResponse, { id: Uuid; dati: NotificaManualeRequest }>({
      query: ({ id, dati }) => ({ url: `/api/events/${id}/notifications`, method: 'POST', body: dati }),
    }),

    /** MieiEventi (sezione 2): quelli che ho creato, anche conclusi e annullati */
    mieiEventi: build.query<EventoMappaResponse[], void>({
      query: () => '/api/users/me/events',
      providesTags: [{ type: 'Evento', id: MIEI }],
    }),

    // ---------------------------------------------------------------- Foto (sezione 4)

    listaFoto: build.query<FotoResponse[], Uuid>({
      query: (id) => `/api/events/${id}/photos`,
      providesTags: (_r, _e, id) => [{ type: 'Foto', id }],
    }),

    /** CreaFoto: multipart/form-data con "file" e "didascalia" */
    creaFoto: build.mutation<FotoResponse, { id: Uuid; file: File; didascalia?: string }>({
      query: ({ id, file, didascalia }) => {
        const dati = new FormData()
        dati.append('file', file)
        if (didascalia) dati.append('didascalia', didascalia)
        return { url: `/api/events/${id}/photos`, method: 'POST', body: dati }
      },
      // La prima foto diventa la copertina: cambia anche la card nella lista
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Foto', id },
        { type: 'Evento', id },
        { type: 'Evento', id: LISTA },
        { type: 'Evento', id: MIEI },
      ],
    }),

    modificaFoto: build.mutation<FotoResponse, { id: Uuid; fotoId: Uuid; dati: ModificaFotoRequest }>({
      query: ({ id, fotoId, dati }) => ({ url: `/api/events/${id}/photos/${fotoId}`, method: 'PATCH', body: dati }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Foto', id },
        { type: 'Evento', id },
        { type: 'Evento', id: LISTA },
        { type: 'Evento', id: MIEI },
      ],
    }),

    cancellaFoto: build.mutation<void, { id: Uuid; fotoId: Uuid }>({
      query: ({ id, fotoId }) => ({ url: `/api/events/${id}/photos/${fotoId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Foto', id },
        { type: 'Evento', id },
        { type: 'Evento', id: LISTA },
        { type: 'Evento', id: MIEI },
      ],
    }),

    // ---------------------------------------------------------------- POI (sezione 5)

    listaPoi: build.query<PoiResponse[], Uuid>({
      query: (id) => `/api/events/${id}/pois`,
      providesTags: (_r, _e, id) => [{ type: 'Poi', id }],
    }),

    creaPoi: build.mutation<PoiResponse, { id: Uuid; dati: PoiRequest }>({
      query: ({ id, dati }) => ({ url: `/api/events/${id}/pois`, method: 'POST', body: dati }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Poi', id },
        { type: 'Evento', id },
      ],
    }),

    modificaPoi: build.mutation<PoiResponse, { id: Uuid; poiId: Uuid; dati: ModificaPoiRequest }>({
      query: ({ id, poiId, dati }) => ({ url: `/api/events/${id}/pois/${poiId}`, method: 'PATCH', body: dati }),
      // Aggiornamento ottimistico (FE1-10): il POI cambia subito nel dettaglio dell'evento, cosi'
      // un marker trascinato non torna indietro mentre la richiesta e' in corso; se il backend
      // rifiuta (es. POI_TROPPO_LONTANO) si annulla e il marker torna al suo posto.
      async onQueryStarted({ id, poiId, dati }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          apiEventi.util.updateQueryData('vediEvento', id, (bozza) => {
            const poi = bozza.poi.find((p) => p.id === poiId)
            if (!poi) return
            if (dati.tipo != null) poi.tipo = dati.tipo
            if (dati.lat != null) poi.lat = dati.lat
            if (dati.lng != null) poi.lng = dati.lng
            if (dati.etichetta != null) poi.etichetta = dati.etichetta.trim() || null
          }),
        )
        queryFulfilled.catch(patch.undo)
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Poi', id },
        { type: 'Evento', id },
      ],
    }),

    cancellaPoi: build.mutation<void, { id: Uuid; poiId: Uuid }>({
      query: ({ id, poiId }) => ({ url: `/api/events/${id}/pois/${poiId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Poi', id },
        { type: 'Evento', id },
      ],
    }),

    // ---------------------------------------------------------------- Artisti (sezione 6)

    /** ListaArtisti: solo attivi, in ordine alfabetico */
    listaArtisti: build.query<ArtistaResponse[], ParametriListaArtisti | void>({
      query: (parametri) => ({ url: '/api/artists', params: parametri?.search ? { search: parametri.search } : undefined }),
      providesTags: [{ type: 'Artista', id: LISTA }],
    }),

    vediArtista: build.query<ArtistaResponse, Uuid>({
      query: (artistaId) => `/api/artists/${artistaId}`,
      providesTags: (_r, _e, artistaId) => [{ type: 'Artista', id: artistaId }],
    }),

    aggiungiArtistaEvento: build.mutation<ArtistaResponse, { id: Uuid; artistaId: Uuid }>({
      query: ({ id, artistaId }) => ({ url: `/api/events/${id}/artists/${artistaId}`, method: 'POST' }),
      // Dopo un errore (artista disattivato o eliminato nel frattempo) si ricarica anche il catalogo
      invalidatesTags: (_r, errore, { id }) => [{ type: 'Evento', id }, ...(errore ? [{ type: 'Artista' as const, id: LISTA }] : [])],
    }),

    rimuoviArtistaEvento: build.mutation<void, { id: Uuid; artistaId: Uuid }>({
      query: ({ id, artistaId }) => ({ url: `/api/events/${id}/artists/${artistaId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Evento', id }],
    }),

    // ---------------------------------------------------------------- Partecipanti (sezione 7)

    /** IscrizioneEvento: niente body, l'utente e' quello del token */
    iscriviti: build.mutation<TicketResponse, Uuid>({
      query: (id) => ({ url: `/api/events/${id}/participants`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Evento', id },
        { type: 'Ticket', id },
        { type: 'Ticket', id: MIEI },
        { type: 'Partecipanti', id },
      ],
    }),

    /** VediMiaPartecipazione: 404 NON_TROVATO se non sono iscritto */
    miaPartecipazione: build.query<TicketResponse, Uuid>({
      query: (id) => `/api/events/${id}/participants/me`,
      providesTags: (_r, _e, id) => [{ type: 'Ticket', id }],
    }),

    /** ListaPartecipanti: solo con un ticket o da proprietario (403 NESSUN_TICKET) */
    listaPartecipanti: build.query<PartecipanteResponse[], Uuid>({
      query: (id) => `/api/events/${id}/participants`,
      providesTags: (_r, _e, id) => [{ type: 'Partecipanti', id }],
    }),

    /** CancellaPartecipazione: solo se l'evento e' ancora PROGRAMMATO */
    cancellaIscrizione: build.mutation<void, Uuid>({
      query: (id) => ({ url: `/api/events/${id}/participants/me`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Evento', id },
        { type: 'Ticket', id },
        { type: 'Ticket', id: MIEI },
        { type: 'Partecipanti', id },
      ],
    }),

    /** MieiTicket (sezione 2): prima programmati e in corso, poi conclusi e annullati */
    mieiTicket: build.query<TicketResponse[], void>({
      query: () => '/api/users/me/tickets',
      providesTags: [{ type: 'Ticket', id: MIEI }],
    }),
  }),
})

export const {
  useListaEventiQuery,
  useVediEventoQuery,
  useCreaEventoMutation,
  useModificaEventoMutation,
  useAnnullaEventoMutation,
  useMiglioraDescrizioneMutation,
  useInviaNotificaManualeMutation,
  useMieiEventiQuery,
  useListaFotoQuery,
  useCreaFotoMutation,
  useModificaFotoMutation,
  useCancellaFotoMutation,
  useListaPoiQuery,
  useCreaPoiMutation,
  useModificaPoiMutation,
  useCancellaPoiMutation,
  useListaArtistiQuery,
  useVediArtistaQuery,
  useAggiungiArtistaEventoMutation,
  useRimuoviArtistaEventoMutation,
  useIscrivitiMutation,
  useMiaPartecipazioneQuery,
  useListaPartecipantiQuery,
  useCancellaIscrizioneMutation,
  useMieiTicketQuery,
} = apiEventi
