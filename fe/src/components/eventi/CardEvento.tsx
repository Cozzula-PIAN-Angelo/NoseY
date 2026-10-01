import type { ReactNode } from 'react'
import { Icon } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { distanza, intervallo } from '@/lib/formato'
import type { EventoMappaResponse } from '@/types/api'
import { BadgeStato } from './BadgeStato'

type CardEventoProps = {
  evento: EventoMappaResponse
  /** Pulsanti in basso, es. «Vedi evento» e «Modifica» (concordato in TEAM-02) */
  azioni?: ReactNode
}

// Card di un evento nelle liste (concordata in TEAM-02, docs/interfacce.md), come le card
// "Eventi caldi" di Stitch: copertina con lo stato, titolo, date, eventuale distanza.
export function CardEvento({ evento, azioni }: CardEventoProps) {
  const copertina = urlImmagine(evento.copertinaUrl)

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl bg-surface-card shadow-lg">
      <div className="relative aspect-[16/9] bg-surface-container">
        {copertina ? (
          // Decorativa: EventoMappaResponse non porta la didascalia della copertina, e il titolo e' subito sotto
          <img src={copertina} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-inverse-primary/40 to-surface-deep">
            <Icon nome="nightlife" size={40} className="text-primary/70" />
          </div>
        )}
        <BadgeStato stato={evento.stato} className="absolute left-space-sm top-space-sm bg-surface-deep/80 backdrop-blur-md" />
      </div>

      <div className="flex flex-1 flex-col gap-space-xs p-space-md">
        <h3 className="line-clamp-2 font-headline-sm text-headline-sm">{evento.titolo}</h3>
        <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
          <Icon nome="event" size={16} />
          {intervallo(evento.dataEvento, evento.dataFine)}
        </p>
        {evento.distanzaKm !== null && (
          <p className="flex items-center gap-1 font-body-sm text-body-sm text-secondary">
            <Icon nome="near_me" size={16} />
            {distanza(evento.distanzaKm)}
          </p>
        )}
        {azioni && <div className="mt-auto flex flex-wrap gap-space-xs pt-space-sm">{azioni}</div>}
      </div>
    </article>
  )
}
