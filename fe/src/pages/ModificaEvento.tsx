import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Caricamento, MessaggioErrore, StatoVuoto, stilePulsante, useAvviso } from '@/components/ui'
import { useModificaEventoMutation, useVediEventoQuery } from '@/features/eventi/apiEventi'
import { FormEvento, type ValoriEvento } from '@/features/eventi/FormEvento'
import { modificheEvento, valoriDaEvento } from '@/features/eventi/modificheEvento'
import { leggiErrore } from '@/lib/errori'

// Modifica di un evento (FE1-07), rotta /events/:id/edit (solo con il login, solo il proprietario).
// Qui arriveranno anche foto (FE1-09), mappa interna (FE1-10), artisti (FE1-11) e annullamento (FE1-13).

function Contenitore({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      {children}
    </div>
  )
}

export default function ModificaEvento() {
  const { id = '' } = useParams()
  const { currentData: evento, isFetching, error, refetch } = useVediEventoQuery(id)
  const [modifica, { isLoading }] = useModificaEventoMutation()
  const avviso = useAvviso()
  const navigate = useNavigate()

  if (!evento && isFetching) return <Contenitore><Caricamento riquadro testo="Carico l'evento..." /></Contenitore>
  if (error) {
    return (
      <Contenitore>
        {leggiErrore(error).codice === 'NON_TROVATO' ? (
          <StatoVuoto icona="event_busy" titolo="Evento non trovato" messaggio="L'evento non esiste o il collegamento non è corretto." />
        ) : (
          <MessaggioErrore errore={error} onRiprova={refetch} />
        )}
      </Contenitore>
    )
  }
  if (!evento) return null

  // Solo il proprietario, e solo finche' l'evento e' programmato o in corso (altrimenti 403 / 409)
  const modificabile = evento.stato === 'PROGRAMMATO' || evento.stato === 'IN_CORSO'
  if (!evento.sonoProprietario || !modificabile) {
    return (
      <Contenitore>
        <StatoVuoto
          icona="lock"
          titolo="Evento non modificabile"
          messaggio={
            !evento.sonoProprietario
              ? "Solo chi ha creato l'evento può modificarlo."
              : `L'evento è ${evento.stato === 'ANNULLATO' ? 'annullato' : 'concluso'}: non si può più modificare.`
          }
          azione={
            <Link to={`/events/${evento.id}`} className={stilePulsante({ variant: 'secondary' })}>
              Torna all'evento
            </Link>
          }
        />
      </Contenitore>
    )
  }

  const iniziali = valoriDaEvento(evento)

  async function invia(nuovi: ValoriEvento) {
    const modifiche = modificheEvento(iniziali, nuovi)
    if (Object.keys(modifiche).length === 0) {
      // Niente da inviare: il backend risponderebbe 400 RICHIESTA_VUOTA
      avviso.info('Nessuna modifica', 'Non hai cambiato nulla.')
      return
    }
    try {
      await modifica({ id, dati: modifiche }).unwrap()
      avviso.successo('Evento aggiornato', 'I partecipanti riceveranno una notifica con le modifiche.')
      navigate(`/events/${id}`)
    } catch (errore) {
      avviso.erroreApi(errore)
    }
  }

  return (
    <Contenitore>
      <header className="flex flex-col gap-space-xs">
        <Link to={`/events/${evento.id}`} className="self-start font-label-sm text-label-sm text-secondary hover:underline">
          ← Torna all'evento
        </Link>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Modifica evento</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{evento.titolo}</p>
      </header>
      <div className="rounded-2xl bg-surface-card p-space-md sm:p-space-lg">
        <FormEvento
          key={evento.id}
          iniziali={iniziali}
          testoInvio="Salva modifiche"
          inCorso={isLoading}
          inizioBloccato={evento.stato === 'IN_CORSO'}
          onInvia={invia}
        />
      </div>
    </Contenitore>
  )
}
