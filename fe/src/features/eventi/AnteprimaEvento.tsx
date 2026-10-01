import { Link } from 'react-router'
import { BadgeStato } from '@/components/eventi'
import { Icon } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { distanza, intervallo } from '@/lib/formato'
import type { EventoMappaResponse } from '@/types/api'

type AnteprimaEventoProps = {
  evento: EventoMappaResponse
  onChiudi: () => void
}

// Anteprima di un evento aperta dal marker della mappa (FE1-04): copertina, titolo, data
// e «Vedi evento». Sta sopra la mappa, in basso.
export function AnteprimaEvento({ evento, onChiudi }: AnteprimaEventoProps) {
  const copertina = urlImmagine(evento.copertinaUrl)

  return (
    <article
      aria-label={`Anteprima: ${evento.titolo}`}
      className="flex overflow-hidden rounded-xl bg-surface-card shadow-2xl motion-safe:animate-[entrata-avviso_200ms_ease-out]"
    >
      <div className="relative w-28 shrink-0 sm:w-36">
        {copertina ? (
          // Decorativa: EventoMappaResponse non porta la didascalia della copertina, e il titolo e' accanto
          <img src={copertina} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-inverse-primary/40 to-surface-deep">
            <Icon nome="nightlife" size={32} className="text-primary/70" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-space-xs p-space-md">
        <div className="flex items-start justify-between gap-space-sm">
          <BadgeStato stato={evento.stato} />
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi l'anteprima"
            className="-mr-1 -mt-1 rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <Icon nome="close" size={18} />
          </button>
        </div>
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
        <Link
          to={`/events/${evento.id}`}
          className="mt-space-xs inline-flex items-center gap-1 self-start rounded-lg bg-primary px-space-md py-space-xs font-label-btn text-label-btn text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
        >
          Vedi evento
          <Icon nome="arrow_forward" size={18} />
        </Link>
      </div>
    </article>
  )
}
