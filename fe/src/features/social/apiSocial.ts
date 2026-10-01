// Chiamate alle API del lato social (progettazione v4, sezioni 8, 9 e 10): endpoint RTK Query
// aggiunti all'unica API dell'app (store/apiSlice.ts), che mette gia' token e gestione del 401.
// L'invio dei messaggi e le notifiche live passano dal WebSocket (FE2-11), non da qui.
import { DIMENSIONE_PAGINA } from '@/lib/pagine'
import { apiSlice } from '@/store/apiSlice'
import {
  LIMITI_SOCIAL,
  type AmiciziaResponse,
  type CategoriaNotifica,
  type ChatResponse,
  type ConteggiNonLette,
  type MessaggiResponse,
  type NotificaResponse,
  type PaginaResponse,
  type RichiediAmiciziaRequest,
  type Uuid,
} from '@/types/api'

// Etichette della cache: dopo una modifica RTK Query ricarica da solo cio' che la contiene.
// 'Partecipanti' e' degli eventi (apiEventi): lo stato d'amicizia compare anche li'.
const AMICI = 'AMICI'
const RICEVUTE = 'RICEVUTE'
const INVIATE = 'INVIATE'
const LISTA = 'LISTA'

const apiConEtichette = apiSlice.enhanceEndpoints({
  addTagTypes: ['Amicizia', 'Chat', 'Messaggi', 'Notifica', 'NonLette', 'Partecipanti'],
})

/** Dopo ogni azione su un'amicizia: liste, chat, notifiche e stato nei partecipanti degli eventi */
const dopoAmicizia = [
  { type: 'Amicizia' as const, id: AMICI },
  { type: 'Amicizia' as const, id: RICEVUTE },
  { type: 'Amicizia' as const, id: INVIATE },
  { type: 'Chat' as const, id: LISTA },
  { type: 'Notifica' as const, id: 'friendships' },
  'NonLette' as const,
  'Partecipanti' as const,
]

/** Notifiche paginate di una categoria (le chat hanno la loro lista, senza pagine) */
export type ParametriListaNotifiche = {
  categoria: Exclude<CategoriaNotifica, 'chats'>
  /** Da 0 */
  page?: number
  size?: number
}

export const apiSocial = apiConEtichette.injectEndpoints({
  endpoints: (build) => ({
    // ---------------------------------------------------------------- Amicizie (sezione 8)

    /** ListaAmici: stato AMICI, con chatId, per nome */
    listaAmici: build.query<AmiciziaResponse[], void>({
      query: () => '/api/friendships',
      providesTags: [{ type: 'Amicizia', id: AMICI }],
    }),

    /** ListaRichiesteRicevute: da accettare o rifiutare, dalla piu' recente */
    richiesteRicevute: build.query<AmiciziaResponse[], void>({
      query: () => '/api/friendships/requests',
      providesTags: [{ type: 'Amicizia', id: RICEVUTE }],
    }),

    /** ListaRichiesteInviate: in attesa (anche quelle rifiutate, che per chi chiede restano inviate) */
    richiesteInviate: build.query<AmiciziaResponse[], void>({
      query: () => '/api/friendships/requests/sent',
      providesTags: [{ type: 'Amicizia', id: INVIATE }],
    }),

    /**
     * RichiediAmicizia: dalla lista dei partecipanti di un evento in comune.
     * 409 RICHIESTA_GIA_RICEVUTA → proporre "accetta"; 409 CONFLITTO → ricaricare lo stato.
     */
    richiediAmicizia: build.mutation<AmiciziaResponse, RichiediAmiciziaRequest>({
      query: (dati) => ({ url: '/api/friendships', method: 'POST', body: dati }),
      invalidatesTags: dopoAmicizia,
    }),

    /** AccettaAmicizia: diventa AMICI e nasce (o torna attiva) la chat */
    accettaAmicizia: build.mutation<AmiciziaResponse, Uuid>({
      query: (amiciziaId) => ({ url: `/api/friendships/${amiciziaId}/accept`, method: 'POST' }),
      invalidatesTags: dopoAmicizia,
    }),

    /** RifiutaAmicizia: chi l'ha chiesta non lo scopre (per lui resta "inviata") */
    rifiutaAmicizia: build.mutation<void, Uuid>({
      query: (amiciziaId) => ({ url: `/api/friendships/${amiciziaId}/reject`, method: 'POST' }),
      invalidatesTags: dopoAmicizia,
    }),

    /** RitiraRichiesta: solo chi l'ha inviata */
    ritiraRichiesta: build.mutation<void, Uuid>({
      query: (amiciziaId) => ({ url: `/api/friendships/${amiciziaId}/withdraw`, method: 'POST' }),
      invalidatesTags: dopoAmicizia,
    }),

    /** RimuoviAmicizia: la chat resta, in sola lettura */
    rimuoviAmicizia: build.mutation<void, Uuid>({
      query: (amiciziaId) => ({ url: `/api/friendships/${amiciziaId}/remove`, method: 'POST' }),
      invalidatesTags: dopoAmicizia,
    }),

    // ---------------------------------------------------------------- Chat (sezione 9)

    /** ListaChat: anche quelle in sola lettura (puoiScrivere = false), dall'ultimo messaggio */
    listaChat: build.query<ChatResponse[], void>({
      query: () => '/api/chats',
      providesTags: [{ type: 'Chat', id: LISTA }],
    }),

    /**
     * ListaMessaggi a cursore: la prima pagina sono i 30 piu' recenti, le altre si chiedono con
     * fetchNextPage() finche' hasNextPage (before = id del piu' vecchio gia' caricato).
     *   const { data, fetchNextPage, hasNextPage } = useListaMessaggiInfiniteQuery(chatId)
     *   const messaggi = data?.pages.flatMap((p) => p.messaggi)   // dal piu' recente
     */
    listaMessaggi: build.infiniteQuery<MessaggiResponse, Uuid, Uuid | null>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (ultima) => (ultima.altri ? (ultima.messaggi.at(-1)?.id ?? null) : null),
      },
      query: ({ queryArg: chatId, pageParam: before }) => ({
        url: `/api/chats/${chatId}/messages`,
        params: { size: LIMITI_SOCIAL.messaggiPerPagina, ...(before ? { before } : {}) },
      }),
      providesTags: (_r, _e, chatId) => [{ type: 'Messaggi', id: chatId }],
    }),

    /** SegnaChatLetta: all'apertura della chat; azzera anche la sua notifica */
    segnaChatLetta: build.mutation<void, Uuid>({
      query: (chatId) => ({ url: `/api/chats/${chatId}/read`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Chat', id: LISTA }, { type: 'Notifica', id: 'chats' }, 'NonLette'],
    }),

    // ---------------------------------------------------------------- Notifiche (sezione 10)

    /** ListaNotificheEventi / ListaNotificheAmicizie: pagine dalla piu' recente */
    listaNotifiche: build.query<PaginaResponse<NotificaResponse>, ParametriListaNotifiche>({
      query: ({ categoria, page = 0, size = DIMENSIONE_PAGINA }) => ({
        url: `/api/notifications/${categoria}`,
        params: { page, size },
      }),
      providesTags: (_r, _e, { categoria }) => [{ type: 'Notifica', id: categoria }],
    }),

    /** ListaNotificheChat: una per chat con messaggi non letti, senza pagine */
    notificheChat: build.query<NotificaResponse[], void>({
      query: () => '/api/notifications/chats',
      providesTags: [{ type: 'Notifica', id: 'chats' }],
    }),

    /** ContaNonLette: badge della campanella, { events, friendships, chats } */
    contaNonLette: build.query<ConteggiNonLette, void>({
      query: () => '/api/notifications/unread-count',
      providesTags: ['NonLette'],
    }),

    /** SegnaNotificaLetta: per le chat vale come SegnaChatLetta */
    segnaNotificaLetta: build.mutation<void, { categoria: CategoriaNotifica; notificaId: Uuid }>({
      query: ({ categoria, notificaId }) => ({
        url: `/api/notifications/${categoria}/${notificaId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_r, _e, { categoria }) => [
        { type: 'Notifica', id: categoria },
        'NonLette',
        ...(categoria === 'chats' ? [{ type: 'Chat' as const, id: LISTA }] : []),
      ],
    }),

    /** SegnaTutteLette: di una categoria o, senza, di tutte */
    segnaTutteLette: build.mutation<void, CategoriaNotifica | void>({
      query: (categoria) => ({
        url: '/api/notifications/read-all',
        method: 'PATCH',
        params: categoria ? { categoria } : undefined,
      }),
      invalidatesTags: ['Notifica', 'NonLette', { type: 'Chat', id: LISTA }],
    }),
  }),
})

export const {
  useListaAmiciQuery,
  useRichiesteRicevuteQuery,
  useRichiesteInviateQuery,
  useRichiediAmiciziaMutation,
  useAccettaAmiciziaMutation,
  useRifiutaAmiciziaMutation,
  useRitiraRichiestaMutation,
  useRimuoviAmiciziaMutation,
  useListaChatQuery,
  useListaMessaggiInfiniteQuery,
  useSegnaChatLettaMutation,
  useListaNotificheQuery,
  useNotificheChatQuery,
  useContaNonLetteQuery,
  useSegnaNotificaLettaMutation,
  useSegnaTutteLetteMutation,
} = apiSocial
