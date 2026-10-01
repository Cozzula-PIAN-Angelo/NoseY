import { useState } from 'react'
import { Icon, Scheletro, TextField } from '@/components/ui'
import { useValoreRitardato } from '@/hooks/useValoreRitardato'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import type { ArtistaResponse, EventoDettaglioResponse } from '@/types/api'
import { useListaArtistiQuery } from './apiEventi'

// Line-up dell'evento nella modifica (FE1-11): ricerca nel catalogo mentre si scrive (solo
// artisti attivi, in ordine alfabetico, come li manda il backend). Il proprietario sceglie
// solo dal catalogo: gli artisti li crea un admin (decisione D3).

function Avatar({ artista }: { artista: ArtistaResponse }) {
  const immagine = urlImmagine(artista.immagineUrl)
  return immagine ? (
    <img src={immagine} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
  ) : (
    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high font-label-btn text-label-btn text-primary">
      {artista.nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function GestioneArtisti({ evento }: { evento: EventoDettaglioResponse }) {
  const [cerca, setCerca] = useState('')
  // La richiesta parte 300 ms dopo l'ultimo tasto, non a ogni lettera
  const cercaRitardato = useValoreRitardato(cerca.trim(), 300)
  const { data: risultati = [], isFetching, error } = useListaArtistiQuery(
    cercaRitardato ? { search: cercaRitardato } : undefined,
  )
  const giaInLineup = new Set(evento.artisti.map((a) => a.id))
  const staCercando = isFetching || cerca.trim() !== cercaRitardato

  return (
    <div className="flex flex-col gap-space-md">
      <TextField
        icona="search"
        etichetta="Cerca nel catalogo"
        type="search"
        maxLength={100}
        value={cerca}
        onChange={(e) => setCerca(e.target.value)}
        placeholder="Nome dell'artista"
        aiuto="Il catalogo lo gestiscono gli admin: se un artista manca, chiedi di aggiungerlo."
      />

      <div aria-live="polite" className="flex flex-col gap-space-xs">
        {error ? (
          <p className="font-body-md text-body-md text-status-annullato">Non riesco a cercare nel catalogo in questo momento.</p>
        ) : staCercando && risultati.length === 0 ? (
          <div className="flex flex-col gap-space-xs">
            {[1, 2, 3].map((n) => (
              <Scheletro key={n} className="h-14 w-full" />
            ))}
          </div>
        ) : risultati.length === 0 ? (
          <p className="font-body-md text-body-md text-outline">
            Nessun artista nel catalogo per «{cercaRitardato}».
          </p>
        ) : (
          <ul aria-label="Risultati della ricerca" className={cx('flex max-h-80 flex-col gap-space-xs overflow-y-auto pr-space-xs', staCercando && 'opacity-60')}>
            {risultati.map((a) => (
              <li key={a.id} className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
                <Avatar artista={a} />
                <span className="min-w-0 flex-1 truncate font-label-btn text-label-btn text-on-surface">{a.nome}</span>
                {giaInLineup.has(a.id) && (
                  <span className="flex shrink-0 items-center gap-1 font-label-sm text-label-sm text-status-in-corso">
                    <Icon nome="check_circle" size={16} piena />
                    Nella line-up
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
