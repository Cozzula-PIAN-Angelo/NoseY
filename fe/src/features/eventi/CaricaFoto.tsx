import { useEffect, useId, useRef, useState } from 'react'
import { Button, Icon, useAvviso } from '@/components/ui'
import { controllaImmagine } from '@/lib/immagini'
import { LIMITI_EVENTI, type Uuid } from '@/types/api'
import { useCreaFotoMutation } from './apiEventi'

// Caricamento di una foto dell'evento (FE1-09): scelta del file, controllo di tipo e dimensione
// prima dell'invio (lib/immagini.ts), anteprima, poi «Carica».
export function CaricaFoto({ eventoId }: { eventoId: Uuid }) {
  const [file, setFile] = useState<File | null>(null)
  const [anteprima, setAnteprima] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const idErrore = useId()
  const [carica, { isLoading }] = useCreaFotoMutation()
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
    if (input.current) input.current.value = ''
  }

  async function scegli(scelto: File | undefined) {
    annulla()
    if (!scelto) return
    const problema = await controllaImmagine(scelto, LIMITI_EVENTI.byteFoto / (1024 * 1024))
    if (problema) setErrore(problema)
    else setFile(scelto)
  }

  async function invia() {
    if (!file) return
    try {
      await carica({ id: eventoId, file }).unwrap()
      avviso.successo('Foto caricata')
      annulla()
    } catch (e) {
      avviso.erroreApi(e)
    }
  }

  return (
    <div className="flex flex-col gap-space-sm rounded-xl border border-dashed border-outline-variant p-space-md">
      <input
        ref={input}
        type="file"
        // Il browser propone solo questi formati; il controllo vero e' sui primi byte
        accept={LIMITI_EVENTI.tipiFoto.join(',')}
        className="sr-only"
        id={`${idErrore}-file`}
        aria-describedby={errore ? idErrore : undefined}
        onChange={(e) => scegli(e.target.files?.[0])}
      />

      {file && anteprima ? (
        <div className="flex flex-col gap-space-sm sm:flex-row sm:items-start">
          <img src={anteprima} alt="Anteprima della foto scelta" className="aspect-[16/9] w-full rounded-lg object-cover sm:w-56" />
          <div className="flex min-w-0 flex-1 flex-col gap-space-sm">
            <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{file.name}</p>
            <div className="flex flex-wrap gap-space-xs">
              <Button icona="upload" inCorso={isLoading} onClick={invia}>
                Carica
              </Button>
              <Button variant="ghost" onClick={annulla} disabled={isLoading}>
                Annulla
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor={`${idErrore}-file`}
          className="flex cursor-pointer flex-col items-center gap-space-xs rounded-lg p-space-md text-center text-on-surface-variant transition-colors hover:bg-surface-container focus-within:ring-2 focus-within:ring-primary-container"
        >
          <Icon nome="add_photo_alternate" size={36} className="text-primary" />
          <span className="font-label-btn text-label-btn text-on-surface">Scegli una foto</span>
          <span className="font-body-sm text-body-sm">JPEG, PNG o WEBP, al massimo 5 MB</span>
        </label>
      )}

      {errore && (
        <p id={idErrore} role="alert" className="flex items-center gap-1 font-body-sm text-body-sm text-status-annullato">
          <Icon nome="error" size={16} />
          {errore}
        </p>
      )}
    </div>
  )
}
