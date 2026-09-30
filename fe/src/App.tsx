import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { api } from '@/lib/api'
import { useStatoQuery } from '@/store/apiSlice'
import Componenti from '@/pages/Componenti'

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
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-margin-mobile py-10 md:px-margin">
        <h1 className="font-headline-lg text-headline-lg">NoseY</h1>
        <p className="mt-1 text-on-surface-variant">Piattaforma di gestione eventi</p>

        <section className="mt-8 rounded-xl bg-surface-card p-space-md">
          <div className="flex justify-between gap-4">
            <span className="text-on-surface-variant">API</span>
            <code className="truncate font-mono text-xs">{api.indirizzo}</code>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span className="text-on-surface-variant">Database</span>
            <span className="font-mono text-xs">{stato ? stato.database : '...'}</span>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span className="text-on-surface-variant">Ora del server</span>
            <span className="font-mono text-xs">{stato ? stato.ora : '...'}</span>
          </div>
        </section>

        {errore && (
          <p className="mt-6 rounded-lg bg-status-annullato/10 p-3 text-status-annullato">{errore}</p>
        )}

        {/* Provvisorio, finche' non c'e' il router: catalogo dei componenti comuni */}
        <div className="mt-10">
          <Componenti />
        </div>
      </div>
    </div>
  )
}
