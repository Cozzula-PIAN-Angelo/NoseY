import { BadgeStato } from '@/components/eventi'
import { Icon } from '@/components/ui'
import { cx } from '@/lib/cx'
import { dataOra, distanza } from '@/lib/formato'
import type { EventoMappaResponse, Uuid } from '@/types/api'

type ListaEventiMappaProps = {
  eventi: EventoMappaResponse[]
  selezionatoId: Uuid | null
  onSeleziona: (id: Uuid) => void
}

// Lista accanto alla mappa (FE1-04), come le card "Target rilevati" di Stitch.
// L'ordine e' quello del backend: per distanza con la posizione, per data senza.
export function ListaEventiMappa({ eventi, selezionatoId, onSeleziona }: ListaEventiMappaProps) {
  return (
    <ol aria-label="Eventi" className="flex flex-col gap-space-sm">
      {eventi.map((e) => {
        const attivo = e.id === selezionatoId
        return (
          <li key={e.id}>
            <button
              type="button"
              aria-pressed={attivo}
              onClick={() => onSeleziona(e.id)}
              className={cx(
                'flex w-full flex-col gap-space-xs rounded-xl p-space-md text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                attivo ? 'bg-surface-container-high shadow-lg ring-1 ring-primary/40' : 'bg-surface-card hover:bg-surface-container',
              )}
            >
              <span className="flex items-start justify-between gap-space-sm">
                <BadgeStato stato={e.stato} />
                {e.distanzaKm !== null && (
                  <span className="flex shrink-0 items-center gap-0.5 font-label-code-status text-label-code-status text-secondary">
                    <Icon nome="near_me" size={14} />
                    {distanza(e.distanzaKm)}
                  </span>
                )}
              </span>
              <span className="font-headline-sm text-headline-sm leading-tight text-on-surface">{e.titolo}</span>
              <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                <Icon nome="event" size={16} />
                {dataOra(e.dataEvento)}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
