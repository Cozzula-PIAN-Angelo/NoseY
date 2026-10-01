import { useCallback, useState } from 'react'
import type { Coordinate } from '@/components/mappa'

// Posizione dell'utente dal browser (FE1-04), chiesta SOLO quando l'utente lo decide
// (pulsante "Usa la mia posizione"): senza consenso gli eventi restano ordinati per data.
// La posizione resta in memoria nella pagina: non si salva da nessuna parte.

export type StatoPosizione =
  | 'non-chiesta' // l'utente non ha ancora scelto
  | 'in-attesa' // il browser sta chiedendo il permesso o cercando la posizione
  | 'concessa'
  | 'negata' // permesso rifiutato
  | 'non-disponibile' // browser senza geolocalizzazione, posizione introvabile o tempo scaduto

export function usePosizioneUtente() {
  const [stato, setStato] = useState<StatoPosizione>('non-chiesta')
  const [posizione, setPosizione] = useState<Coordinate | null>(null)

  const chiedi = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStato('non-disponibile')
      return
    }
    setStato('in-attesa')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosizione({ lat: p.coords.latitude, lng: p.coords.longitude })
        setStato('concessa')
      },
      (errore) => {
        setPosizione(null)
        setStato(errore.code === errore.PERMISSION_DENIED ? 'negata' : 'non-disponibile')
      },
      // La precisione alta non serve (si arrotonda a ~1 km) e consuma batteria sul telefono
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }, [])

  /** Torna all'ordine per data, dimenticando la posizione */
  const dimentica = useCallback(() => {
    setPosizione(null)
    setStato('non-chiesta')
  }, [])

  return { stato, posizione, chiedi, dimentica }
}
