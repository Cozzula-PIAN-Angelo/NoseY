import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon, Scheletro, stilePulsante } from '@/components/ui'
import { useListaArtistiQuery, useListaEventiQuery } from '@/features/eventi/apiEventi'
import { CaroselloEventi } from '@/features/eventi/CaroselloEventi'
import { cx } from '@/lib/cx'

// Home (FE1-19), rotta / (pubblica), come la schermata Stitch "Hero Live (Cylindrical 3D Carousel)".
// Passo 3: hero con titolo, contatori veri (eventi attivi, artisti nel catalogo), ricerca che porta a
// Esplora eventi e pulsanti verso eventi e mappa; sotto, le funzioni di NoseY.
// Passo 4: a destra il carosello degli eventi in programma e in corso.
// Tolte le scritte finte di Stitch ("Live Orbital Engine", "Radar 2km", "Latenza 14ms", "crittografico").

/** Le funzioni vere di NoseY, al posto della striscia tecnica di Stitch */
const FUNZIONI = [
  { icona: 'radar', titolo: 'Eventi vicino a te', testo: 'La mappa degli eventi in programma e in corso, dal più vicino se condividi la posizione.' },
  { icona: 'qr_code_2', titolo: 'Ticket con QR', testo: 'Ti iscrivi in un clic e mostri il codice all’ingresso.' },
  { icona: 'forum', titolo: 'Amici e chat', testo: 'Conosci chi partecipa ai tuoi stessi eventi e scrivetevi in chat.' },
  { icona: 'auto_awesome', titolo: 'Descrizioni con l’AI', testo: 'Chi organizza può migliorare la descrizione partendo da una foto dell’evento.' },
]

/** Contatore del hero: il numero arriva dall'API, finche' carica si mostra un trattino */
function Contatore({ etichetta, valore, icona, colore }: { etichetta: string; valore: number | undefined; icona: string; colore: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-xl bg-surface-container-low p-space-md">
      <span className={cx('flex items-center gap-1.5 font-label-code-status text-label-code-status uppercase', colore)}>
        <Icon nome={icona} size={16} />
        {etichetta}
      </span>
      <span className="font-display-hero-mobile text-headline-lg text-on-surface">{valore ?? '–'}</span>
    </div>
  )
}

export default function Home() {
  const { data: eventi, isLoading: eventiInCaricamento } = useListaEventiQuery()
  const { data: artisti } = useListaArtistiQuery()
  const [cerca, setCerca] = useState('')
  const navigate = useNavigate()

  /** Ricerca e scorciatoie portano a Esplora eventi gia' filtrato */
  function vaiAEventi(periodo?: 'oggi' | 'weekend') {
    const parametri = new URLSearchParams()
    if (cerca.trim()) parametri.set('cerca', cerca.trim())
    if (periodo) parametri.set('periodo', periodo)
    const query = parametri.toString()
    navigate(query ? `/events?${query}` : '/events')
  }

  function invia(e: FormEvent) {
    e.preventDefault()
    vaiAEventi()
  }

  return (
    <div className="flex w-full flex-col">
      <section className="mx-auto grid w-full max-w-[1440px] items-center gap-space-xl px-margin-mobile py-space-xl md:px-margin lg:grid-cols-2">
        <div className="flex flex-col gap-space-lg">
          <p className="flex w-max items-center gap-1.5 rounded-full bg-surface-container px-space-sm py-1 font-label-code-status text-label-code-status uppercase tracking-wider text-status-in-corso">
            <span className="size-1.5 rounded-full bg-status-in-corso motion-safe:animate-pulse" />
            Eventi in programma e in corso
          </p>
          <h1 className="font-display-hero-mobile text-headline-lg-mobile tracking-tight md:font-display-hero md:text-display-hero">
            Scopri eventi{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">dal vivo</span> e
            connettiti con la community.
          </h1>
          <p className="max-w-xl font-body-lg text-body-lg text-on-surface-variant">
            Serate, club e live set vicino a te: prendi il ticket, mostralo all’ingresso con il QR e conosci chi
            partecipa ai tuoi stessi eventi.
          </p>

          <div className="flex gap-space-sm">
            <Contatore etichetta="Eventi attivi" valore={eventi?.length} icona="event_available" colore="text-status-in-corso" />
            <Contatore etichetta="Artisti" valore={artisti?.length} icona="queue_music" colore="text-accent-gold-piercing" />
          </div>

          <form onSubmit={invia} role="search" className="flex flex-col gap-space-sm rounded-xl bg-surface-card p-space-md">
            <div className="flex flex-col gap-space-xs sm:flex-row">
              <label className="flex flex-1 items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm focus-within:ring-2 focus-within:ring-primary-container">
                <Icon nome="search" size={20} className="text-outline" />
                <span className="sr-only">Cerca un evento per titolo</span>
                <input
                  type="search"
                  value={cerca}
                  onChange={(e) => setCerca(e.target.value)}
                  placeholder="Cerca un evento"
                  className="w-full bg-transparent py-2.5 font-body-md text-body-md text-on-surface outline-none placeholder:text-outline"
                />
              </label>
              <div className="flex gap-space-xs">
                <button
                  type="button"
                  onClick={() => vaiAEventi('oggi')}
                  className="rounded-lg bg-surface-container px-space-sm py-2 font-label-btn text-label-btn text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  Oggi
                </button>
                <button
                  type="button"
                  onClick={() => vaiAEventi('weekend')}
                  className="rounded-lg bg-surface-container px-space-sm py-2 font-label-btn text-label-btn text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  Weekend
                </button>
                <button type="submit" className={stilePulsante({ size: 'sm' })}>
                  Cerca
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-space-sm">
              <Link to="/events" className={stilePulsante({ variant: 'gradient' })}>
                <Icon nome="explore" size={18} />
                Esplora gli eventi
              </Link>
              <Link to="/map" className={stilePulsante({ variant: 'secondary' })}>
                <Icon nome="map" size={18} />
                Apri la mappa
              </Link>
            </div>
          </form>
        </div>
        <div className="min-w-0">
          {eventiInCaricamento ? (
            <div role="status" aria-label="Caricamento degli eventi" className="flex justify-center">
              <Scheletro className="h-[26rem] w-60" />
            </div>
          ) : eventi && eventi.length > 0 ? (
            <CaroselloEventi eventi={eventi} />
          ) : (
            eventi && (
              <p className="flex items-center justify-center gap-space-xs rounded-2xl bg-surface-card p-space-xl text-center font-body-md text-body-md text-on-surface-variant">
                <Icon nome="event_busy" size={22} className="text-outline" />
                Nessun evento in programma in questo momento.
              </p>
            )
          )}
        </div>
      </section>

      <section aria-label="Cosa puoi fare con NoseY" className="w-full bg-surface-container-lowest">
        <ul className="mx-auto grid w-full max-w-[1440px] gap-space-md px-margin-mobile py-space-lg sm:grid-cols-2 md:px-margin lg:grid-cols-4">
          {FUNZIONI.map((f) => (
            <li key={f.titolo} className="flex items-start gap-space-sm rounded-xl p-space-sm">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon nome={f.icona} size={22} />
              </span>
              <span className="flex flex-col">
                <span className="font-label-btn text-label-btn text-on-surface">{f.titolo}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{f.testo}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
