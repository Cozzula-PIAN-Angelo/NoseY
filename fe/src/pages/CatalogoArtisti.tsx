import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Icon, MessaggioErrore, Scheletro, StatoVuoto, TextField, stilePulsante } from '@/components/ui'
import { useListaArtistiQuery } from '@/features/eventi/apiEventi'
import { useValoreRitardato } from '@/hooks/useValoreRitardato'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import type { ArtistaResponse } from '@/types/api'

// Catalogo degli artisti (FE1-19, passo 5), rotta /artists (pubblica), come la schermata Stitch
// "Lineup & Catalogo Artisti": ricerca per nome (ListaArtisti ?search=, solo artisti attivi, in ordine
// alfabetico), griglia e stato vuoto. L'API ha solo nome e immagine: niente generi, fan, bio o date.

function CardArtista({ artista }: { artista: ArtistaResponse }) {
  const immagine = urlImmagine(artista.immagineUrl)
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface-card shadow-lg">
      <div className="relative aspect-square bg-surface-container">
        {immagine ? (
          // Decorativa: il nome e' subito sotto
          <img src={immagine} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-inverse-primary/40 to-surface-deep">
            <Icon nome="queue_music" size={48} className="text-primary/70" />
          </div>
        )}
        <span className="absolute left-space-sm top-space-sm flex items-center gap-1 rounded-full bg-surface-deep/80 px-space-sm py-0.5 font-label-code-status text-label-code-status uppercase text-status-in-corso backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-status-in-corso" />
          Nel catalogo
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-space-sm p-space-md">
        <h2 className="font-headline-sm text-headline-sm">{artista.nome}</h2>
        <Link
          to={`/artists/${artista.id}`}
          className={cx(stilePulsante({ variant: 'secondary', size: 'sm' }), 'mt-auto self-start')}
          aria-label={`Vedi la scheda di ${artista.nome}`}
        >
          <Icon nome="person" size={16} />
          Vedi scheda
        </Link>
      </div>
    </article>
  )
}

export default function CatalogoArtisti() {
  const [testo, setTesto] = useState('')
  const cerca = useValoreRitardato(testo.trim(), 300)
  const { data: artisti, isFetching, error, refetch } = useListaArtistiQuery(cerca ? { search: cerca } : undefined)
  // Mentre si scrive la lista precedente resta visibile, attenuata
  const staCercando = isFetching || testo.trim() !== cerca

  let contenuto
  if (!artisti && isFetching) {
    contenuto = (
      <div role="status" aria-label="Caricamento degli artisti" className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Scheletro key={i} className="aspect-[4/5]" />
        ))}
      </div>
    )
  } else if (error) {
    contenuto = <MessaggioErrore errore={error} onRiprova={refetch} />
  } else if (artisti && artisti.length === 0) {
    contenuto = (
      <StatoVuoto
        icona="person_search"
        titolo="Nessun artista trovato"
        messaggio={
          cerca ? `Nessun artista nel catalogo per «${cerca}». Controlla l'ortografia o prova un altro nome.` : 'Il catalogo è ancora vuoto.'
        }
        azione={
          cerca && (
            <Button variant="secondary" onClick={() => setTesto('')}>
              Mostra tutti gli artisti
            </Button>
          )
        }
      />
    )
  } else if (artisti) {
    contenuto = (
      <ul className={cx('grid gap-space-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', staCercando && 'opacity-60 transition-opacity')}>
        {artisti.map((a) => (
          <li key={a.id}>
            <CardArtista artista={a} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
        <div className="flex flex-col gap-space-xs">
          <p className="font-label-code-status text-label-code-status uppercase tracking-wider text-secondary">Catalogo artisti</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Artisti e live performer</h1>
          <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">
            Resident e live act che suonano negli eventi di NoseY. Apri la scheda di un artista per vederne i dettagli.
          </p>
        </div>
        {artisti && !cerca && (
          <p className="flex shrink-0 flex-col rounded-xl bg-surface-card px-space-md py-space-sm">
            <span className="font-label-code-status text-label-code-status uppercase text-outline">Nel catalogo</span>
            <span className="font-headline-md text-headline-md text-on-surface">{artisti.length}</span>
          </p>
        )}
      </header>

      <div className="flex flex-col gap-space-sm rounded-xl bg-surface-card p-space-md sm:flex-row sm:items-end sm:justify-between">
        <TextField
          etichetta="Cerca un artista"
          icona="search"
          type="search"
          maxLength={100}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Nome dell'artista, es. Elena Kosh"
          className="sm:max-w-md sm:flex-1"
        />
        {artisti && artisti.length > 0 && (
          <p aria-live="polite" className="font-label-code-status text-label-code-status uppercase text-outline">
            {artisti.length === 1 ? '1 artista' : `${artisti.length} artisti`}
          </p>
        )}
      </div>

      {contenuto}
    </div>
  )
}
