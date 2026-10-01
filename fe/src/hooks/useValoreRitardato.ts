import { useEffect, useState } from 'react'

/**
 * Il valore, ma aggiornato solo dopo `ms` millisecondi senza cambiamenti. Serve per le ricerche
 * "mentre si scrive": la richiesta parte quando l'utente si ferma, non a ogni tasto.
 *   const cercaRitardato = useValoreRitardato(cerca, 300)
 */
export function useValoreRitardato<T>(valore: T, ms = 300): T {
  const [ritardato, setRitardato] = useState(valore)
  useEffect(() => {
    const timer = setTimeout(() => setRitardato(valore), ms)
    return () => clearTimeout(timer)
  }, [valore, ms])
  return ritardato
}
