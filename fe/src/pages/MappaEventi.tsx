import { useEffect, useState } from 'react'
import { Button, Icon, MessaggioErrore, Scheletro, StatoVuoto } from '@/components/ui'
import { Mappa, type Coordinate, type MarkerMappa } from '@/components/mappa'
import { useListaEventiQuery } from '@/features/eventi/apiEventi'
import { AnteprimaEvento } from '@/features/eventi/AnteprimaEvento'
import { ListaEventiMappa } from '@/features/eventi/ListaEventiMappa'
import { usePosizioneUtente } from '@/features/eventi/usePosizioneUtente'
import type { Uuid } from '@/types/api'

// Mappa pubblica degli eventi (FE1-04), rotta /map (docs/interfacce.md).
// Con la posizione gli eventi arrivano ordinati per distanza, senza per data:
// la posizione cambia l'ORDINE, mai il numero (requisito della traccia).

/** Centro della mappa finche' non c'e' una posizione: Roma */
const CENTRO_PREDEFINITO = { lat: 41.8967, lng: 12.4822 }

const testiPosizione = {
  'non-chiesta': 'Eventi in ordine di data. Condividi la posizione per vederli dal più vicino.',
  'in-attesa': 'Sto cercando la tua posizione…',
  concessa: 'Eventi dal più vicino al più lontano. La posizione resta nel tuo browser.',
  negata: 'Hai negato la posizione: eventi in ordine di data. Puoi riattivarla dalle impostazioni del browser.',
  'non-disponibile': 'Posizione non disponibile: eventi in ordine di data.',
} as const

export default function MappaEventi() {
  const { stato, posizione, chiedi, dimentica } = usePosizioneUtente()
  // Cambiando posizione RTK Query tiene la lista precedente in data finche' arriva la nuova
  // (isFetching): niente lampeggio, solo l'indicazione "aggiorno l'ordine".
  const {
    data: eventi = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useListaEventiQuery(posizione ?? undefined)
  const [selezionatoId, setSelezionatoId] = useState<Uuid | null>(null)
  // Cercato ogni volta nella lista: se l'evento sparisce (es. dopo un aggiornamento) l'anteprima si chiude
  const selezionato = eventi.find((e) => e.id === selezionatoId) ?? null

  // La mappa si sposta solo quando arriva la posizione o si sceglie un evento dalla lista:
  // non quando si chiude l'anteprima o si clicca un marker (e' gia' sullo schermo).
  const [vista, setVista] = useState({ centro: CENTRO_PREDEFINITO as Coordinate, zoom: 12 })
  useEffect(() => {
    setVista(posizione ? { centro: posizione, zoom: 13 } : { centro: CENTRO_PREDEFINITO, zoom: 12 })
  }, [posizione])

  function scegliDallaLista(id: Uuid) {
    const evento = eventi.find((e) => e.id === id)
    setSelezionatoId(id)
    if (evento) setVista({ centro: { lat: evento.lat, lng: evento.lng }, zoom: 14 })
  }

  // Esc chiude l'anteprima
  useEffect(() => {
    if (!selezionato) return
    const chiudi = (e: KeyboardEvent) => e.key === 'Escape' && setSelezionatoId(null)
    window.addEventListener('keydown', chiudi)
    return () => window.removeEventListener('keydown', chiudi)
  }, [selezionato])

  const marker: MarkerMappa[] = eventi.map((e) => ({
    id: e.id,
    tipo: 'evento',
    stato: e.stato,
    lat: e.lat,
    lng: e.lng,
    etichetta: e.titolo,
    selezionato: e.id === selezionatoId,
    onClick: () => setSelezionatoId(e.id),
  }))

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-space-xs">
        <p className="flex items-center gap-1.5 font-label-code-status text-label-code-status uppercase tracking-wider text-status-in-corso">
          <span className="size-1.5 rounded-full bg-status-in-corso motion-safe:animate-pulse" />
          Eventi in programma e in corso
        </p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Mappa degli eventi</h1>
      </header>

      <section
        aria-live="polite"
        className="flex flex-col gap-space-sm rounded-xl bg-surface-card p-space-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-space-sm">
          <Icon nome={stato === 'concessa' ? 'my_location' : 'location_searching'} size={24} className="mt-0.5 text-secondary" />
          <p className="font-body-md text-body-md text-on-surface-variant">{testiPosizione[stato]}</p>
        </div>
        {stato === 'concessa' ? (
          <Button variant="secondary" size="sm" icona="calendar_month" onClick={dimentica}>
            Ordina per data
          </Button>
        ) : (
          stato !== 'negata' && (
            <Button size="sm" icona="near_me" inCorso={stato === 'in-attesa'} onClick={chiedi}>
              Usa la mia posizione
            </Button>
          )
        )}
      </section>

      {/* Su schermo largo lista a sinistra e mappa a destra (Stitch); su telefono mappa sopra */}
      <div className="grid gap-space-lg lg:grid-cols-[22rem_1fr]">
        <section aria-labelledby="titolo-lista" className="order-2 flex flex-col gap-space-sm lg:order-1">
          <h2
            id="titolo-lista"
            className="flex items-center justify-between px-space-xs font-label-code-status text-label-code-status uppercase text-outline"
          >
            <span>{posizione ? 'Dal più vicino' : 'In ordine di data'}</span>
            {!isLoading && !error && (
              <span aria-live="polite" className="text-secondary">
                {isFetching ? 'Aggiorno l’ordine…' : `${eventi.length} ${eventi.length === 1 ? 'evento' : 'eventi'}`}
              </span>
            )}
          </h2>
          <div className="lg:max-h-[480px] lg:overflow-y-auto lg:pr-space-xs">
            {isLoading ? (
              <div role="status" aria-label="Caricamento degli eventi" className="flex flex-col gap-space-sm">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex flex-col gap-space-sm rounded-xl bg-surface-card p-space-md">
                    <Scheletro className="h-4 w-24" />
                    <Scheletro className="h-5 w-4/5" />
                    <Scheletro className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <MessaggioErrore errore={error} onRiprova={refetch} />
            ) : eventi.length === 0 ? (
              <StatoVuoto
                icona="event_busy"
                titolo="Nessun evento in programma"
                messaggio="Al momento non ci sono eventi programmati o in corso. Torna a dare un'occhiata più tardi."
              />
            ) : (
              <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <ListaEventiMappa eventi={eventi} selezionatoId={selezionatoId} onSeleziona={scegliDallaLista} />
              </div>
            )}
          </div>
        </section>

        <div className="relative order-1 lg:order-2">
          <Mappa
            etichetta="Mappa degli eventi"
            centro={vista.centro}
            zoom={vista.zoom}
            marker={marker}
            className="h-[360px] sm:h-[480px]"
          />
          {selezionato && (
            // In basso a sinistra, sopra l'attribuzione di OpenStreetMap (che deve restare visibile)
            <div className="absolute inset-x-space-sm bottom-9 z-10 sm:right-auto sm:w-[26rem]">
              <AnteprimaEvento evento={selezionato} onChiudi={() => setSelezionatoId(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
