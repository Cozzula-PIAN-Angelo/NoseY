import { lazy, Suspense } from 'react'
import { Caricamento } from '@/components/ui'
import type { MappaProps } from './tipi'

// MapLibre pesa circa 250 kB (compressi): lo scarichiamo solo quando una pagina mostra
// davvero una mappa, invece di farlo pesare su tutte le pagine.
const MappaVera = lazy(() => import('./Mappa'))

// Uso: import { Mappa } from '@/components/mappa'
//   <Mappa centro={{ lat: 41.8902, lng: 12.4922 }} marker={[...]} className="h-[480px]" />
export function Mappa(props: MappaProps) {
  return (
    <Suspense fallback={<Caricamento riquadro testo="Carico la mappa..." className={props.className} />}>
      <MappaVera {...props} />
    </Suspense>
  )
}

export { arrotonda, type Coordinate, type MappaProps, type MarkerMappa, type StileMappa } from './tipi'
