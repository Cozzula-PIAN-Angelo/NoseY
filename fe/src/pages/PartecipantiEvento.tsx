import { Link, useParams } from 'react-router'
import { Avatar, Caricamento, Icon, MessaggioErrore, StatoVuoto } from '@/components/ui'
import { useListaPartecipantiQuery, useVediEventoQuery } from '@/features/eventi/apiEventi'
import { PulsanteAmicizia } from '@/features/social/PulsanteAmicizia'
import { leggiErrore } from '@/lib/errori'
import { cx } from '@/lib/cx'
import type { PartecipanteResponse } from '@/types/api'

// Lista dei partecipanti (FE1-14), rotta /events/:id/participants (solo con il login), come la
// colonna "Partecipanti" della schermata Stitch "Community, Amicizie & Chat Live". La vede chi ha un
// ticket o chi organizza l'evento. Il backend mette l'organizzatore in cima ed esclude chi guarda.
// In ogni riga il pulsante amicizia di FE2-09: la richiesta parte da questo evento in comune.

function RigaPartecipante({ partecipante, eventoId }: { partecipante: PartecipanteResponse; eventoId: string }) {
  const { utente, proprietario, statoAmicizia, amiciziaId, chatId } = partecipante
  return (
    <li
      className={cx(
        'flex flex-wrap items-center justify-between gap-space-sm rounded-lg p-space-sm',
        proprietario ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-surface-container-low',
      )}
    >
      <div className={cx('flex min-w-0 items-center gap-space-sm', !utente.attivo && 'opacity-60')}>
        <Avatar utente={utente} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-label-btn text-label-btn text-on-surface">
            {utente.nome} {utente.cognome}
          </span>
          {proprietario && (
            <span className="flex items-center gap-1 font-label-code-status text-label-code-status uppercase text-primary">
              <Icon nome="verified" size={14} piena />
              Organizza l'evento
            </span>
          )}
          {!utente.attivo && (
            <span className="font-label-code-status text-label-code-status uppercase text-outline">Account non più attivo</span>
          )}
        </div>
      </div>
      <PulsanteAmicizia utente={utente} statoAmicizia={statoAmicizia} amiciziaId={amiciziaId} chatId={chatId} eventoId={eventoId} />
    </li>
  )
}

export default function PartecipantiEvento() {
  const { id = '' } = useParams()
  const { currentData: evento } = useVediEventoQuery(id)
  const { currentData: partecipanti, isFetching, error, refetch } = useListaPartecipantiQuery(id)

  let contenuto
  if (!partecipanti && isFetching) {
    contenuto = <Caricamento riquadro testo="Carico i partecipanti..." />
  } else if (error) {
    contenuto =
      leggiErrore(error).codice === 'NON_TROVATO' ? (
        <StatoVuoto icona="event_busy" titolo="Evento non trovato" messaggio="L'evento non esiste o il collegamento non è corretto." />
      ) : (
        <MessaggioErrore errore={error} onRiprova={refetch} />
      )
  } else if (partecipanti && partecipanti.length === 0) {
    contenuto = (
      <StatoVuoto
        icona="group"
        titolo="Ancora nessuna persona iscritta"
        messaggio="Quando qualcuno si iscrive all'evento, lo trovi qui."
      />
    )
  } else if (partecipanti) {
    contenuto = (
      <ul className="flex flex-col gap-space-sm">
        {partecipanti.map((p) => (
          <RigaPartecipante key={p.utente.id} partecipante={p} eventoId={id} />
        ))}
      </ul>
    )
  }

  const persone = partecipanti?.filter((p) => !p.proprietario).length

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <Link to={`/events/${id}`} className="self-start font-label-sm text-label-sm text-secondary hover:underline">
          ← Torna all'evento
        </Link>
        <h1 className="flex items-center gap-space-xs font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">
          <Icon nome="groups" size={32} className="text-primary" />
          Partecipanti
        </h1>
        {evento && <p className="font-body-md text-body-md text-on-surface-variant">{evento.titolo}</p>}
        {persone !== undefined && persone > 0 && (
          <p className="font-label-code-status text-label-code-status uppercase text-outline">
            {persone === 1 ? '1 persona iscritta' : `${persone} persone iscritte`}
            {evento?.sonoIscritto && ' oltre a te'}
          </p>
        )}
      </header>
      {contenuto}
    </div>
  )
}
