import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Caricamento, MessaggioErrore, StatoVuoto, stilePulsante, useAvviso } from '@/components/ui'
import { useModificaEventoMutation, useVediEventoQuery } from '@/features/eventi/apiEventi'
import { CaricaFoto } from '@/features/eventi/CaricaFoto'
import { EditorMappaInterna } from '@/features/eventi/EditorMappaInterna'
import { GestioneArtisti } from '@/features/eventi/GestioneArtisti'
import { erroriSuiCampi } from '@/features/eventi/erroriEvento'
import { FormEvento, type ErroriEvento, type ValoriEvento } from '@/features/eventi/FormEvento'
import { GestioneFoto } from '@/features/eventi/GestioneFoto'
import { MiglioraDescrizioneAI } from '@/features/eventi/MiglioraDescrizioneAI'
import { modificheEvento, valoriDaEvento } from '@/features/eventi/modificheEvento'
import { leggiErrore } from '@/lib/errori'

// Modifica di un evento (FE1-07), rotta /events/:id/edit (solo con il login, solo il proprietario).
// Sezioni: dati dell'evento (FE1-07), foto (#foto, FE1-09), line-up (#lineup, FE1-11),
// mappa interna (#mappa-interna, FE1-10); sotto la descrizione il miglioramento con l'AI (FE1-12).

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
  const [erroriServer, setErroriServer] = useState<ErroriEvento>({})
  const { hash } = useLocation()

  // Dopo la creazione si arriva con #foto: il router non scorre da solo fino all'ancora
  const caricato = evento !== undefined
  useEffect(() => {
    if (caricato && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [caricato, hash])

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
      const campi = erroriSuiCampi(errore, modifiche)
      if (campi) {
        setErroriServer(campi)
        avviso.attenzione('Controlla i campi evidenziati', 'Alcune modifiche non sono possibili: trovi la spiegazione sotto ogni campo.')
      } else avviso.erroreApi(errore)
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
          erroriServer={erroriServer}
          inizioBloccato={evento.stato === 'IN_CORSO'}
          onInvia={invia}
          sottoDescrizione={(descrizione, cambiaDescrizione) => (
            <MiglioraDescrizioneAI eventoId={evento.id} foto={evento.foto} descrizione={descrizione} onAccettata={cambiaDescrizione} />
          )}
        />
      </div>

      <section id="foto" aria-labelledby="titolo-foto" className="flex scroll-mt-20 flex-col gap-space-md rounded-2xl bg-surface-card p-space-md sm:p-space-lg">
        <h2 id="titolo-foto" className="font-headline-sm text-headline-sm">
          Foto
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          La prima foto diventa la copertina. Le foto servono anche per migliorare la descrizione con l'AI.
        </p>
        <CaricaFoto eventoId={evento.id} numeroFoto={evento.foto.length} />
        <GestioneFoto eventoId={evento.id} foto={evento.foto} />
      </section>

      <section
        id="lineup"
        aria-labelledby="titolo-lineup"
        className="flex scroll-mt-20 flex-col gap-space-md rounded-2xl bg-surface-card p-space-md sm:p-space-lg"
      >
        <h2 id="titolo-lineup" className="font-headline-sm text-headline-sm">
          Line-up
        </h2>
        <GestioneArtisti evento={evento} />
      </section>

      <section
        id="mappa-interna"
        aria-labelledby="titolo-mappa-interna"
        className="flex scroll-mt-20 flex-col gap-space-md rounded-2xl bg-surface-card p-space-md sm:p-space-lg"
      >
        <h2 id="titolo-mappa-interna" className="font-headline-sm text-headline-sm">
          Mappa interna
        </h2>
        <EditorMappaInterna evento={evento} />
      </section>
    </Contenitore>
  )
}
