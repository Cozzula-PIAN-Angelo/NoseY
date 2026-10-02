import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { caricaRagnatela } from './carica'

// Accesso segreto alla Modalita' Ragnatela (easter egg, Decisione 25). Va montato una volta sola, in App.
// - Tastiera: scrivere "spidey" in qualsiasi pagina (maiuscole o minuscole), fuori dai campi di testo.
// - Mobile: 5 tocchi sul logo NoseY entro 2 secondi. I tocchi non vengono bloccati: il logo resta
//   il link alla home e lo scopre solo chi insiste.
// Poi ~800 ms di fili di ragnatela (TransizioneRagnatela) e la pagina /ragnatela; con
// prefers-reduced-motion si va diretti. Restituisce true durante la transizione.

export const PERCORSO_RAGNATELA = '/ragnatela'
const CODICE = 'spidey'
const TOCCHI = 5
const FINESTRA_TOCCHI = 2000
export const DURATA_TRANSIZIONE = 800

/** Stato della rotta: la pagina da cui si e' entrati, dove riporta "Torna a NoseY" */
export type StatoRagnatela = { da: string }

// Campi in cui si scrive davvero: li' "spidey" e' solo testo
function staScrivendo(elemento: EventTarget | null): boolean {
  if (!(elemento instanceof HTMLElement)) return false
  return elemento.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(elemento.tagName)
}

const movimentoRidotto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCodiceSegreto(): boolean {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [transizione, setTransizione] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const buffer = useRef('')
  const tocchi = useRef<number[]>([])
  /** Pagina corrente letta dagli ascoltatori, che restano gli stessi tra un cambio di pagina e l'altro */
  const pagina = useRef(pathname + search)

  useEffect(() => {
    pagina.current = pathname + search
  }, [pathname, search])

  const attiva = useCallback(() => {
    const da = pagina.current
    if (da.startsWith(PERCORSO_RAGNATELA) || timer.current !== undefined) return
    const stato: StatoRagnatela = { da }
    // La pagina si scarica mentre i fili si tendono: all'arrivo e' gia' pronta
    void caricaRagnatela()
    if (movimentoRidotto()) {
      navigate(PERCORSO_RAGNATELA, { state: stato })
      return
    }
    setTransizione(true)
    timer.current = setTimeout(() => {
      timer.current = undefined
      setTransizione(false)
      navigate(PERCORSO_RAGNATELA, { state: stato })
    }, DURATA_TRANSIZIONE)
  }, [navigate])

  useEffect(() => {
    function tasto(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || staScrivendo(e.target)) return
      if (e.key.length !== 1) return
      buffer.current = (buffer.current + e.key.toLowerCase()).slice(-CODICE.length)
      if (buffer.current === CODICE) {
        buffer.current = ''
        attiva()
      }
    }

    // Il logo e' il primo link alla home dentro l'header del sito (components/layout/BarraNavigazione)
    function clic(e: MouseEvent) {
      if (!(e.target instanceof Element) || !e.target.closest('header a[href="/"]')) return
      // timeStamp = quando e' avvenuto il tocco, non quando lo si gestisce: ogni tocco rinaviga sulla
      // home e, su un telefono lento, i tocchi successivi arrivano in coda distanziati dal render
      const adesso = e.timeStamp
      tocchi.current = [...tocchi.current.filter((t) => adesso - t < FINESTRA_TOCCHI), adesso]
      if (tocchi.current.length >= TOCCHI) {
        tocchi.current = []
        attiva()
      }
    }

    window.addEventListener('keydown', tasto)
    document.addEventListener('click', clic)
    return () => {
      window.removeEventListener('keydown', tasto)
      document.removeEventListener('click', clic)
    }
  }, [attiva])

  useEffect(
    () => () => {
      clearTimeout(timer.current)
      timer.current = undefined
    },
    [],
  )

  return transizione
}
