import { useState } from 'react'
import { Button, Caricamento, ConfirmDialog, Icon, MessaggioErrore, StatoVuoto, TextField, useAvviso } from '@/components/ui'
import {
  useCreaArtistaMutation,
  useEliminaArtistaMutation,
  useListaArtistiAdminQuery,
  useModificaArtistaMutation,
} from '@/features/admin/apiAdmin'
import { FormArtista, type DatiArtista } from '@/features/admin/FormArtista'
import { useValoreRitardato } from '@/hooks/useValoreRitardato'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import { leggiErrore } from '@/lib/errori'
import type { ArtistaResponse, Uuid } from '@/types/api'

// Pannello admin: catalogo degli artisti (FE1-16), rotta /admin/artists (solo ADMIN e SUPERADMIN).
// Passo 1: crea, modifica (nome e immagine), disattiva / riattiva, elimina con conferma.
// Passo 2: con ARTISTA_IN_USO (nella line-up di almeno un evento) si propone la disattivazione.
// Disattivato (attivo = false) sparisce dal catalogo pubblico ma resta negli eventi dove c'e' gia'.

/** Errori del backend da mostrare sui campi del form; null per quelli da mostrare come avviso */
function erroriForm(err: unknown): { nome?: string; file?: string } | null {
  const { codice, campi } = leggiErrore(err)
  if (codice === 'ARTISTA_NOME_GIA_USATO') return { nome: 'Esiste già un artista con questo nome.' }
  if (codice === 'FILE_NON_VALIDO') return { file: 'Il server non ha accettato l’immagine: potrebbe essere danneggiata. Scegline un’altra.' }
  if (codice === 'VALIDAZIONE' && campi.nome) return { nome: campi.nome }
  return null
}

function RigaArtista({
  artista,
  inModifica,
  azioni,
}: {
  artista: ArtistaResponse
  inModifica: boolean
  azioni: { onModifica: () => void; onCambiaAttivo: () => void; onElimina: () => void; attivoInCorso: boolean }
}) {
  const immagine = urlImmagine(artista.immagineUrl)
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-space-sm', !artista.attivo && 'opacity-70')}>
      <div className="flex min-w-0 items-center gap-space-sm">
        {immagine ? (
          <img src={immagine} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
        ) : (
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-outline">
            <Icon nome="person" size={24} />
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-label-btn text-label-btn text-on-surface">{artista.nome}</span>
          {!artista.attivo && (
            <span className="font-label-code-status text-label-code-status uppercase text-outline">
              Fuori catalogo · non si può più aggiungere agli eventi
            </span>
          )}
        </div>
      </div>
      {!inModifica && (
        <div className="flex flex-wrap items-center gap-space-xs">
          <Button variant="ghost" size="sm" icona="edit" onClick={azioni.onModifica} aria-label={`Modifica ${artista.nome}`}>
            Modifica
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icona={artista.attivo ? 'visibility_off' : 'visibility'}
            onClick={azioni.onCambiaAttivo}
            inCorso={azioni.attivoInCorso}
            aria-label={`${artista.attivo ? 'Disattiva' : 'Riattiva'} ${artista.nome}`}
          >
            {artista.attivo ? 'Disattiva' : 'Riattiva'}
          </Button>
          <Button variant="danger" size="sm" icona="delete" onClick={azioni.onElimina} aria-label={`Elimina ${artista.nome}`}>
            Elimina
          </Button>
        </div>
      )}
    </div>
  )
}

export default function AdminArtisti() {
  const [testo, setTesto] = useState('')
  const cerca = useValoreRitardato(testo.trim(), 300)
  const { data: artisti, isFetching, error, refetch } = useListaArtistiAdminQuery(cerca)
  const [crea, { isLoading: creazione }] = useCreaArtistaMutation()
  const [modifica, { isLoading: modificaInCorso, originalArgs: argomentiModifica }] = useModificaArtistaMutation()
  const [elimina, { isLoading: eliminazione }] = useEliminaArtistaMutation()
  const avviso = useAvviso()

  const [nuovoAperto, setNuovoAperto] = useState(false)
  const [inModifica, setInModifica] = useState<Uuid | null>(null)
  const [erroriNuovo, setErroriNuovo] = useState<{ nome?: string; file?: string }>({})
  const [erroriModifica, setErroriModifica] = useState<{ nome?: string; file?: string }>({})
  const [daEliminare, setDaEliminare] = useState<ArtistaResponse | null>(null)
  // Eliminazione rifiutata con ARTISTA_IN_USO: si propone di mettere l'artista (ancora attivo) fuori catalogo
  const [inUso, setInUso] = useState<ArtistaResponse | null>(null)

  async function creaArtista(dati: DatiArtista) {
    setErroriNuovo({})
    try {
      const artista = await crea({ nome: dati.nome ?? '', file: dati.file }).unwrap()
      avviso.successo('Catalogo aggiornato', `${artista.nome} ora è nel catalogo.`)
      setNuovoAperto(false)
    } catch (err) {
      const campi = erroriForm(err)
      if (campi) setErroriNuovo(campi)
      else avviso.erroreApi(err)
    }
  }

  async function salvaModifica(artista: ArtistaResponse, dati: DatiArtista) {
    setErroriModifica({})
    try {
      await modifica({ artistaId: artista.id, dati }).unwrap()
      avviso.successo('Modifiche salvate', 'Si vedono anche negli eventi dove è in line-up.')
      setInModifica(null)
    } catch (err) {
      const campi = erroriForm(err)
      if (campi) setErroriModifica(campi)
      else avviso.erroreApi(err)
    }
  }

  async function cambiaAttivo(artista: ArtistaResponse) {
    try {
      await modifica({ artistaId: artista.id, dati: { attivo: !artista.attivo } }).unwrap()
      if (artista.attivo) avviso.info('Fuori catalogo', `${artista.nome} non compare più nel catalogo, ma resta negli eventi dove c’è già.`)
      else avviso.successo('Di nuovo nel catalogo', `${artista.nome} si può di nuovo aggiungere agli eventi.`)
    } catch (err) {
      avviso.erroreApi(err)
    }
  }

  async function eliminaArtista(artista: ArtistaResponse) {
    try {
      await elimina(artista.id).unwrap()
      avviso.info('Eliminazione completata', `${artista.nome} non è più nel catalogo.`)
    } catch (err) {
      // Lo stato piu' recente della lista: l'artista puo' essere stato riattivato dopo aver aperto la conferma
      const attuale = artisti?.find((a) => a.id === artista.id) ?? artista
      if (leggiErrore(err).codice !== 'ARTISTA_IN_USO') avviso.erroreApi(err)
      // Gia' fuori catalogo: non c'e' altro da proporre
      else if (!attuale.attivo)
        avviso.info('Eliminazione non possibile', `«${attuale.nome}» è nella line-up di almeno un evento: resta fuori catalogo, solo negli eventi dove c’è già.`)
      else setInUso(attuale)
    }
  }

  let contenuto
  if (!artisti && isFetching) {
    contenuto = <Caricamento riquadro testo="Carico il catalogo..." />
  } else if (error) {
    contenuto = <MessaggioErrore errore={error} onRiprova={refetch} />
  } else if (artisti && artisti.length === 0) {
    contenuto = (
      <StatoVuoto
        icona="person_search"
        titolo="Nessun artista trovato"
        messaggio={cerca ? 'Prova con un altro nome.' : 'Il catalogo è vuoto: aggiungi il primo artista.'}
      />
    )
  } else if (artisti) {
    contenuto = (
      <ul className={cx('flex flex-col gap-space-sm transition-opacity', isFetching && 'opacity-60')}>
        {artisti.map((a) => (
          <li key={a.id} className="flex flex-col gap-space-md rounded-xl bg-surface-card p-space-md">
            <RigaArtista
              artista={a}
              inModifica={inModifica === a.id}
              azioni={{
                onModifica: () => {
                  setErroriModifica({})
                  setInModifica(a.id)
                },
                onCambiaAttivo: () => cambiaAttivo(a),
                onElimina: () => setDaEliminare(a),
                attivoInCorso: modificaInCorso && argomentiModifica?.artistaId === a.id && argomentiModifica.dati.attivo !== undefined,
              }}
            />
            {inModifica === a.id && (
              <FormArtista
                key={a.id}
                artista={a}
                inCorso={modificaInCorso}
                errori={erroriModifica}
                onSalva={(dati) => salvaModifica(a, dati)}
                onAnnulla={() => setInModifica(null)}
              />
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-wrap items-end justify-between gap-space-sm">
        <div className="flex flex-col gap-space-xs">
          <p className="font-label-code-status text-label-code-status uppercase text-secondary">Amministrazione</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Catalogo artisti</h1>
        </div>
        {!nuovoAperto && (
          <Button
            icona="add"
            onClick={() => {
              setErroriNuovo({})
              setNuovoAperto(true)
            }}
          >
            Nuovo artista
          </Button>
        )}
      </header>

      {nuovoAperto && (
        <section aria-labelledby="titolo-nuovo-artista" className="flex flex-col gap-space-md rounded-xl bg-surface-card p-space-md sm:p-space-lg">
          <h2 id="titolo-nuovo-artista" className="font-headline-sm text-headline-sm">
            Nuovo artista
          </h2>
          <FormArtista inCorso={creazione} errori={erroriNuovo} onSalva={creaArtista} onAnnulla={() => setNuovoAperto(false)} />
        </section>
      )}

      <TextField
        etichetta="Cerca"
        icona="search"
        type="search"
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        maxLength={100}
        placeholder="Nome dell'artista"
        aiuto="Qui compare anche chi è fuori catalogo."
      />

      {contenuto}

      <ConfirmDialog
        aperta={daEliminare !== null}
        titolo="Eliminare l'artista?"
        icona="delete"
        variante="danger"
        testoConferma="Elimina"
        testoAnnulla="Annulla"
        inCorso={eliminazione}
        onConferma={async () => {
          if (daEliminare) await eliminaArtista(daEliminare)
          setDaEliminare(null)
        }}
        onAnnulla={() => setDaEliminare(null)}
      >
        {daEliminare && (
          <p className="font-body-md text-body-md">
            «{daEliminare.nome}» uscirà dal catalogo per sempre. Si può eliminare solo chi non è nella line-up di nessun
            evento: in quel caso usa «Disattiva».
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        aperta={inUso !== null}
        titolo="Eliminazione non possibile"
        icona="queue_music"
        testoConferma="Metti fuori catalogo"
        testoAnnulla="Lascia com’è"
        inCorso={modificaInCorso}
        onConferma={async () => {
          if (inUso) await cambiaAttivo(inUso)
          setInUso(null)
        }}
        onAnnulla={() => setInUso(null)}
      >
        {inUso && (
          <p className="font-body-md text-body-md">
            «{inUso.nome}» è nella line-up di almeno un evento, quindi non si può eliminare. Si può però spostare fuori
            catalogo: non si potrà più aggiungere ad altri eventi, ma resterà in quelli dove c’è già.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
