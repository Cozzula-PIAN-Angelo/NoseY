import { api } from '@/lib/api'
import { useStatoQuery } from '@/store/apiSlice'
import { Avvisi, MessaggioErrore } from '@/components/ui'
import Componenti from '@/pages/Componenti'

export default function App() {
  const { data: stato, error, refetch } = useStatoQuery()

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

        {error && <MessaggioErrore errore={error} onRiprova={refetch} className="mt-6" />}

        {/* Provvisorio, finche' non c'e' il router: catalogo dei componenti comuni */}
        <div className="mt-10">
          <Componenti />
        </div>
      </div>

      {/* Avvisi a comparsa: uno solo per tutta l'app */}
      <Avvisi />
    </div>
  )
}
