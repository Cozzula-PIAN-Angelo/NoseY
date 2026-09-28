import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { BASE, type Stato } from '@/lib/api'

// Unica API di RTK Query: ogni funzionalita' aggiunge qui i propri endpoint
// (oppure con apiSlice.injectEndpoints dalla sua cartella in src/features).
// Stessa base di api.ts: vuota in sviluppo (proxy di Vite), VITE_API_URL su Render.
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: BASE }),
  endpoints: (build) => ({
    stato: build.query<Stato, void>({ query: () => '/api/stato' }),
  }),
})

export const { useStatoQuery } = apiSlice
