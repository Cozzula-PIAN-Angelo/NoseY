import { useEffect, useState } from 'react'
import { api, type Stato } from '@/lib/api'

export default function App() {
  const [stato, setStato] = useState<Stato | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    api
      .stato()
      .then(setStato)
      .catch((e) => setErrore(e instanceof Error ? e.message : String(e)))
  }, [])

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
