import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { caricaRagnatela } from './carica'

// Accesso segreto alla Modalita' Ragnatela (easter egg, Decisione 25). Va montato una volta sola, in App.
// - Tastiera: scrivere "spidey" in qualsiasi pagina (maiuscole o minuscole), fuori dai campi di testo.
// - Mobile: 5 tocchi sul logo NoseY entro 2 secondi. I tocchi non vengono bloccati: il logo resta
//   il link alla home e lo scopre solo chi insiste.
// Poi ~1,6 s di fili di ragnatela che si tendono (TransizioneRagnatela) e la pagina /ragnatela.
// All'uscita (annunciaUscitaRagnatela, da Esc o "Torna a NoseY") la tela si ritira sopra NoseY.
// Con prefers-reduced-motion niente animazioni. Restituisce la fase della transizione in corso.

export const PERCORSO_RAGNATELA = '/ragnatela'
const CODICE = 'spidey'
const TOCCHI = 5
const FINESTRA_TOCCHI = 2000
/** Fili che si tendono, poi la tela resta completa un attimo prima di aprire la pagina */
export const DURATA_TRANSIZIONE = 1600
/** Tela che si ritira all'uscita */
export const DURATA_USCITA = 1000
const EVENTO_USCITA = 'nosey:esci-ragnatela'

export type FaseTransizione = 'entrata' | 'uscita'

/** Da chiamare subito prima di uscire da /ragnatela: App mostra la tela che si ritira */
export function annunciaUscitaRagnatela() {
  window.dispatchEvent(new Event(EVENTO_USCITA))
}

/** Stato della rotta: la pagina da cui si e' entrati, dove riporta "Torna a NoseY" */
export type StatoRagnatela = { da: string }

// Campi in cui si scrive davvero: li' "spidey" e' solo testo
function staScrivendo(elemento: EventTarget | null): boolean {
  if (!(elemento instanceof HTMLElement)) return false
  return elemento.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(elemento.tagName)
}

const movimentoRidotto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCodiceSegreto(): FaseTransizione | null {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [fase, setFase] = useState<FaseTransizione | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const timerUscita = useRef<ReturnType<typeof setTimeout>>(undefined)
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
    setFase('entrata')
    timer.current = setTimeout(() => {
      timer.current = undefined
      setFase(null)
      navigate(PERCORSO_RAGNATELA, { state: stato })
    }, DURATA_TRANSIZIONE)
  }, [navigate])

  // Uscita: la tela copre tutto e si ritira mentre sotto ricompare NoseY
  useEffect(() => {
    function esci() {
      if (movimentoRidotto()) return
      clearTimeout(timerUscita.current)
      setFase('uscita')
      timerUscita.current = setTimeout(() => setFase(null), DURATA_USCITA)
    }
    window.addEventListener(EVENTO_USCITA, esci)
    return () => window.removeEventListener(EVENTO_USCITA, esci)
  }, [])

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
      clearTimeout(timerUscita.current)
      timer.current = undefined
    },
    [],
  )

  return fase
}
