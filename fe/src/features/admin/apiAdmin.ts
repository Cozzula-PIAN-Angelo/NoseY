// Chiamate alle API del pannello admin (FE1-15 e FE1-16, progettazione v4, sezioni 12 e 13): endpoint RTK Query
// aggiunti all'unica API dell'app (store/apiSlice.ts). Il ruolo lo controlla il backend
// (/api/admin/** → ADMIN, /api/superadmin/** → SUPERADMIN); le pagine sono gia' protette da SoloRuolo.
import { DIMENSIONE_PAGINA } from '@/lib/pagine'
import { apiSlice } from '@/store/apiSlice'
import type {
  AdminUtenteResponse,
  AnnullaEventoModerazioneRequest,
  ArtistaRequest,
  ArtistaResponse,
  CambiaRuoloRequest,
  CambiaStatoUtenteRequest,
  PaginaResponse,
  ModificaArtistaRequest,
  ParametriListaUtenti,
  Uuid,
} from '@/types/api'

// 'Artista' ed 'Evento' sono di apiEventi: nome e immagine di un artista compaiono anche li'
const apiConEtichette = apiSlice.enhanceEndpoints({ addTagTypes: ['AdminUtente', 'ArtistaAdmin', 'Artista', 'Evento', 'Foto', 'Ticket'] })

/** Catalogo pubblico degli artisti (ListaArtisti), da ricaricare dopo ogni modifica dell'admin */
const CATALOGO = { type: 'Artista' as const, id: 'LISTA' }

/** Corpo multipart dell'artista (BE1-19): solo i campi presenti, come CreaFoto */
function datiArtista(artista: ArtistaRequest | ModificaArtistaRequest) {
  const dati = new FormData()
  if (artista.nome !== undefined) dati.append('nome', artista.nome)
  if ('attivo' in artista && artista.attivo !== undefined) dati.append('attivo', String(artista.attivo))
  if ('rimuoviImmagine' in artista && artista.rimuoviImmagine) dati.append('rimuoviImmagine', 'true')
  if (artista.file) dati.append('file', artista.file)
  return dati
}

export const apiAdmin = apiConEtichette.injectEndpoints({
  endpoints: (build) => ({
    /** ListaUtenti: ricerca su email, nome e cognome, filtro per stato, dal piu' recente */
    listaUtenti: build.query<PaginaResponse<AdminUtenteResponse>, ParametriListaUtenti>({
      query: ({ search, status, page = 0, size = DIMENSIONE_PAGINA }) => ({
        url: '/api/admin/users',
        params: { ...(search ? { search } : {}), ...(status ? { status } : {}), page, size },
      }),
      providesTags: ['AdminUtente'],
    }),

    /** CambiaStatoUtente: sospende (chiude anche le sessioni aperte) o riattiva un account */
    cambiaStatoUtente: build.mutation<AdminUtenteResponse, { utenteId: Uuid; dati: CambiaStatoUtenteRequest }>({
      query: ({ utenteId, dati }) => ({ url: `/api/admin/users/${utenteId}/status`, method: 'PATCH', body: dati }),
      invalidatesTags: ['AdminUtente'],
    }),

    /** CambiaRuolo (solo SUPERADMIN): USER o ADMIN; l'utente deve accedere di nuovo (il ruolo e' nel token) */
    cambiaRuolo: build.mutation<AdminUtenteResponse, { utenteId: Uuid; dati: CambiaRuoloRequest }>({
      query: ({ utenteId, dati }) => ({ url: `/api/superadmin/users/${utenteId}/role`, method: 'PATCH', body: dati }),
      invalidatesTags: ['AdminUtente'],
    }),

    // ---------------------------------------------------------------- Artisti (FE1-16)

    /**
     * Catalogo per l'admin: tutti gli artisti, anche disattivati, in ordine alfabetico.
     * PROPOSTA per il backend (non c'e' ancora): GET /api/admin/artists?search=. ListaArtisti
     * (pubblica) da' solo gli attivi, e un artista disattivato non si potrebbe piu' riattivare.
     */
    listaArtistiAdmin: build.query<ArtistaResponse[], string>({
      query: (search) => ({ url: '/api/admin/artists', params: search ? { search } : undefined }),
      providesTags: ['ArtistaAdmin'],
    }),

    /** CreaArtista: "nome" obbligatorio, "file" facoltativo (JPEG/PNG/WEBP, max 5 MB) */
    creaArtista: build.mutation<ArtistaResponse, ArtistaRequest>({
      query: (artista) => ({ url: '/api/admin/artists', method: 'POST', body: datiArtista(artista) }),
      invalidatesTags: ['ArtistaAdmin', CATALOGO],
    }),

    /** ModificaArtista: nome, attivo, nuova immagine o rimuoviImmagine; senza campi → RICHIESTA_VUOTA */
    modificaArtista: build.mutation<ArtistaResponse, { artistaId: Uuid; dati: ModificaArtistaRequest }>({
      query: ({ artistaId, dati }) => ({ url: `/api/admin/artists/${artistaId}`, method: 'PATCH', body: datiArtista(dati) }),
      // Nome e immagine compaiono anche nelle pagine degli eventi
      invalidatesTags: (_r, _e, { artistaId }) => ['ArtistaAdmin', CATALOGO, { type: 'Artista', id: artistaId }, 'Evento'],
    }),

    /** EliminaArtista: 409 ARTISTA_IN_USO se e' in almeno un evento (va disattivato) */
    eliminaArtista: build.mutation<void, Uuid>({
      query: (artistaId) => ({ url: `/api/admin/artists/${artistaId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, artistaId) => ['ArtistaAdmin', CATALOGO, { type: 'Artista', id: artistaId }],
    }),

    // ---------------------------------------------------------------- Moderazione degli eventi (FE1-16)

    /** RimuoviFotoModerazione: anche su eventi conclusi o annullati; avvisa chi organizza */
    rimuoviFotoModerazione: build.mutation<void, { id: Uuid; fotoId: Uuid }>({
      query: ({ id, fotoId }) => ({ url: `/api/admin/events/${id}/photos/${fotoId}`, method: 'DELETE' }),
      // Se era la copertina, cambia anche nelle liste e sulla mappa
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Evento', id }, { type: 'Foto', id }, { type: 'Evento', id: 'LISTA' }],
    }),

    /** AnnullaEventoModerazione: motivo obbligatorio; avvisa chi organizza e chi partecipa */
    annullaEventoModerazione: build.mutation<void, { id: Uuid; dati: AnnullaEventoModerazioneRequest }>({
      query: ({ id, dati }) => ({ url: `/api/admin/events/${id}/cancel`, method: 'POST', body: dati }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Evento', id },
        { type: 'Evento', id: 'LISTA' },
        { type: 'Evento', id: 'MIEI' },
        { type: 'Ticket', id: 'MIEI' },
      ],
    }),
  }),
})

export const {
  useListaUtentiQuery,
  useCambiaStatoUtenteMutation,
  useCambiaRuoloMutation,
  useListaArtistiAdminQuery,
  useCreaArtistaMutation,
  useModificaArtistaMutation,
  useEliminaArtistaMutation,
  useRimuoviFotoModerazioneMutation,
  useAnnullaEventoModerazioneMutation,
} = apiAdmin
