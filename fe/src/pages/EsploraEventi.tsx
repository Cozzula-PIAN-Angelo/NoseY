import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CardEvento } from '@/components/eventi'
import { Button, Icon, MessaggioErrore, Paginazione, Scheletro, StatoVuoto, TextField, stilePulsante } from '@/components/ui'
import { useListaEventiQuery } from '@/features/eventi/apiEventi'
import { filtraEventi, TESTI_POSIZIONE, type Periodo } from '@/features/eventi/filtriEventi'
import { FinestraMappaEventi } from '@/features/eventi/FinestraMappaEventi'
import { usePosizioneUtente } from '@/features/eventi/usePosizioneUtente'
import { cx } from '@/lib/cx'

// Esplora eventi (FE1-19), rotta /events (pubblica), come la schermata Stitch "Lista & Modale Mappa
// Radar": ricerca per titolo, filtri per periodo, "vicino a te", griglia di card (passo 1) e la mappa
// degli eventi trovati in una finestra (passo 2).
// Solo dati veri di ListaEventiMappa: niente prezzo, capienza, genere o indirizzo (l'API non li ha).
// La posizione la usa il backend e cambia l'ORDINE, mai il numero degli eventi (requisito della traccia).

/** ?periodo= dalla home ("oggi", "weekend"...): valido solo se e' uno dei filtri */
const periodoDa = (v: string | null): Periodo => (['tutti', 'in-corso', 'oggi', 'weekend'].includes(v ?? '') ? (v as Periodo) : 'tutti')

const PERIODI: { valore: Periodo; etichetta: string }[] = [
  { valore: 'tutti', etichetta: 'Tutti gli eventi' },
  { valore: 'in-corso', etichetta: 'In corso' },
  { valore: 'oggi', etichetta: 'Oggi' },
  { valore: 'weekend', etichetta: 'Questo weekend' },
]

/** Card per pagina: 4 righe da 3 su schermo largo */
const PER_PAGINA = 12

export default function EsploraEventi() {
  const { stato, posizione, chiedi, dimentica } = usePosizioneUtente()
  const { data: eventi = [], isLoading, isFetching, error, refetch } = useListaEventiQuery(posizione ?? undefined)
  // La ricerca della home arriva con ?cerca= e ?periodo= (solo come valori di partenza)
  const [parametri] = useSearchParams()
  const [cerca, setCerca] = useState(() => parametri.get('cerca') ?? '')
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDa(parametri.get('periodo')))
  const [mappaAperta, setMappaAperta] = useState(false)
  // La pagina vale solo per questi filtri: cambiandoli si riparte dalla prima
  const filtri = `${cerca.trim()}|${periodo}`
  const [paginaScelta, setPaginaScelta] = useState({ filtri, numero: 0 })
  const numero = paginaScelta.filtri === filtri ? paginaScelta.numero : 0

  const trovati = filtraEventi(eventi, cerca, periodo)
  const totalePagine = Math.ceil(trovati.length / PER_PAGINA)
  const pagina = Math.min(numero, Math.max(0, totalePagine - 1))
  const visibili = trovati.slice(pagina * PER_PAGINA, (pagina + 1) * PER_PAGINA)
  const inCorso = eventi.filter((e) => e.stato === 'IN_CORSO').length

  let contenuto
  if (isLoading) {
    contenuto = (
      <div role="status" aria-label="Caricamento degli eventi" className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Scheletro key={i} className="aspect-[4/3]" />
        ))}
      </div>
    )
  } else if (error) {
    contenuto = <MessaggioErrore errore={error} onRiprova={refetch} />
  } else if (trovati.length === 0) {
    contenuto = (
      <StatoVuoto
        icona="event_busy"
        titolo={eventi.length === 0 ? 'Nessun evento in programma' : 'Nessun evento trovato'}
        messaggio={
          eventi.length === 0
            ? 'Al momento non ci sono eventi in programma o in corso. Torna a trovarci presto.'
            : 'Prova con un altro titolo o un altro periodo.'
        }
        azione={
          eventi.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setCerca('')
                setPeriodo('tutti')
              }}
            >
              Mostra tutti gli eventi
            </Button>
          )
        }
      />
    )
  } else {
    contenuto = (
      <div className="flex flex-col gap-space-md">
        <ul className={cx('grid gap-space-md sm:grid-cols-2 lg:grid-cols-3', isFetching && 'opacity-60 transition-opacity')}>
          {visibili.map((e) => (
            <li key={e.id} className="flex">
              <CardEvento
                evento={e}
                azioni={
                  <Link to={`/events/${e.id}`} className={stilePulsante({ size: 'sm' })}>
                    <Icon nome="visibility" size={16} />
                    Vedi evento
                  </Link>
                }
              />
            </li>
          ))}
        </ul>
        <Paginazione
          contenuto={visibili}
          pagina={pagina}
          dimensione={PER_PAGINA}
          totaleElementi={trovati.length}
          totalePagine={totalePagine}
          onCambia={(n) => setPaginaScelta({ filtri, numero: n })}
          nomeElementi="eventi"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
        <div className="flex flex-col gap-space-xs">
          <p className="flex items-center gap-1.5 font-label-code-status text-label-code-status uppercase tracking-wider text-status-in-corso">
            <span className="size-1.5 rounded-full bg-status-in-corso motion-safe:animate-pulse" />
            Eventi in programma e in corso
          </p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Esplora eventi</h1>
          <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">
            Club, live set e serate dal vivo: cerca per titolo, scegli il periodo o guarda cosa c'è vicino a te.
          </p>
        </div>
        {!isLoading && !error && (
          <dl className="flex shrink-0 gap-space-xs rounded-xl bg-surface-card p-space-sm">
            <div className="flex items-center gap-space-xs px-space-sm">
              <Icon nome="event_available" size={22} className="text-secondary" />
              <div>
                <dt className="font-label-code-status text-label-code-status uppercase text-outline">Eventi attivi</dt>
                <dd className="font-label-btn text-label-btn text-on-surface">{eventi.length}</dd>
              </div>
            </div>
            <div className="flex items-center gap-space-xs border-l border-outline-variant/30 px-space-sm">
              <Icon nome="sensors" size={22} className="text-status-in-corso" />
              <div>
                <dt className="font-label-code-status text-label-code-status uppercase text-outline">In corso ora</dt>
                <dd className="font-label-btn text-label-btn text-status-in-corso">{inCorso}</dd>
              </div>
            </div>
          </dl>
        )}
      </header>

      <div className="flex flex-col gap-space-sm rounded-xl bg-surface-card p-space-md lg:flex-row lg:items-end">
        <TextField
          etichetta="Cerca un evento"
          icona="search"
          type="search"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Titolo dell'evento"
          className="lg:flex-1"
        />
        <div role="group" aria-label="Periodo" className="flex flex-wrap gap-space-xs">
          {PERIODI.map((p) => (
            <button
              key={p.valore}
              type="button"
              aria-pressed={periodo === p.valore}
              onClick={() => setPeriodo(p.valore)}
              className={cx(
                'flex items-center gap-1.5 rounded-lg px-space-sm py-2 font-label-btn text-label-btn transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                periodo === p.valore ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {p.valore === 'in-corso' && <span aria-hidden="true" className="size-1.5 rounded-full bg-status-in-corso" />}
              {p.etichetta}
            </button>
          ))}
        </div>
      </div>

      <section
        aria-live="polite"
        className="flex flex-col gap-space-sm rounded-xl bg-surface-card p-space-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-space-sm">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon nome={stato === 'concessa' ? 'my_location' : 'radar'} size={22} />
          </span>
          <div className="flex flex-col">
            <p className="font-headline-sm text-headline-sm">Trova eventi vicino a te</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{TESTI_POSIZIONE[stato]}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-space-xs">
          {stato === 'concessa' ? (
            <Button variant="secondary" size="sm" icona="calendar_month" onClick={dimentica}>
              Ordina per data
            </Button>
          ) : (
            stato !== 'negata' && (
              <Button variant="secondary" size="sm" icona="near_me" inCorso={stato === 'in-attesa'} onClick={chiedi}>
                Usa la mia posizione
              </Button>
            )
          )}
          <Button size="sm" icona="map" onClick={() => setMappaAperta(true)} disabled={isLoading || !!error}>
            Apri la mappa
          </Button>
        </div>
      </section>

      {!isLoading && !error && trovati.length > 0 && (
        <p className="px-space-xs font-label-code-status text-label-code-status uppercase text-outline">
          {trovati.length === 1 ? '1 evento' : `${trovati.length} eventi`} · {posizione ? 'dal più vicino' : 'in ordine di data'}
        </p>
      )}

      {contenuto}

      <FinestraMappaEventi aperta={mappaAperta} onChiudi={() => setMappaAperta(false)} eventi={trovati} posizione={posizione} />
    </div>
  )
}
