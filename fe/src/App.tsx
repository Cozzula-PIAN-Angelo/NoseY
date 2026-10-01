import { Outlet } from 'react-router'
import { Avvisi } from '@/components/ui'

// Radice di tutte le rotte (src/router.tsx): qui va il layout comune dell'app.
export default function App() {
  return (
    <div className="min-h-screen">
      <Outlet />

      {/* Avvisi a comparsa: uno solo per tutta l'app */}
      <Avvisi />
    </div>
  )
}
