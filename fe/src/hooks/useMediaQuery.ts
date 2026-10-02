import { useEffect, useState } from 'react'

/**
 * true finche' la media query vale, e si aggiorna quando cambia (finestra ridimensionata,
 * telefono ruotato). Es. useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
 */
export function useMediaQuery(query: string): boolean {
  const [vale, setVale] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const cambia = () => setVale(mq.matches)
    cambia()
    mq.addEventListener('change', cambia)
    return () => mq.removeEventListener('change', cambia)
  }, [query])

  return vale
}
