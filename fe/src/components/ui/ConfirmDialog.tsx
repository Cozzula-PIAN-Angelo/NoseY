import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

type ConfirmDialogProps = {
  /** La finestra e' aperta */
  aperta: boolean
  titolo: string
  /** Testo o contenuto della finestra */
  children?: ReactNode
  /** Testo del pulsante di conferma (default "Conferma") */
  testoConferma?: string
  /** Testo del pulsante di annullamento (default "Annulla") */
  testoAnnulla?: string
  /** "danger" per le azioni irreversibili: annulla evento, anonimizzazione, cancella foto */
  variante?: 'primary' | 'danger'
  /** Icona Material Symbols accanto al titolo */
  icona?: string
  /** Mentre la chiamata API e' in corso: rotellina sul pulsante, finestra non chiudibile */
  inCorso?: boolean
  onConferma: () => void
  onAnnulla: () => void
}

// Finestra di conferma basata su <dialog> nativo: blocca il resto della pagina,
// porta il focus dentro la finestra e si chiude con Esc o cliccando fuori.
export function ConfirmDialog({
  aperta,
  titolo,
  children,
  testoConferma = 'Conferma',
  testoAnnulla = 'Annulla',
  variante = 'primary',
  icona,
  inCorso = false,
  onConferma,
  onAnnulla,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitolo = useId()
  const idTesto = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (aperta && !dialog.open) dialog.showModal()
    if (!aperta && dialog.open) dialog.close()
  }, [aperta])

  function annulla() {
    if (!inCorso) onAnnulla()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitolo}
      aria-describedby={children ? idTesto : undefined}
      // Esc: il browser chiuderebbe da solo la finestra, invece decide il genitore con "aperta"
      onCancel={(e) => {
        e.preventDefault()
        annulla()
      }}
      // Clic sullo sfondo: l'evento arriva al <dialog> stesso, non al suo contenuto
      onClick={(e) => {
        if (e.target === e.currentTarget) annulla()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface-card p-0 text-on-surface shadow-2xl backdrop:bg-surface-canvas/80 backdrop:backdrop-blur-md"
    >
      <div className="flex flex-col gap-space-md p-space-lg">
        <div className="flex items-start gap-space-sm">
          {icona && (
            <span
              className={
                variante === 'danger'
                  ? 'rounded-xl bg-status-annullato/15 p-space-xs text-status-annullato'
                  : 'rounded-xl bg-primary/15 p-space-xs text-primary'
              }
            >
              <Icon nome={icona} size={24} />
            </span>
          )}
          <h2 id={idTitolo} className="font-headline-sm text-headline-sm">
            {titolo}
          </h2>
        </div>

        {children && (
          <div id={idTesto} className="text-on-surface-variant">
            {children}
          </div>
        )}

        <div className="mt-space-sm flex flex-col-reverse gap-space-sm sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={annulla} disabled={inCorso}>
            {testoAnnulla}
          </Button>
          <Button
            variant="primary"
            onClick={onConferma}
            inCorso={inCorso}
            className={variante === 'danger' ? 'bg-status-annullato text-white hover:bg-status-annullato/85' : undefined}
          >
            {testoConferma}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
