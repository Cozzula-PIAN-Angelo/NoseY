import { BadgeStato } from '@/components/eventi'
import { Caricamento, Icon, MessaggioErrore, StatoVuoto } from '@/components/ui'
import { useVediEventoQuery } from '@/features/eventi/apiEventi'
import { ArtistiEvento } from '@/features/eventi/ArtistiEvento'
import { AzioniEvento } from '@/features/eventi/AzioniEvento'
import { GalleriaFoto } from '@/features/eventi/GalleriaFoto'
import { MappaInterna } from '@/features/eventi/MappaInterna'
import { urlImmagine } from '@/lib/api'
import { leggiErrore } from '@/lib/errori'
import { intervallo } from '@/lib/formato'
import type { StatoEvento, UtentePubblicoResponse, Uuid } from '@/types/api'

// Pagina dell'evento (FE1-05), rotta /events/:id (docs/interfacce.md). Pubblica: con il login
// il backend aggiunge sonoProprietario e sonoIscritto. Finche' non c'e' il router (FE2-01)
// l'id arriva come prop; poi sara' useParams().

/** Avviso in cima alla pagina per gli eventi annullati o conclusi */
function AvvisoStato({ stato, motivo }: { stato: StatoEvento; motivo: string | null }) {
  if (stato === 'ANNULLATO') {
    return (
      <div role="status" className="flex items-start gap-space-sm rounded-xl bg-status-annullato/10 p-space-md">
        <Icon nome="event_busy" size={24} className="text-status-annullato" />
        <div className="flex flex-col gap-0.5">
          <p className="font-label-btn text-label-btn text-on-surface">Questo evento è stato annullato</p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {motivo ? `Motivo: ${motivo}` : "L'organizzatore non ha indicato un motivo."}
          </p>
        </div>
      </div>
    )
  }
  if (stato === 'CONCLUSO') {
    return (
      <p role="status" className="flex items-center gap-space-xs rounded-xl bg-surface-card p-space-md font-body-md text-body-md text-on-surface-variant">
        <Icon nome="history" size={20} className="text-outline" />
        Questo evento è concluso.
      </p>
    )
  }
  return null
}

function Proprietario({ utente }: { utente: UtentePubblicoResponse }) {
  const avatar = urlImmagine(utente.immagineProfilo)
  const iniziali = `${utente.nome[0] ?? ''}${utente.cognome[0] ?? ''}`.toUpperCase()
  return (
    <div className="flex items-center gap-space-sm">
      {avatar ? (
        <img src={avatar} alt="" className="size-10 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-surface-container-high font-label-btn text-label-btn text-primary">
          {iniziali}
        </span>
      )}
      <div className="flex flex-col">
        <span className="font-label-code-status text-label-code-status uppercase text-outline">Organizzato da</span>
        <span className="font-label-btn text-label-btn text-on-surface">
          {utente.nome} {utente.cognome}
        </span>
      </div>
    </div>
  )
}

export default function DettaglioEvento({ id }: { id: Uuid }) {
  // currentData (non data): passando a un altro evento non si vede, nemmeno per un attimo, quello di prima
  const { currentData: evento, isFetching, error, refetch } = useVediEventoQuery(id)

  if (!evento && isFetching) return <Caricamento riquadro testo="Carico l'evento..." />
  if (error) {
    return leggiErrore(error).codice === 'NON_TROVATO' ? (
      <StatoVuoto
        icona="event_busy"
        titolo="Evento non trovato"
        messaggio="L'evento non esiste o il collegamento non è corretto."
      />
    ) : (
      <MessaggioErrore errore={error} onRiprova={refetch} />
    )
  }
  if (!evento) return null

  return (
    <article className="flex flex-col gap-space-lg">
      <AvvisoStato stato={evento.stato} motivo={evento.motivoAnnullamento} />
      <div className="grid gap-space-lg lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-space-lg">
          <GalleriaFoto key={evento.id} foto={evento.foto} titoloEvento={evento.titolo} />

          <section aria-labelledby="titolo-descrizione" className="flex flex-col gap-space-sm">
            <h2 id="titolo-descrizione" className="font-headline-sm text-headline-sm">
              Descrizione
            </h2>
            {evento.descrizione ? (
              <p className="whitespace-pre-line font-body-lg text-body-lg text-on-surface-variant">{evento.descrizione}</p>
            ) : (
              <p className="font-body-md text-body-md text-outline">L'organizzatore non ha ancora scritto una descrizione.</p>
            )}
          </section>

          <section aria-labelledby="titolo-lineup" className="flex flex-col gap-space-sm">
            <h2 id="titolo-lineup" className="font-headline-sm text-headline-sm">
              Line-up
            </h2>
            <ArtistiEvento artisti={evento.artisti} />
          </section>

          <section aria-labelledby="titolo-mappa-interna" className="flex flex-col gap-space-sm">
            <h2 id="titolo-mappa-interna" className="font-headline-sm text-headline-sm">
              Come muoversi
            </h2>
            <MappaInterna evento={evento} />
          </section>
        </div>

        <aside className="flex flex-col gap-space-md lg:sticky lg:top-space-lg lg:self-start">
          <div className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg">
            <BadgeStato stato={evento.stato} className="self-start" />
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile">{evento.titolo}</h1>
            <p className="flex items-start gap-space-xs font-body-md text-body-md text-on-surface">
              <Icon nome="event" size={20} className="mt-0.5 text-secondary" />
              {intervallo(evento.dataEvento, evento.dataFine)}
            </p>
            <Proprietario utente={evento.proprietario} />
          </div>
          <div className="rounded-2xl bg-surface-card p-space-lg">
            <AzioniEvento evento={evento} />
          </div>
        </aside>
      </div>
    </article>
  )
}
