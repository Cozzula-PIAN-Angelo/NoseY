import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button, ConfirmDialog, Icon, useAvviso } from '@/components/ui'
import { useCaricaImmagineProfiloMutation, useRimuoviImmagineProfiloMutation } from '@/features/utenti/apiUtenti'
import { urlImmagine } from '@/lib/api'
import { leggiErrore } from '@/lib/errori'
import { controllaImmagine } from '@/lib/immagini'
import { LIMITI_UTENTI, type UtenteResponse } from '@/types/api'

const MAX_MB = LIMITI_UTENTI.byteAvatar / (1024 * 1024)

type ImmagineProfiloProps = {
  utente: UtenteResponse
  /** Cosa sta accanto all'avatar (nome, email, ruolo) */
  children: ReactNode
}

// Immagine del profilo (FE2-08): CaricaImmagineProfilo e RimuoviImmagineProfilo.
// Il pulsante con la fotocamera sull'avatar apre la scelta del file; il file si controlla nel
// browser (lib/immagini.ts), si vede nell'avatar come anteprima e parte solo con «Salva».
// Stesso flusso di CaricaFoto (FE1-09). Dopo il salvataggio l'avatar nuovo arriva in barra, menu e
// liste dei partecipanti da solo (apiUtenti aggiorna la sessione e fa ricaricare gli eventi).
export function ImmagineProfilo({ utente, children }: ImmagineProfiloProps) {
  const [file, setFile] = useState<File | null>(null)
  const [anteprima, setAnteprima] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [confermaRimozione, setConfermaRimozione] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const [carica, { isLoading: caricando }] = useCaricaImmagineProfiloMutation()
  const [rimuovi, { isLoading: rimuovendo }] = useRimuoviImmagineProfiloMutation()
  const avviso = useAvviso()

  // L'anteprima e' un indirizzo locale del file: si libera quando non serve piu'
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setAnteprima(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function annulla() {
    setFile(null)
    setAnteprima(null)
    setErrore(null)
    // Svuotato, cosi' si puo' riscegliere lo stesso file
    if (input.current) input.current.value = ''
  }

  async function scegli(scelto: File | undefined) {
    annulla()
    if (!scelto) return
    const problema = await controllaImmagine(scelto, MAX_MB)
    if (problema) setErrore(problema)
    else setFile(scelto)
  }

  async function salva() {
    if (!file) return
    try {
      await carica(file).unwrap()
      avviso.successo('Immagine del profilo aggiornata')
      annulla()
    } catch (e) {
      if (leggiErrore(e).codice === 'FILE_NON_VALIDO') {
        // Il controllo del browser e' passato ma quello del server no (es. immagine rovinata)
        annulla()
        setErrore('Il server non ha accettato il file: potrebbe essere danneggiato. Prova a salvarlo di nuovo o scegline un altro.')
      } else {
        avviso.erroreApi(e)
      }
    }
  }

  async function confermaRimuovi() {
    setErrore(null)
    try {
      await rimuovi().unwrap()
      avviso.successo('Immagine del profilo rimossa')
    } catch (e) {
      // 404: era gia' stata tolta (un'altra scheda, un altro dispositivo): il risultato e' lo stesso
      if (leggiErrore(e).codice !== 'NON_TROVATO') avviso.erroreApi(e)
    } finally {
      setConfermaRimozione(false)
    }
  }

  const immagine = anteprima ?? urlImmagine(utente.immagineProfilo)
  const iniziali = `${utente.nome.charAt(0)}${utente.cognome.charAt(0)}`.toUpperCase()
  const occupato = caricando || rimuovendo

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center gap-space-md">
        <div className="relative shrink-0">
          {immagine ? (
            <img
              src={immagine}
              alt={anteprima ? 'Anteprima della nuova immagine del profilo' : ''}
              className="size-20 rounded-full object-cover ring-2 ring-primary-container"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-20 items-center justify-center rounded-full bg-primary font-headline-md text-headline-md text-on-primary ring-2 ring-primary-container"
            >
              {iniziali}
            </span>
          )}

          <input
            ref={input}
            type="file"
            id={`${id}-file`}
            // Il browser propone solo questi formati; il controllo vero e' sui primi byte
            accept={LIMITI_UTENTI.tipiAvatar.join(',')}
            className="peer sr-only"
            aria-describedby={errore ? `${id}-errore` : `${id}-aiuto`}
            disabled={occupato}
            onChange={(e) => scegli(e.target.files?.[0])}
          />
          <label
            htmlFor={`${id}-file`}
            title={utente.immagineProfilo ? 'Cambia immagine' : 'Aggiungi immagine'}
            className="absolute -bottom-1 -right-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-md ring-2 ring-surface-card transition-colors hover:bg-primary hover:text-on-primary peer-focus-visible:ring-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
          >
            <Icon nome="photo_camera" size={18} />
            <span className="sr-only">{utente.immagineProfilo ? 'Cambia immagine del profilo' : 'Aggiungi immagine del profilo'}</span>
          </label>
        </div>
        {children}
      </div>

      {file ? (
        <div className="flex flex-col gap-space-xs">
          <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{file.name}</p>
          <div className="flex flex-wrap gap-space-xs">
            <Button size="sm" icona="upload" inCorso={caricando} onClick={salva}>
              Salva immagine
            </Button>
            <Button size="sm" variant="ghost" onClick={annulla} disabled={caricando}>
              Annulla
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-space-xs">
          <p id={`${id}-aiuto`} className="font-body-sm text-body-sm text-on-surface-variant">
            JPEG, PNG o WEBP, al massimo {MAX_MB} MB.
          </p>
          {utente.immagineProfilo && (
            <Button size="sm" variant="ghost" icona="delete" onClick={() => setConfermaRimozione(true)} disabled={occupato}>
              Rimuovi immagine
            </Button>
          )}
        </div>
      )}

      {errore && (
        <p id={`${id}-errore`} role="alert" className="flex items-center gap-1 font-body-sm text-body-sm text-status-annullato">
          <Icon nome="error" size={16} className="shrink-0" />
          {errore}
        </p>
      )}

      <ConfirmDialog
        aperta={confermaRimozione}
        titolo="Rimuovere l'immagine del profilo?"
        icona="no_photography"
        variante="danger"
        testoConferma="Rimuovi"
        inCorso={rimuovendo}
        onConferma={confermaRimuovi}
        onAnnulla={() => setConfermaRimozione(false)}
      >
        Al suo posto compariranno le tue iniziali. Puoi caricarne una nuova quando vuoi.
      </ConfirmDialog>
    </div>
  )
}
