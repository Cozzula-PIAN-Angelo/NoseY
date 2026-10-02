import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BadgeStato } from '@/components/eventi'
import { Icon, MessaggioErrore, Scheletro, stilePulsante } from '@/components/ui'
import { useVediEventoQuery } from '@/features/eventi/apiEventi'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import { intervallo } from '@/lib/formato'
import type { ChatResponse } from '@/types/api'
import { useListaAmiciQuery } from './apiSocial'

// Colonna destra della chat (card "Extra: chat a tre colonne", passo 2), come la card "Shared Event"
// della schermata Stitch "Community, Amicizie & Chat Live": l'evento in cui ci si e' conosciuti, con
// copertina, stato, date e numero di partecipanti. Niente check-in, "prossimita' radar" o zone: l'API
// non li ha.
// ChatResponse non porta l'evento: arriva dall'amicizia con lo stesso chatId (ListaAmici, gia' in
// cache se si e' passati da /friends), poi da VediEvento. Se l'amicizia non c'e' piu' (chat in sola
// lettura) l'evento non si puo' ricavare: al suo posto un avviso.

function Riquadro({ children }: { children: ReactNode }) {
  return <div className="flex flex-col overflow-hidden rounded-xl bg-surface-glass shadow-xl backdrop-blur-2xl">{children}</div>
}

function Evento({ eventoId }: { eventoId: string }) {
  const { currentData: evento, isFetching, error, refetch } = useVediEventoQuery(eventoId)

  if (!evento && isFetching) return <Scheletro className="h-72 rounded-xl" />
  if (error) return <MessaggioErrore errore={error} onRiprova={refetch} />
  if (!evento) return null

  const foto = evento.foto.find((f) => f.copertina) ?? evento.foto[0]
  const copertina = foto ? urlImmagine(foto.url) : null

  return (
    <Riquadro>
      <div className="relative h-36 bg-surface-container">
        {copertina ? (
          // Decorativa: il titolo e' scritto sopra
          <img src={copertina} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-inverse-primary/40 to-surface-deep">
            <Icon nome="nightlife" size={40} className="text-primary/70" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-surface-card/40 to-transparent" />
        <BadgeStato stato={evento.stato} className="absolute left-space-sm top-space-sm backdrop-blur-md" />
        <p className="absolute bottom-2 inset-x-space-md truncate font-headline-sm text-headline-sm text-on-surface">{evento.titolo}</p>
      </div>
      <div className="flex flex-col gap-space-sm bg-surface-card p-space-md">
        <p className="font-label-code-status text-label-code-status uppercase text-secondary">Vi siete conosciuti qui</p>
        <p className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
          <Icon nome="event" size={16} className="shrink-0" />
          {intervallo(evento.dataEvento, evento.dataFine)}
        </p>
        <p className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
          <Icon nome="groups" size={16} className="shrink-0" />
          {evento.numeroPartecipanti === 1 ? '1 partecipante' : `${evento.numeroPartecipanti} partecipanti`}
        </p>
        <Link to={`/events/${evento.id}`} className={cx(stilePulsante({ variant: 'secondary', size: 'sm' }), 'self-start')}>
          <Icon nome="visibility" size={16} />
          Vedi evento
        </Link>
      </div>
    </Riquadro>
  )
}

export function EventoChat({ chat }: { chat: ChatResponse }) {
  const { data: amici, isFetching, error, refetch } = useListaAmiciQuery()
  const eventoId = amici?.find((a) => a.chatId === chat.id)?.eventoId

  if (!amici && isFetching) return <Scheletro className="h-72 rounded-xl" />
  if (error && !amici) return <MessaggioErrore errore={error} onRiprova={refetch} />
  if (eventoId) return <Evento eventoId={eventoId} />

  return (
    <Riquadro>
      <p className="flex items-start gap-space-xs p-space-md font-body-sm text-body-sm text-on-surface-variant">
        <Icon nome="info" size={18} className="mt-0.5 shrink-0 text-tertiary" />
        Non siete più amici: l’evento in cui vi siete conosciuti non è più disponibile qui.
      </p>
    </Riquadro>
  )
}
