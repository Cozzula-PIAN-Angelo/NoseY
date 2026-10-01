import { useState } from 'react'
import { Button, Icon, Scheletro, TextField, useAvviso } from '@/components/ui'
import { useValoreRitardato } from '@/hooks/useValoreRitardato'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import type { ArtistaResponse, EventoDettaglioResponse } from '@/types/api'
import { useAggiungiArtistaEventoMutation, useListaArtistiQuery, useRimuoviArtistaEventoMutation } from './apiEventi'

// Line-up dell'evento nella modifica (FE1-11): la line-up attuale con «Rimuovi», e sotto la
// ricerca nel catalogo mentre si scrive (solo artisti attivi, in ordine alfabetico) con «Aggiungi».
// Il proprietario sceglie solo dal catalogo: gli artisti li crea un admin (decisione D3).
// La rimozione non chiede conferma: si rimedia subito riaggiungendo l'artista.

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
  const [aggiungi, { isLoading: aggiuntaInCorso, originalArgs: aggiuntaDi }] = useAggiungiArtistaEventoMutation()
  const [rimuovi, { isLoading: rimozioneInCorso, originalArgs: rimozioneDi }] = useRimuoviArtistaEventoMutation()
  const avviso = useAvviso()

  async function aggiungiArtista(a: ArtistaResponse) {
    try {
      await aggiungi({ id: evento.id, artistaId: a.id }).unwrap()
      avviso.successo('Line-up aggiornata', `${a.nome} ora è nella line-up. I partecipanti riceveranno una notifica.`)
    } catch (err) {
      avviso.erroreApi(err)
    }
  }

  async function rimuoviArtista(a: ArtistaResponse) {
    try {
      await rimuovi({ id: evento.id, artistaId: a.id }).unwrap()
      avviso.info('Line-up aggiornata', `${a.nome} non è più nella line-up.`)
    } catch (err) {
      avviso.erroreApi(err)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <section aria-labelledby="titolo-lineup-attuale" className="flex flex-col gap-space-xs">
        <h3 id="titolo-lineup-attuale" className="font-label-code-status text-label-code-status uppercase text-outline">
          Nella line-up ({evento.artisti.length})
        </h3>
        {evento.artisti.length === 0 ? (
          <p className="font-body-md text-body-md text-outline">Ancora nessun artista: cercalo qui sotto e aggiungilo.</p>
        ) : (
          <ul className="grid gap-space-xs sm:grid-cols-2">
            {evento.artisti.map((a) => (
              <li key={a.id} className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
                <Avatar artista={a} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-label-btn text-label-btn text-on-surface">{a.nome}</span>
                  {!a.attivo && <span className="font-body-sm text-body-sm text-outline">Non più nel catalogo</span>}
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  icona="person_remove"
                  inCorso={rimozioneInCorso && rimozioneDi?.artistaId === a.id}
                  onClick={() => rimuoviArtista(a)}
                  aria-label={`Rimuovi ${a.nome} dalla line-up`}
                >
                  Rimuovi
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                {giaInLineup.has(a.id) ? (
                  <span className="flex shrink-0 items-center gap-1 font-label-sm text-label-sm text-status-in-corso">
                    <Icon nome="check_circle" size={16} piena />
                    Nella line-up
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    icona="person_add"
                    inCorso={aggiuntaInCorso && aggiuntaDi?.artistaId === a.id}
                    onClick={() => aggiungiArtista(a)}
                    aria-label={`Aggiungi ${a.nome} alla line-up`}
                  >
                    Aggiungi
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
