import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BadgeStato } from '@/components/eventi'
import { Mappa, STILE_POI, type Coordinate, type MarkerMappa } from '@/components/mappa'
import { Icon, Scheletro, stilePulsante } from '@/components/ui'
import { distanza, intervallo } from '@/lib/formato'
import { distanzaKm } from '@/lib/geo'
import type { EventoMappaResponse, Uuid } from '@/types/api'
import { useVediEventoQuery } from './apiEventi'

type FinestraMappaEventiProps = {
  aperta: boolean
  onChiudi: () => void
  /** Gli eventi trovati nella pagina (con ricerca e periodo gia' applicati) */
  eventi: EventoMappaResponse[]
  /** Posizione dell'utente, se l'ha condivisa: centro della mappa */
  posizione: Coordinate | null
}

/** Centro della mappa senza posizione e senza eventi: Roma */
const ROMA = { lat: 41.8967, lng: 12.4822 }

/** Evento scelto sulla mappa: date, distanza e punti della mappa interna (dal dettaglio) */
function SchedaEvento({ evento }: { evento: EventoMappaResponse }) {
  const { currentData: dettaglio, isFetching } = useVediEventoQuery(evento.id)
  const poi = dettaglio?.poi ?? []

  return (
    <div className="flex flex-col gap-space-sm rounded-xl bg-surface-card p-space-md">
      <div className="flex flex-wrap items-center gap-space-xs">
        <BadgeStato stato={evento.stato} />
        {evento.distanzaKm !== null && (
          <span className="font-label-code-status text-label-code-status text-secondary">{distanza(evento.distanzaKm)}</span>
        )}
      </div>
      <h3 className="font-headline-sm text-headline-sm">{evento.titolo}</h3>
      <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
        <Icon nome="event" size={16} />
        {intervallo(evento.dataEvento, evento.dataFine)}
      </p>

      <div className="flex flex-col gap-1.5">
        <p className="font-label-code-status text-label-code-status uppercase text-outline">Come muoversi</p>
        {!dettaglio && isFetching ? (
          <Scheletro className="h-8 w-full" />
        ) : poi.length === 0 ? (
          <p className="font-body-sm text-body-sm text-outline">Ingressi, uscite e punti di emergenza non ancora indicati.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {poi.map((p) => {
              const stile = STILE_POI[p.tipo]
              return (
                <li key={p.id} className="flex items-center justify-between gap-space-xs rounded-lg bg-surface-container px-space-xs py-1.5">
                  <span className={`flex min-w-0 items-center gap-1.5 font-label-sm text-label-sm ${stile.testo}`}>
                    <Icon nome={stile.icona} size={16} />
                    <span className="truncate">{p.etichetta ?? stile.etichetta}</span>
                  </span>
                  <span className="shrink-0 font-label-code-status text-label-code-status text-outline">
                    {Math.round(distanzaKm(evento, p) * 1000)} m
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Link to={`/events/${evento.id}`} className={stilePulsante({ pieno: true })}>
        <Icon nome="visibility" size={18} />
        Vedi evento
      </Link>
    </div>
  )
}

// Finestra "Mappa degli eventi" di Esplora eventi (FE1-19, passo 2), come il modale "Mappa Radar" di
// Stitch: mappa grande con gli eventi trovati e, accanto (sotto da telefono), l'evento scelto con i
// suoi punti della mappa interna. Basata su <dialog>: blocca la pagina, si chiude con Esc o la X.
// Niente slider del raggio: la posizione cambia solo l'ordine, mai il numero degli eventi.
export function FinestraMappaEventi({ aperta, onChiudi, eventi, posizione }: FinestraMappaEventiProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitolo = useId()
  const [sceltoId, setSceltoId] = useState<Uuid | null>(null)
  // Se l'evento scelto non e' piu' tra i trovati, la scheda torna all'invito a sceglierne uno
  const scelto = eventi.find((e) => e.id === sceltoId) ?? null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (aperta && !dialog.open) dialog.showModal()
    if (!aperta && dialog.open) dialog.close()
  }, [aperta])

  const centro = posizione ?? (eventi[0] ? { lat: eventi[0].lat, lng: eventi[0].lng } : ROMA)
  const marker: MarkerMappa[] = eventi.map((e) => ({
    id: e.id,
    tipo: 'evento',
    stato: e.stato,
    lat: e.lat,
    lng: e.lng,
    etichetta: e.titolo,
    selezionato: e.id === sceltoId,
    onClick: () => setSceltoId(e.id),
  }))

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitolo}
      onCancel={(e) => {
        e.preventDefault()
        onChiudi()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onChiudi()
      }}
      className="m-auto max-h-[92vh] w-[calc(100%-1rem)] max-w-6xl overflow-hidden rounded-2xl bg-surface-card p-0 text-on-surface shadow-2xl backdrop:bg-surface-canvas/80 backdrop:backdrop-blur-md"
    >
      {aperta && (
        <div className="flex max-h-[92vh] flex-col">
          <div className="flex items-center justify-between gap-space-sm border-b border-surface-container bg-surface-container-low px-space-md py-space-sm">
            <div className="flex items-center gap-space-sm">
              <Icon nome="radar" size={24} className="text-secondary" />
              <div>
                <h2 id={idTitolo} className="font-headline-sm text-headline-sm">
                  Mappa degli eventi
                </h2>
                <p className="hidden font-body-sm text-body-sm text-on-surface-variant sm:block">
                  {eventi.length === 1 ? '1 evento' : `${eventi.length} eventi`} trovati · tocca un evento per vederne i dettagli
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onChiudi}
              aria-label="Chiudi la mappa"
              className="rounded-xl bg-surface-container p-space-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <Icon nome="close" size={24} />
            </button>
          </div>

          <div className="grid flex-1 overflow-y-auto lg:grid-cols-12">
            <Mappa
              etichetta="Mappa degli eventi trovati"
              centro={scelto ? { lat: scelto.lat, lng: scelto.lng } : centro}
              zoom={scelto ? 14 : 12}
              marker={marker}
              className="h-[50vh] lg:col-span-8 lg:h-[70vh]"
            />
            <div className="flex flex-col gap-space-md bg-surface-container-low p-space-md lg:col-span-4">
              {scelto ? (
                <SchedaEvento key={scelto.id} evento={scelto} />
              ) : (
                <p className="flex items-start gap-space-xs rounded-xl bg-surface-card p-space-md font-body-md text-body-md text-on-surface-variant">
                  <Icon nome="touch_app" size={20} className="mt-0.5 text-secondary" />
                  {eventi.length === 0
                    ? 'Nessun evento con questi filtri: chiudi la mappa e prova con un’altra ricerca.'
                    : 'Tocca un evento sulla mappa per vederne date, distanza e punti di ingresso e uscita.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
