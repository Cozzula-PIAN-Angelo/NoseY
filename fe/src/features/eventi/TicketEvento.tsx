import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BadgeStato } from '@/components/eventi'
import { Icon, useAvviso } from '@/components/ui'
import { dataOra, intervallo } from '@/lib/formato'
import type { TicketResponse } from '@/types/api'

type TicketEventoProps = {
  ticket: TicketResponse
  /** Mostra anche titolo, stato e date dell'evento (nella pagina "I miei ticket", FE1-08) */
  conEvento?: boolean
}

// Ticket di un'iscrizione (FE1-06), come nella schermata Stitch "I Miei Ticket":
// QR e codice da mostrare all'ingresso, titolare, data di emissione.
export function TicketEvento({ ticket, conEvento = false }: TicketEventoProps) {
  const avviso = useAvviso()
  const [copiato, setCopiato] = useState(false)

  async function copia() {
    try {
      await navigator.clipboard.writeText(ticket.codice)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 2000)
    } catch {
      avviso.attenzione('Copia non riuscita', 'Seleziona il codice e copialo a mano.')
    }
  }

  return (
    <section aria-label={`Ticket per ${ticket.evento.titolo}`} className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg">
      {conEvento && (
        <header className="flex flex-col gap-space-xs">
          <BadgeStato stato={ticket.evento.stato} className="self-start" />
          <h3 className="font-headline-sm text-headline-sm">{ticket.evento.titolo}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {intervallo(ticket.evento.dataEvento, ticket.evento.dataFine)}
          </p>
        </header>
      )}

      <div className="flex flex-col items-center gap-space-md rounded-xl bg-surface-container-lowest p-space-md sm:flex-row sm:items-start">
        {/* Il QR contiene solo il codice del ticket */}
        <div className="shrink-0 rounded-xl bg-white p-space-sm">
          <QRCodeSVG value={ticket.codice} size={128} level="M" title={`Codice QR del ticket ${ticket.codice}`} />
        </div>

        <div className="flex w-full min-w-0 flex-col gap-space-xs">
          <span className="font-label-code-status text-label-code-status uppercase text-outline">Codice del ticket</span>
          <div className="flex items-center gap-space-xs rounded-lg bg-surface-container px-space-sm py-space-xs">
            <code className="min-w-0 flex-1 select-all break-all font-mono text-body-sm text-primary">{ticket.codice}</code>
            <button
              type="button"
              onClick={copia}
              className="flex shrink-0 items-center gap-1 rounded-md px-space-xs py-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <Icon nome={copiato ? 'check' : 'content_copy'} size={16} />
              <span aria-live="polite">{copiato ? 'Copiato' : 'Copia'}</span>
            </button>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Mostra il codice all'ingresso.</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-space-md">
        <div className="flex flex-col">
          <dt className="font-label-code-status text-label-code-status uppercase text-outline">Titolare</dt>
          <dd className="font-label-btn text-label-btn text-on-surface">
            {ticket.partecipante.nome} {ticket.partecipante.cognome}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="font-label-code-status text-label-code-status uppercase text-outline">Emesso il</dt>
          <dd className="font-label-btn text-label-btn text-on-surface">{dataOra(ticket.emessoIl)}</dd>
        </div>
      </dl>
    </section>
  )
}
