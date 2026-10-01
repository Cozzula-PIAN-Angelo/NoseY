import { CardEvento } from '@/components/eventi'
import { Caricamento, MessaggioErrore, StatoVuoto } from '@/components/ui'
import { useMieiEventiQuery } from '@/features/eventi/apiEventi'

// I miei eventi (FE1-08), rotta /my-events (solo con il login): tutti quelli che ho creato,
// anche conclusi e annullati, dal piu' recente (ordine del backend, MieiEventi).
export default function MieiEventi() {
  const { data: eventi = [], isLoading, error, refetch } = useMieiEventiQuery()

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <p className="font-label-code-status text-label-code-status uppercase tracking-wider text-tertiary">Organizzatore</p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">I miei eventi</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Gli eventi che hai creato, anche quelli conclusi o annullati.
        </p>
      </header>

      {isLoading ? (
        <Caricamento riquadro testo="Carico i tuoi eventi..." />
      ) : error ? (
        <MessaggioErrore errore={error} onRiprova={refetch} />
      ) : eventi.length === 0 ? (
        <StatoVuoto
          icona="event_note"
          titolo="Non hai ancora creato eventi"
          messaggio="Quando crei un evento lo ritrovi qui, insieme a quelli passati."
        />
      ) : (
        <ul className="grid gap-space-lg sm:grid-cols-2 xl:grid-cols-3">
          {eventi.map((e) => (
            <li key={e.id} className="flex">
              <CardEvento evento={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
