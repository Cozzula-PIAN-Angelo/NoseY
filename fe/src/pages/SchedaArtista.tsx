import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Caricamento, Icon, MessaggioErrore, StatoVuoto, stilePulsante } from '@/components/ui'
import { useVediArtistaQuery } from '@/features/eventi/apiEventi'
import { urlImmagine } from '@/lib/api'
import { leggiErrore } from '@/lib/errori'

// Scheda di un artista (FE1-19, passo 6), rotta /artists/:artistaId (pubblica). VediArtista restituisce
// anche gli artisti fuori catalogo (disattivati): restano negli eventi dove c'erano, e da li' si arriva
// qui. L'API non dice in quali eventi suona un artista: niente "prossime date" (proposta per il backend:
// GET /api/artists/{id}/events), al loro posto il collegamento a Esplora eventi.

function Contenitore({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">{children}</div>
}

export default function SchedaArtista() {
  const { artistaId = '' } = useParams()
  const { currentData: artista, isFetching, error, refetch } = useVediArtistaQuery(artistaId)

  const indietro = (
    <Link to="/artists" className="self-start font-label-sm text-label-sm text-secondary hover:underline">
      ← Torna al catalogo
    </Link>
  )

  if (!artista && isFetching) {
    return (
      <Contenitore>
        {indietro}
        <Caricamento riquadro testo="Carico l'artista..." />
      </Contenitore>
    )
  }
  if (error) {
    return (
      <Contenitore>
        {indietro}
        {leggiErrore(error).codice === 'NON_TROVATO' ? (
          <StatoVuoto
            icona="person_off"
            titolo="Artista non trovato"
            messaggio="L'artista non esiste o il collegamento non è corretto."
            azione={
              <Link to="/artists" className={stilePulsante({ variant: 'secondary' })}>
                Vai al catalogo
              </Link>
            }
          />
        ) : (
          <MessaggioErrore errore={error} onRiprova={refetch} />
        )}
      </Contenitore>
    )
  }
  if (!artista) return null

  const immagine = urlImmagine(artista.immagineUrl)

  return (
    <Contenitore>
      {indietro}
      <article className="grid gap-space-lg overflow-hidden rounded-2xl bg-surface-card shadow-xl md:grid-cols-[18rem_1fr]">
        {/* Da telefono 4:3, cosi' nome e stato restano nel primo schermo */}
        <div className="aspect-[4/3] bg-surface-container md:aspect-auto md:min-h-72">
          {immagine ? (
            <img src={immagine} alt={`Foto di ${artista.nome}`} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-inverse-primary/40 to-surface-deep">
              <Icon nome="queue_music" size={64} className="text-primary/70" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-space-md p-space-lg md:pl-0">
          {artista.attivo ? (
            <span className="flex w-max items-center gap-1 rounded-full bg-status-in-corso/15 px-space-sm py-0.5 font-label-code-status text-label-code-status uppercase text-status-in-corso">
              <span className="size-1.5 rounded-full bg-status-in-corso" />
              Nel catalogo
            </span>
          ) : (
            <span className="flex w-max items-center gap-1 rounded-full bg-surface-container-high px-space-sm py-0.5 font-label-code-status text-label-code-status uppercase text-outline">
              Fuori catalogo
            </span>
          )}
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">{artista.nome}</h1>

          {!artista.attivo && (
            <p role="status" className="flex items-start gap-space-xs rounded-xl bg-surface-container-low p-space-md font-body-md text-body-md text-on-surface-variant">
              <Icon nome="info" size={20} className="mt-0.5 shrink-0 text-tertiary" />
              Non è più nel catalogo: non si può aggiungere a nuovi eventi, ma resta nella line-up degli eventi dove c’era già.
            </p>
          )}

          <div className="mt-auto flex flex-col gap-space-xs">
            <p className="font-body-sm text-body-sm text-outline">Per vedere dove suona, cerca gli eventi in programma.</p>
            <Link to="/events" className={`${stilePulsante({ variant: 'secondary' })} self-start`}>
              <Icon nome="explore" size={18} />
              Esplora gli eventi
            </Link>
          </div>
        </div>
      </article>
    </Contenitore>
  )
}
