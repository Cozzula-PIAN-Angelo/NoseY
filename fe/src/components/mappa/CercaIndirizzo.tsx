import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon, TextField } from '@/components/ui'
import { cx } from '@/lib/cx'
import { cercaIndirizzi, type Indirizzo } from './indirizzi'
import type { Coordinate } from './tipi'

// Ricerca di una via o di un luogo per mettere il punto sulla mappa, in alternativa al clic.
// Parte con Invio o con la lente (Nominatim non permette l'autocompletamento, vedi indirizzi.ts).
// Il campo puo' stare dentro un altro form: Invio qui cerca, non invia il form che lo contiene.
// Classi cerca-indirizzo-*: agganci per chi deve cambiarne l'aspetto (es. ragnatela.css).

type CercaIndirizzoProps = {
  /** Riceve il risultato scelto: chi usa il componente mette li' il punto e ci sposta la mappa */
  onScegli: (indirizzo: Indirizzo) => void
  /** Punto che la mappa sta mostrando: i risultati vicini vengono prima */
  vicinoA?: Coordinate
  etichetta?: string
  className?: string
}

type Stato = { tipo: 'fermo' } | { tipo: 'cerco' } | { tipo: 'risultati'; elenco: Indirizzo[] } | { tipo: 'errore' }

export function CercaIndirizzo({ onScegli, vicinoA, etichetta = 'Cerca una via o un luogo', className }: CercaIndirizzoProps) {
  const id = useId()
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState<Stato>({ tipo: 'fermo' })
  const controllo = useRef<AbortController | null>(null)

  // Uscendo dalla pagina la ricerca in corso si annulla
  useEffect(() => () => controllo.current?.abort(), [])

  function cerca() {
    const q = testo.trim()
    if (q.length < 3) return
    controllo.current?.abort()
    const corrente = new AbortController()
    controllo.current = corrente
    setStato({ tipo: 'cerco' })
    cercaIndirizzi(q, corrente.signal, vicinoA)
      .then((elenco) => setStato({ tipo: 'risultati', elenco }))
      .catch(() => {
        if (!corrente.signal.aborted) setStato({ tipo: 'errore' })
      })
  }

  function tasto(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      cerca()
    } else if (e.key === 'Escape' && stato.tipo === 'risultati') {
      // Chiude l'elenco senza far uscire dalla pagina che lo contiene (es. Esc nella Ragnatela)
      e.preventDefault()
      setStato({ tipo: 'fermo' })
    }
  }

  function scegli(indirizzo: Indirizzo) {
    setTesto(indirizzo.testo)
    setStato({ tipo: 'fermo' })
    onScegli(indirizzo)
  }

  const annuncio =
    stato.tipo === 'cerco'
      ? 'Cerco…'
      : stato.tipo === 'errore'
        ? 'Ricerca non riuscita: controlla la connessione e riprova.'
        : stato.tipo === 'risultati' && stato.elenco.length === 0
          ? 'Nessun risultato: prova ad aggiungere la città.'
          : stato.tipo === 'risultati'
            ? `${stato.elenco.length} ${stato.elenco.length === 1 ? 'risultato' : 'risultati'}: scegline uno.`
            : ''

  return (
    <div className={cx('cerca-indirizzo flex flex-col gap-space-xs', className)}>
      <TextField
        id={`${id}-campo`}
        type="search"
        etichetta={etichetta}
        icona="search"
        placeholder="Es. Via del Corso 12, Roma"
        autoComplete="off"
        enterKeyHint="search"
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        onKeyDown={tasto}
        dopo={
          <button
            type="button"
            aria-label="Cerca"
            title="Cerca"
            onClick={cerca}
            disabled={testo.trim().length < 3 || stato.tipo === 'cerco'}
            className="cerca-indirizzo-pulsante flex size-9 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            {stato.tipo === 'cerco' ? (
              // Rotellina come quella di Button (inCorso)
              <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Icon nome="arrow_forward" />
            )}
          </button>
        }
      />

      <p role="status" className="cerca-indirizzo-stato font-body-sm text-body-sm text-on-surface-variant empty:hidden">
        {annuncio}
      </p>

      {stato.tipo === 'risultati' && stato.elenco.length > 0 && (
        <ul aria-label="Risultati della ricerca" className="cerca-indirizzo-elenco flex flex-col overflow-hidden rounded-lg bg-surface-container">
          {stato.elenco.map((r) => (
            <li key={`${r.punto.lat},${r.punto.lng}`}>
              <button
                type="button"
                onClick={() => scegli(r)}
                className="cerca-indirizzo-risultato flex w-full cursor-pointer items-start gap-space-sm px-space-md py-space-sm text-left font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none"
              >
                <Icon nome="location_on" size={18} className="mt-0.5 text-tertiary" />
                {r.testo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
