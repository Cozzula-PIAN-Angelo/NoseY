import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { BASE, type Stato } from '@/lib/api'
import type { RootState } from './index'
import { sessioneScaduta } from './sessioneSlice'

// Unica API di RTK Query: ogni funzionalita' aggiunge qui i propri endpoint
// (oppure con apiSlice.injectEndpoints dalla sua cartella in src/features).
// Stessa base di api.ts: vuota in sviluppo (proxy di Vite), VITE_API_URL su Render.
//
// Gli errori arrivano come FetchBaseQueryError con l'ErroreResponse del backend in "data":
// per mostrarli o decidere in base al codice si usa leggiErrore() di lib/errori.ts.
const baseQuery = fetchBaseQuery({
  baseUrl: BASE,
  // "Authorization: Bearer <token>" su ogni chiamata, se c'e' una sessione. Anche sugli
  // endpoint pubblici: con il token il backend calcola sonoProprietario, sonoIscritto...
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).sessione.token
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// Sul login il 401 e' CREDENZIALI_ERRATE (email o password sbagliate), non una sessione scaduta.
// Sul logout un 401 vuol dire token gia' scaduto o revocato: si sta uscendo comunque, quindi
// niente avviso "Sessione scaduta" ne' rimando al login (l'uscita la chiude MenuUtente).
const SENZA_SESSIONE_SCADUTA = ['/api/auth/login', '/api/auth/logout']

// 401 NON_AUTENTICATO = token scaduto o revocato (progettazione v4, sezione 0): si esce, si svuota
// la cache (i dati dell'utente non restano in memoria) e SessioneScaduta porta al login.
// Solo se c'era una sessione: con piu' chiamate in parallelo si esce una volta sola.
const baseQueryConSessione: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const risultato = await baseQuery(args, api, extraOptions)
  const url = typeof args === 'string' ? args : args.url
  if (risultato.error?.status === 401 && !SENZA_SESSIONE_SCADUTA.includes(url) && (api.getState() as RootState).sessione.token) {
    api.dispatch(sessioneScaduta())
    api.dispatch(apiSlice.util.resetApiState())
  }
  return risultato
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryConSessione,
  endpoints: (build) => ({
    stato: build.query<Stato, void>({ query: () => '/api/stato' }),
  }),
})

export const { useStatoQuery } = apiSlice
