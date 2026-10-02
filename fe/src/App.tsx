import { Outlet } from 'react-router'
import { BarraNavigazione, ConnessioneLive, ControlloSessione, PiePagina, SessioneScaduta } from '@/components/layout'
import { Avvisi } from '@/components/ui'
import { TransizioneRagnatela } from '@/features/ragnatela/TransizioneRagnatela'
import { useCodiceSegreto } from '@/features/ragnatela/useCodiceSegreto'

// Radice di tutte le rotte (src/router.tsx): layout comune delle schermate Stitch,
// header fisso alto 64px (pt-16 sul main), pagina e footer.
export default function App() {
  // Accesso segreto alla Modalita' Ragnatela ("spidey" o 5 tocchi sul logo), Decisione 25
  const faseRagnatela = useCodiceSegreto()

  return (
    <div className="flex min-h-screen flex-col">
      <BarraNavigazione />

      <main className="w-full flex-1 bg-surface-canvas pt-16">
        <Outlet />
      </main>

      <PiePagina />

      {/* Profilo aggiornato all'avvio, uscita alla scadenza del token */}
      <ControlloSessione />
      {/* WebSocket per chat e notifiche live, finche' c'e' una sessione */}
      <ConnessioneLive />
      {/* Dopo un 401: avviso e pagina di login */}
      <SessioneScaduta />

      {/* Avvisi a comparsa: uno solo per tutta l'app */}
      <Avvisi />

      {faseRagnatela && <TransizioneRagnatela key={faseRagnatela} fase={faseRagnatela} />}
    </div>
  )
}
