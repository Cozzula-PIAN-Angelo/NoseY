import { useEffect, useId, useRef, useState } from 'react'
import { Button, Icon, useAvviso } from '@/components/ui'
import type { TicketResponse } from '@/types/api'
import { TicketStrappabile } from './TicketStrappabile'

type FinestraTicketProps = {
  /** Il ticket da mostrare, null = finestra chiusa */
  ticket: TicketResponse | null
  onChiudi: () => void
}

// Finestra "Visualizza ticket": il ticket grande, da mostrare all'ingresso, con il Tear Ticket di
// React Bits (TicketStrappabile) e sotto il codice completo da copiare. QR e codice completo si
// vedono solo qui, mai aperti nella pagina. Stesso <dialog> nativo di ConfirmDialog:
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
      // Il focus parte da "Chiudi", non dal primo elemento (ora "Copia"), ma senza scorrere fin
      // laggiu': da telefono la finestra e' piu' alta dello schermo e si vede prima il ticket
      chiudi.current?.focus({ preventScroll: true })
      dialog.scrollTop = 0
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
      // Da telefono il ticket verticale e' alto: se non ci sta la finestra scorre invece di tagliarlo.
      // In orizzontale mai: inclinazione 3D e ticket strappato (spostato al centro) sbordano di poco
      className="m-auto max-h-dvh w-full max-w-3xl overflow-x-hidden overflow-y-auto bg-transparent p-0 text-on-surface backdrop:bg-surface-canvas/85 backdrop:backdrop-blur-md"
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

          <CodiceCompleto key={`codice-${ticket.id}`} codice={ticket.codice} />

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

// ---------------------------------------------------------------- Codice completo

/**
 * Il codice intero, con "Copia" (stesso comportamento che aveva TicketEvento): vale quanto il QR,
 * quindi come il QR si vede solo qui dentro, a ticket aperto
 */
function CodiceCompleto({ codice }: { codice: string }) {
  const avviso = useAvviso()
  const [copiato, setCopiato] = useState(false)

  async function copia() {
    try {
      await navigator.clipboard.writeText(codice)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 2000)
    } catch {
      avviso.attenzione('Copia non riuscita', 'Seleziona il codice e copialo a mano.')
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-space-xs">
      <span className="font-label-code-status text-label-code-status uppercase text-outline">Codice del ticket</span>
      <div className="flex items-center gap-space-xs rounded-lg bg-surface-container px-space-sm py-space-xs">
        <code className="min-w-0 flex-1 select-all break-all font-mono text-body-sm text-primary">{codice}</code>
        <button
          type="button"
          onClick={copia}
          className="flex shrink-0 items-center gap-1 rounded-md px-space-xs py-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          <Icon nome={copiato ? 'check' : 'content_copy'} size={16} />
          <span aria-live="polite">{copiato ? 'Copiato' : 'Copia'}</span>
        </button>
      </div>
    </div>
  )
}
