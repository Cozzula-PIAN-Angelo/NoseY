import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button, Icon, TextField } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { controllaImmagine } from '@/lib/immagini'
import { LIMITI_EVENTI, type ArtistaResponse } from '@/types/api'

/** Cosa salvare: in modifica solo i campi cambiati */
export type DatiArtista = { nome?: string; file?: File; rimuoviImmagine?: boolean }

type FormArtistaProps = {
  /** L'artista da modificare; assente per un artista nuovo */
  artista?: ArtistaResponse
  inCorso: boolean
  /** Errori arrivati dal backend (es. ARTISTA_NOME_GIA_USATO, FILE_NON_VALIDO) */
  errori?: { nome?: string; file?: string }
  onSalva: (dati: DatiArtista) => void
  onAnnulla: () => void
}

// Form dell'artista del catalogo (FE1-16), per la creazione e la modifica: nome (max 100) e immagine
// facoltativa, controllata nel browser prima dell'invio come le foto degli eventi (JPEG, PNG o WEBP,
// max 5 MB). In modifica si puo' anche togliere l'immagine attuale.
export function FormArtista({ artista, inCorso, errori = {}, onSalva, onAnnulla }: FormArtistaProps) {
  const [nome, setNome] = useState(artista?.nome ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [anteprima, setAnteprima] = useState<string | null>(null)
  const [togliImmagine, setTogliImmagine] = useState(false)
  const [erroreNome, setErroreNome] = useState<string>()
  const [erroreFile, setErroreFile] = useState<string>()
  const input = useRef<HTMLInputElement>(null)
  const id = useId()

  // Gli errori del backend arrivano dopo l'invio e si mostrano sui campi
  useEffect(() => {
    setErroreNome(errori.nome)
    setErroreFile(errori.file)
  }, [errori.nome, errori.file])

  // L'anteprima e' un indirizzo locale del file: si libera quando non serve piu'
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setAnteprima(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function scegli(scelto: File | undefined) {
    setErroreFile(undefined)
    if (!scelto) return
    const problema = await controllaImmagine(scelto, LIMITI_EVENTI.byteFoto / (1024 * 1024))
    if (problema) {
      setErroreFile(problema)
      if (input.current) input.current.value = ''
      return
    }
    setFile(scelto)
    setTogliImmagine(false)
  }

  function togli() {
    setFile(null)
    setAnteprima(null)
    if (input.current) input.current.value = ''
    // Un'immagine appena scelta si toglie e basta; quella salvata va tolta anche nel backend
    if (!file && artista?.immagineUrl) setTogliImmagine(true)
  }

  function invia(e: FormEvent) {
    e.preventDefault()
    const testo = nome.trim()
    if (!testo) return setErroreNome('Scrivi il nome dell’artista.')
    const dati: DatiArtista = {}
    if (testo !== artista?.nome) dati.nome = testo
    if (file) dati.file = file
    if (togliImmagine) dati.rimuoviImmagine = true
    onSalva(dati)
  }

  const attuale = !togliImmagine ? urlImmagine(artista?.immagineUrl) : null
  const mostrata = anteprima ?? attuale
  const cambiato = !artista || nome.trim() !== artista.nome || file !== null || togliImmagine

  return (
    <form onSubmit={invia} noValidate className="flex flex-col gap-space-md">
      <div className="flex flex-col gap-space-md sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-space-xs">
          {mostrata ? (
            <img src={mostrata} alt="" className="size-24 rounded-xl object-cover" />
          ) : (
            <span aria-hidden="true" className="flex size-24 items-center justify-center rounded-xl bg-surface-container-high text-outline">
              <Icon nome="person" size={36} />
            </span>
          )}
          <input
            ref={input}
            id={`${id}-file`}
            type="file"
            // Il browser propone solo questi formati; il controllo vero e' sui primi byte
            accept={LIMITI_EVENTI.tipiFoto.join(',')}
            className="sr-only"
            aria-describedby={erroreFile ? `${id}-errore-file` : undefined}
            onChange={(e) => scegli(e.target.files?.[0])}
            disabled={inCorso}
          />
          <label
            htmlFor={`${id}-file`}
            className="cursor-pointer rounded-lg px-space-xs py-1 font-label-sm text-label-sm text-secondary hover:bg-surface-container focus-within:ring-2 focus-within:ring-primary-container"
          >
            {mostrata ? 'Cambia immagine' : 'Scegli immagine'}
          </label>
          {mostrata && (
            <button
              type="button"
              onClick={togli}
              disabled={inCorso}
              className="rounded-lg px-space-xs py-1 font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container hover:text-status-annullato"
            >
              Togli immagine
            </button>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-space-sm">
          <TextField
            etichetta="Nome"
            obbligatorio
            maxLength={LIMITI_EVENTI.nomeArtista}
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              setErroreNome(undefined)
            }}
            errore={erroreNome}
            disabled={inCorso}
            placeholder="Es. Aura Minimal"
          />
          <p className="font-body-sm text-body-sm text-outline">Immagine facoltativa: JPEG, PNG o WEBP, al massimo 5 MB.</p>
          {erroreFile && (
            <p id={`${id}-errore-file`} role="alert" className="flex items-center gap-1 font-body-sm text-body-sm text-status-annullato">
              <Icon nome="error" size={16} />
              {erroreFile}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-space-xs">
        <Button type="submit" icona="check" inCorso={inCorso} disabled={!cambiato}>
          {artista ? 'Salva modifiche' : 'Aggiungi al catalogo'}
        </Button>
        <Button variant="ghost" onClick={onAnnulla} disabled={inCorso}>
          Annulla
        </Button>
      </div>
    </form>
  )
}
