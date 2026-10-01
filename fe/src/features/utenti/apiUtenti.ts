// Chiamate alle API del lato utenti (progettazione v4, sezione 2): endpoint RTK Query aggiunti
// all'unica API dell'app (store/apiSlice.ts), che mette gia' token e gestione del 401.
import { apiSlice } from '@/store/apiSlice'
import { utenteAggiornato } from '@/store/sessioneSlice'
import type { UtenteResponse } from '@/types/utenti'

const apiConEtichette = apiSlice.enhanceEndpoints({ addTagTypes: ['Profilo'] })

export const apiUtenti = apiConEtichette.injectEndpoints({
  endpoints: (build) => ({
    /** VediProfilo: chiamato all'avvio (ControlloSessione) e dalla pagina del profilo */
    vediProfilo: build.query<UtenteResponse, void>({
      query: () => '/api/users/me',
      providesTags: ['Profilo'],
      // Ogni profilo ricevuto aggiorna l'utente della sessione (barra, menu, ruolo per le rotte)
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(utenteAggiornato(data))
        } catch {
          // 401 → ci pensa apiSlice; altri errori (rete...) → resta l'utente salvato
        }
      },
    }),
  }),
})

export const { useVediProfiloQuery } = apiUtenti
