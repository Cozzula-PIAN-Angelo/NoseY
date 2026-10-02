import { useEffect, useState } from 'react'
import { useValoreRitardato } from '@/hooks/useValoreRitardato'
import { indirizzoDi, indirizzoInCache } from './indirizzi'
import type { Coordinate } from './tipi'

// Indirizzo del punto scelto sulla mappa, da mostrare al posto delle coordinate.
// La richiesta parte mezzo secondo dopo l'ultimo cambio: trascinando il segnaposto o cliccando
// piu' volte di fila non si manda una richiesta per ogni posizione intermedia.

export type StatoIndirizzo =
  | { stato: 'nessun-punto' }
  | { stato: 'in-attesa'; testo: string }
  | { stato: 'trovato'; testo: string }
  /** Nominatim non ha niente li' o non risponde: al posto della via restano le coordinate */
  | { stato: 'non-trovato'; testo: string }

const coordinate = (p: Coordinate) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`

export function useIndirizzo(punto: Coordinate | null): StatoIndirizzo {
  const [risposte, setRisposte] = useState<Record<string, string | null>>({})
  const ritardato = useValoreRitardato(punto, 500)

  useEffect(() => {
    if (!ritardato || indirizzoInCache(ritardato) !== undefined) return
    const controllo = new AbortController()
    const chiave = coordinate(ritardato)
    indirizzoDi(ritardato, controllo.signal)
      .then((testo) => setRisposte((r) => ({ ...r, [chiave]: testo })))
      .catch(() => {
        // Errore di rete o richiesta superata da un punto piu' nuovo
        if (!controllo.signal.aborted) setRisposte((r) => ({ ...r, [chiave]: null }))
      })
    return () => controllo.abort()
  }, [ritardato])

  if (!punto) return { stato: 'nessun-punto' }
  const chiave = coordinate(punto)
  const testo = chiave in risposte ? risposte[chiave] : indirizzoInCache(punto)
  if (testo === undefined) return { stato: 'in-attesa', testo: 'cerco la via…' }
  return testo ? { stato: 'trovato', testo } : { stato: 'non-trovato', testo: chiave }
}
