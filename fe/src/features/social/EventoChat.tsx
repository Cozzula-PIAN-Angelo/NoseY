import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BadgeStato } from '@/components/eventi'
import { Avatar, Icon, MessaggioErrore, Scheletro, stilePulsante } from '@/components/ui'
import { useListaPartecipantiQuery, useVediEventoQuery } from '@/features/eventi/apiEventi'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import { leggiErrore } from '@/lib/errori'
import { intervallo } from '@/lib/formato'
import type { ChatResponse, Uuid } from '@/types/api'
import { useListaAmiciQuery } from './apiSocial'
import { PulsanteAmicizia } from './PulsanteAmicizia'

// Colonna destra della chat (card "Extra: chat a tre colonne", passo 2), come la card "Shared Event"
// della schermata Stitch "Community, Amicizie & Chat Live": l'evento in cui ci si e' conosciuti, con
// copertina, stato, date e numero di partecipanti. Niente check-in, "prossimita' radar" o zone: l'API
// non li ha.
// ChatResponse non porta l'evento: arriva dall'amicizia con lo stesso chatId (ListaAmici, gia' in
// cache se si e' passati da /friends), poi da VediEvento. Se l'amicizia non c'e' piu' (chat in sola
// lettura) l'evento non si puo' ricavare: al suo posto un avviso.
// Sotto, il riquadro "Partecipanti" di Stitch (passo 3): le altre persone iscritte (ListaPartecipanti,
// tranne l'amico della chat), ognuna con il pulsante amicizia, al massimo MASSIMO_PARTECIPANTI; le
// altre nella pagina dei partecipanti. Senza ticket (es. iscrizione cancellata) la lista non si vede.

/** Partecipanti mostrati nella colonna; tutti gli altri in /events/:id/participants */
const MASSIMO_PARTECIPANTI = 5

function Riquadro({ children }: { children: ReactNode }) {
  return <div className="flex flex-col overflow-hidden rounded-xl bg-surface-glass shadow-xl backdrop-blur-2xl">{children}</div>
}

function Partecipanti({ eventoId, amicoId }: { eventoId: Uuid; amicoId: Uuid }) {
  const { currentData: partecipanti, isFetching, error, refetch } = useListaPartecipantiQuery(eventoId)
  const altri = partecipanti?.filter((p) => p.utente.id !== amicoId)

  let contenuto
  if (!partecipanti && isFetching) {
    contenuto = <Scheletro className="h-32" />
  } else if (error) {
    contenuto =
      leggiErrore(error).codice === 'NESSUN_TICKET' ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          I partecipanti li vede solo chi è iscritto all’evento o lo organizza.
        </p>
      ) : (
        <MessaggioErrore errore={error} onRiprova={refetch} />
      )
  } else if (altri && altri.length === 0) {
    contenuto = <p className="font-body-sm text-body-sm text-on-surface-variant">Non ci sono altre persone iscritte.</p>
  } else if (altri) {
    contenuto = (
      <>
        <ul className="flex flex-col gap-space-sm">
          {altri.slice(0, MASSIMO_PARTECIPANTI).map(({ utente, proprietario, statoAmicizia, amiciziaId, chatId }) => (
            <li
              key={utente.id}
              className="flex flex-wrap items-center justify-between gap-space-xs rounded-lg bg-surface-container-low p-space-sm"
            >
              <div className={cx('flex min-w-0 flex-1 items-center gap-space-sm', !utente.attivo && 'opacity-60')}>
                <Avatar utente={utente} dimensione="sm" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-label-btn text-label-btn text-on-surface">
                    {utente.nome} {utente.cognome}
                  </span>
                  {proprietario && (
                    <span className="font-label-code-status text-label-code-status uppercase text-primary">Organizza l’evento</span>
                  )}
                </div>
              </div>
              <PulsanteAmicizia utente={utente} statoAmicizia={statoAmicizia} amiciziaId={amiciziaId} chatId={chatId} eventoId={eventoId} />
            </li>
          ))}
        </ul>
        {altri.length > MASSIMO_PARTECIPANTI && (
          <Link to={`/events/${eventoId}/participants`} className={cx(stilePulsante({ variant: 'ghost', size: 'sm' }), 'self-start')}>
            Vedi tutti ({altri.length})
          </Link>
        )}
      </>
    )
  }

  return (
    <section
      aria-labelledby="titolo-partecipanti"
      className="flex flex-col gap-space-sm rounded-xl bg-surface-glass p-space-md shadow-xl backdrop-blur-2xl"
    >
      <h2 id="titolo-partecipanti" className="flex items-center gap-space-xs font-headline-sm text-headline-sm text-on-surface">
        <Icon nome="groups" size={20} className="text-primary" />
        Partecipanti
      </h2>
      {contenuto}
    </section>
  )
}

function Evento({ eventoId, amicoId }: { eventoId: Uuid; amicoId: Uuid }) {
  const { currentData: evento, isFetching, error, refetch } = useVediEventoQuery(eventoId)

  if (!evento && isFetching) return <Scheletro className="h-72 rounded-xl" />
  if (error) return <MessaggioErrore errore={error} onRiprova={refetch} />
  if (!evento) return null

  const foto = evento.foto.find((f) => f.copertina) ?? evento.foto[0]
  const copertina = foto ? urlImmagine(foto.url) : null

  return (
    <div className="flex flex-col gap-space-md">
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
      <Partecipanti eventoId={evento.id} amicoId={amicoId} />
    </div>
  )
}

export function EventoChat({ chat }: { chat: ChatResponse }) {
  const { data: amici, isFetching, error, refetch } = useListaAmiciQuery()
  const eventoId = amici?.find((a) => a.chatId === chat.id)?.eventoId

  if (!amici && isFetching) return <Scheletro className="h-72 rounded-xl" />
  if (error && !amici) return <MessaggioErrore errore={error} onRiprova={refetch} />
  if (eventoId) return <Evento eventoId={eventoId} amicoId={chat.amico.id} />

  return (
    <Riquadro>
      <p className="flex items-start gap-space-xs p-space-md font-body-sm text-body-sm text-on-surface-variant">
        <Icon nome="info" size={18} className="mt-0.5 shrink-0 text-tertiary" />
        Non siete più amici: l’evento in cui vi siete conosciuti non è più disponibile qui.
      </p>
    </Riquadro>
  )
}
