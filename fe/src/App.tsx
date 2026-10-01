import { Outlet } from 'react-router'
import { BarraNavigazione, PiePagina, SessioneScaduta } from '@/components/layout'
import { Avvisi } from '@/components/ui'

// Radice di tutte le rotte (src/router.tsx): layout comune delle schermate Stitch,
// header fisso alto 64px (pt-16 sul main), pagina e footer.
export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <BarraNavigazione />

      <main className="w-full flex-1 bg-surface-canvas pt-16">
        <Outlet />
      </main>

      <PiePagina />

      {/* Dopo un 401: avviso e pagina di login */}
      <SessioneScaduta />

      {/* Avvisi a comparsa: uno solo per tutta l'app */}
      <Avvisi />
    </div>
  )
}
