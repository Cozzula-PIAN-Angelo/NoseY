import type { ReactNode } from 'react'
import { Icon } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { distanza, intervallo } from '@/lib/formato'
import type { EventoMappaResponse } from '@/types/api'
import { BadgeStato } from './BadgeStato'

type CardEventoPrincipaleProps = {
  evento: EventoMappaResponse
  /** Pulsanti in basso, come in CardEvento */
  azioni?: ReactNode
}

// Evento "principale" in cima a Esplora eventi: il primo della lista, cioe' il piu' vicino a chi
// ha condiviso la posizione, altrimenti il prossimo in programma (ordine di ListaEventiMappa).
// Stitch non ha una card grande in questa schermata: stessi colori, badge e forme di CardEvento,
// in orizzontale da tablet in su (copertina grande a sinistra), in verticale da telefono.

/** Perche' e' in evidenza: dipende dall'ordine con cui il backend manda gli eventi */
function motivo(evento: EventoMappaResponse): { icona: string; testo: string } {
  if (evento.distanzaKm !== null) return { icona: 'near_me', testo: 'Il più vicino a te' }
  if (evento.stato === 'IN_CORSO') return { icona: 'sensors', testo: 'In corso adesso' }
  return { icona: 'event_upcoming', testo: 'Il prossimo in programma' }
}

export function CardEventoPrincipale({ evento, azioni }: CardEventoPrincipaleProps) {
  const copertina = urlImmagine(evento.copertinaUrl)
  const { icona, testo } = motivo(evento)

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl bg-surface-card shadow-xl md:flex-row">
      <div className="relative aspect-[16/9] bg-surface-container md:aspect-auto md:min-h-80 md:w-3/5 lg:w-2/3">
        {copertina ? (
          // Decorativa, come in CardEvento: il titolo e' accanto
          <img src={copertina} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-inverse-primary/40 to-surface-deep">
            <Icon nome="nightlife" size={56} className="text-primary/70" />
          </div>
        )}
        <BadgeStato stato={evento.stato} className="absolute left-space-sm top-space-sm bg-surface-deep/80 backdrop-blur-md" />
      </div>

      <div className="flex flex-1 flex-col gap-space-sm p-space-md md:justify-center md:p-space-lg">
        <span className="flex w-max items-center gap-space-xs rounded-full bg-surface-glass px-space-sm py-1 backdrop-blur-md">
          <Icon nome={icona} size={16} className="text-accent-gold-piercing" />
          <span className="font-label-code-status text-label-code-status uppercase tracking-wider text-accent-gold-piercing">
            {testo}
          </span>
        </span>
        <h2 className="line-clamp-3 font-headline-lg-mobile text-headline-lg-mobile">{evento.titolo}</h2>
        <p className="flex items-center gap-1 font-body-md text-body-md text-on-surface-variant">
          <Icon nome="event" size={18} />
          {intervallo(evento.dataEvento, evento.dataFine)}
        </p>
        {evento.distanzaKm !== null && (
          <p className="flex items-center gap-1 font-body-md text-body-md text-secondary">
            <Icon nome="near_me" size={18} />
            {distanza(evento.distanzaKm)}
          </p>
        )}
        {azioni && <div className="mt-space-sm flex flex-wrap gap-space-xs">{azioni}</div>}
      </div>
    </article>
  )
}
