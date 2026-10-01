import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { BASE, type Stato } from '@/lib/api'
import type { RootState } from './index'

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

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  endpoints: (build) => ({
    stato: build.query<Stato, void>({ query: () => '/api/stato' }),
  }),
})

export const { useStatoQuery } = apiSlice
