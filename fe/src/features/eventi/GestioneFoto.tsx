import { useState, type FormEvent } from 'react'
import { Button, ConfirmDialog, Icon, TextField, useAvviso } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { LIMITI_EVENTI, type FotoResponse, type Uuid } from '@/types/api'
import { useCancellaFotoMutation, useModificaFotoMutation } from './apiEventi'

type GestioneFotoProps = {
  eventoId: Uuid
  /** Come arrivano dal backend: prima la copertina */
  foto: FotoResponse[]
}

// Gestione delle foto caricate (FE1-09, passo 3): scelta della copertina, didascalia
// modificabile, cancellazione con conferma.
export function GestioneFoto({ eventoId, foto }: GestioneFotoProps) {
  const [daCancellare, setDaCancellare] = useState<FotoResponse | null>(null)
  const [modifica, { isLoading: modificaInCorso, originalArgs }] = useModificaFotoMutation()
  const [cancella, { isLoading: cancellazioneInCorso }] = useCancellaFotoMutation()
  const avviso = useAvviso()

  async function rendiCopertina(f: FotoResponse) {
    try {
      await modifica({ id: eventoId, fotoId: f.id, dati: { copertina: true } }).unwrap()
      avviso.successo('Copertina cambiata', 'La vedranno tutti sulla mappa e nelle liste.')
    } catch (e) {
      avviso.erroreApi(e)
    }
  }

  async function confermaCancellazione() {
    if (!daCancellare) return
    try {
      await cancella({ id: eventoId, fotoId: daCancellare.id }).unwrap()
      avviso.info('Foto eliminata')
      setDaCancellare(null)
    } catch (e) {
      avviso.erroreApi(e)
      setDaCancellare(null)
    }
  }

  if (foto.length === 0) return null

  return (
    <>
      <ul className="grid gap-space-md sm:grid-cols-2 xl:grid-cols-3">
        {foto.map((f, n) => (
          <li key={f.id} className="flex flex-col overflow-hidden rounded-xl bg-surface-container-low">
            <div className="relative">
              <img
                src={urlImmagine(f.url) ?? undefined}
                alt={f.didascalia ?? `Foto ${n + 1}`}
                className="aspect-[16/9] w-full object-cover"
              />
              {f.copertina && (
                <span className="absolute left-space-sm top-space-sm flex items-center gap-1 rounded-full bg-surface-deep/85 px-space-sm py-0.5 font-label-code-status text-label-code-status uppercase text-accent-gold-piercing backdrop-blur-md">
                  <Icon nome="star" size={14} piena />
                  Copertina
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-space-sm p-space-sm">
              <Didascalia eventoId={eventoId} foto={f} />
              <div className="mt-auto flex flex-wrap gap-space-xs">
                {!f.copertina && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icona="star"
                    inCorso={modificaInCorso && originalArgs?.fotoId === f.id && originalArgs.dati.copertina === true}
                    onClick={() => rendiCopertina(f)}
                  >
                    Rendi copertina
                  </Button>
                )}
                <Button size="sm" variant="danger" icona="delete" onClick={() => setDaCancellare(f)}>
                  Elimina
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        aperta={daCancellare !== null}
        titolo="Eliminare la foto?"
        icona="delete"
        variante="danger"
        testoConferma="Elimina"
        inCorso={cancellazioneInCorso}
        onConferma={confermaCancellazione}
        onAnnulla={() => setDaCancellare(null)}
      >
        {daCancellare && (
          <div className="flex flex-col gap-space-sm">
            <img src={urlImmagine(daCancellare.url) ?? undefined} alt="" className="aspect-[16/9] w-full rounded-lg object-cover" />
            <p>
              La foto verrà eliminata definitivamente.
              {daCancellare.copertina && foto.length > 1 && ' È la copertina: al suo posto andrà la foto caricata per prima tra le rimaste.'}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}

/** Didascalia di una foto: testo con la matita, che diventa un campo per modificarla */
function Didascalia({ eventoId, foto }: { eventoId: Uuid; foto: FotoResponse }) {
  const [inModifica, setInModifica] = useState(false)
  const [testo, setTesto] = useState(foto.didascalia ?? '')
  const [modifica, { isLoading }] = useModificaFotoMutation()
  const avviso = useAvviso()

  async function salva(e: FormEvent) {
    e.preventDefault()
    const nuova = testo.trim()
    if (nuova === (foto.didascalia ?? '')) {
      setInModifica(false)
      return
    }
    try {
      // "" toglie la didascalia (regola delle PATCH)
      await modifica({ id: eventoId, fotoId: foto.id, dati: { didascalia: nuova } }).unwrap()
      setInModifica(false)
    } catch (err) {
      avviso.erroreApi(err)
    }
  }

  if (!inModifica) {
    return (
      <div className="flex items-start justify-between gap-space-xs">
        <p className={foto.didascalia ? 'font-body-sm text-body-sm text-on-surface' : 'font-body-sm text-body-sm text-outline'}>
          {foto.didascalia ?? 'Nessuna didascalia'}
        </p>
        <button
          type="button"
          onClick={() => {
            setTesto(foto.didascalia ?? '')
            setInModifica(true)
          }}
          aria-label="Modifica la didascalia"
          className="shrink-0 rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          <Icon nome="edit" size={16} />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-space-xs">
      <TextField
        aria-label="Didascalia"
        maxLength={LIMITI_EVENTI.didascalia}
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        autoFocus
        placeholder="Descrivi la foto"
      />
      <div className="flex gap-space-xs">
        <Button type="submit" size="sm" inCorso={isLoading}>
          Salva
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setInModifica(false)} disabled={isLoading}>
          Annulla
        </Button>
      </div>
    </form>
  )
}
