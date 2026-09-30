// Tipi della mappa, separati da Mappa.tsx cosi' si possono importare
// senza caricare MapLibre (che e' pesante e arriva solo quando serve).
import type { StatoEvento, TipoPoi } from '@/types/api'

/** Punto sulla mappa, con gli stessi nomi dei DTO del backend (lat, lng) */
export type Coordinate = {
  lat: number
  lng: number
}

/** Stili scuri di OpenFreeMap (Decisione 6) */
export type StileMappa = 'dark' | 'fiord'

type MarkerBase = Coordinate & {
  id: string
  /** Testo per chi usa lo screen reader e al passaggio del mouse, es. il titolo dell'evento */
  etichetta?: string
  onClick?: () => void
}

/** Marker di un evento (colore dallo stato) oppure di un POI (icona dal tipo) */
export type MarkerMappa = MarkerBase &
  (
    | { tipo: 'evento'; stato: StatoEvento; /** Evento aperto nel dettaglio */ selezionato?: boolean }
    | { tipo: TipoPoi }
  )

export type MappaProps = {
  /** Centro iniziale; se cambia, la mappa ci si sposta con un'animazione */
  centro: Coordinate
  /** Livello di zoom (default 13: un quartiere) */
  zoom?: number
  marker?: MarkerMappa[]
  /**
   * Punto scelto dall'utente (es. posizione del nuovo evento o di un POI).
   * Si mostra solo se c'e' anche onScegliPunto.
   */
  puntoScelto?: Coordinate | null
  /** Se presente, cliccando sulla mappa (o trascinando il segnaposto) si sceglie un punto */
  onScegliPunto?: (punto: Coordinate) => void
  /** Stile della mappa (default "dark") */
  stile?: StileMappa
  /** Descrizione della mappa per gli screen reader */
  etichetta?: string
  /** Classi del contenitore: l'altezza va data qui (default h-96) */
  className?: string
}

export const URL_STILI: Record<StileMappa, string> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  fiord: 'https://tiles.openfreemap.org/styles/fiord',
}

// Attribuzione obbligatoria (Decisione 6): i dati sono di OpenStreetMap (licenza ODbL,
// "© OpenStreetMap" con link alla pagina del copyright), le tessere di OpenMapTiles
// servite da OpenFreeMap. Gli stili di OpenFreeMap non la includono: la aggiungiamo noi.
const link = (url: string, testo: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${testo}</a>`

export const ATTRIBUZIONE = [
  link('https://openfreemap.org', 'OpenFreeMap'),
  link('https://www.openmaptiles.org/', '© OpenMapTiles'),
  `Dati ${link('https://www.openstreetmap.org/copyright', '© OpenStreetMap')}`,
]

/** Arrotonda a 6 decimali (~10 cm): piu' precisione non serve e sporca i dati */
export function arrotonda(punto: Coordinate): Coordinate {
  const r = (n: number) => Math.round(n * 1e6) / 1e6
  return { lat: r(punto.lat), lng: r(punto.lng) }
}
