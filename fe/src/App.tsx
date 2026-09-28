import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { api } from '@/lib/api'
import { useStatoQuery } from '@/store/apiSlice'

function messaggioErrore(e: FetchBaseQueryError | SerializedError): string {
  if ('status' in e) {
    return 'error' in e ? e.error : `${e.status} ${typeof e.data === 'string' ? e.data : JSON.stringify(e.data)}`
  }
  return e.message ?? 'Errore sconosciuto'
}

export default function App() {
  const { data: stato, error } = useStatoQuery()
  const errore = error ? messaggioErrore(error) : null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">NoseY</h1>
        <p className="mt-1 text-sm text-slate-600">Piattaforma di gestione eventi</p>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">API</span>
            <code className="truncate font-mono text-xs">{api.indirizzo}</code>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span className="text-slate-500">Database</span>
            <span className="font-mono text-xs">{stato ? stato.database : '...'}</span>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span className="text-slate-500">Ora del server</span>
            <span className="font-mono text-xs">{stato ? stato.ora : '...'}</span>
          </div>
        </section>

        {errore && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errore}
          </p>
        )}
      </div>
    </div>
  )
}
