import { useEffect, useId, useRef } from 'react'
import { Button } from '@/components/ui'
import type { TicketResponse } from '@/types/api'
import { TicketStrappabile } from './TicketStrappabile'

type FinestraTicketProps = {
  /** Il ticket da mostrare, null = finestra chiusa */
  ticket: TicketResponse | null
  onChiudi: () => void
}

// Finestra "Visualizza ticket" di I miei ticket: il ticket grande, da mostrare all'ingresso,
// con il Tear Ticket di React Bits (TicketStrappabile). Stesso <dialog> nativo di ConfirmDialog:
// blocca la pagina, porta il focus dentro, si chiude con Esc, col pulsante o cliccando fuori.

export function FinestraTicket({ ticket, onChiudi }: FinestraTicketProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const chiudi = useRef<HTMLButtonElement>(null)
  const idTitolo = useId()
  const aperta = ticket !== null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (aperta && !dialog.open) {
      dialog.showModal()
      // Il browser darebbe il focus alla matrice (role="button" del Tear Ticket, qui disattivata)
      chiudi.current?.focus()
    }
    if (!aperta && dialog.open) dialog.close()
  }, [aperta])

  const usato = ticket?.evento.stato === 'CONCLUSO' || ticket?.evento.stato === 'ANNULLATO'

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitolo}
      // Esc: decide il genitore con "ticket", come in ConfirmDialog
      onCancel={(e) => {
        e.preventDefault()
        onChiudi()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onChiudi()
      }}
      // Da telefono il ticket verticale e' alto: se non ci sta la finestra scorre invece di tagliarlo
      className="m-auto max-h-dvh w-full max-w-3xl overflow-y-auto bg-transparent p-0 text-on-surface backdrop:bg-surface-canvas/85 backdrop:backdrop-blur-md"
    >
      {ticket && (
        // Margini: il ticket e' inclinato di 2° e gli angoli non devono finire fuori dalla finestra
        // Clic sullo spazio vuoto intorno al ticket: chiude, come il clic sullo sfondo
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) onChiudi()
          }}
          className="flex flex-col items-center gap-space-lg px-space-md py-space-lg"
        >
          <h2 id={idTitolo} className="sr-only">
            Ticket per {ticket.evento.titolo}
          </h2>

          {/* key: cambiando ticket il Tear Ticket riparte (strappato o intero) */}
          <TicketStrappabile key={ticket.id} ticket={ticket} />

          <p className="max-w-md text-center font-body-md text-body-md text-on-surface-variant">
            {usato
              ? 'L’evento è concluso o annullato: il ticket non serve più per entrare.'
              : 'Mostra il codice QR all’ingresso. Alza la luminosità dello schermo se non viene letto.'}
          </p>

          <Button ref={chiudi} variant="secondary" icona="close" onClick={onChiudi}>
            Chiudi
          </Button>
        </div>
      )}
    </dialog>
  )
}
