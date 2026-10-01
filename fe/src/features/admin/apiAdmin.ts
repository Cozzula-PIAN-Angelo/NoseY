// Chiamate alle API del pannello admin (FE1-15, progettazione v4, sezioni 12 e 13): endpoint RTK Query
// aggiunti all'unica API dell'app (store/apiSlice.ts). Il ruolo lo controlla il backend
// (/api/admin/** → ADMIN, /api/superadmin/** → SUPERADMIN); le pagine sono gia' protette da SoloRuolo.
import { DIMENSIONE_PAGINA } from '@/lib/pagine'
import { apiSlice } from '@/store/apiSlice'
import type { AdminUtenteResponse, CambiaStatoUtenteRequest, PaginaResponse, ParametriListaUtenti, Uuid } from '@/types/api'

const apiConEtichette = apiSlice.enhanceEndpoints({ addTagTypes: ['AdminUtente'] })

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
  }),
})

export const { useListaUtentiQuery, useCambiaStatoUtenteMutation } = apiAdmin
