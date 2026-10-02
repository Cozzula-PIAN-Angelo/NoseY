import { useState } from 'react'
import { BadgeStato } from '@/components/eventi'
import { Button, Icon } from '@/components/ui'
import { dataOra, intervallo } from '@/lib/formato'
import type { TicketResponse } from '@/types/api'
import { FinestraTicket } from './FinestraTicket'

type TicketEventoProps = {
  ticket: TicketResponse
  /** Mostra anche titolo, stato e date dell'evento (nella pagina "I miei ticket", FE1-08) */
  conEvento?: boolean
}

// Ticket di un'iscrizione (FE1-06), come nella schermata Stitch "I Miei Ticket": titolare e data
// di emissione. QR e codice completo non si vedono qui: valgono per entrare, quindi stanno solo nel
// ticket grande (FinestraTicket, Tear Ticket di React Bits) che si apre con "Visualizza ticket".
// Al loro posto, l'inizio e la fine del codice, come nell'elenco dei pass.
export function TicketEvento({ ticket, conEvento = false }: TicketEventoProps) {
  const [aperto, setAperto] = useState(false)

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

      <div className="flex flex-col items-center gap-space-md rounded-xl bg-surface-container-lowest p-space-md sm:flex-row">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon nome="qr_code_2" size={36} />
        </span>

        <div className="flex w-full min-w-0 flex-col items-center gap-1 text-center sm:items-start sm:text-left">
          <span className="font-label-code-status text-label-code-status uppercase text-outline">Codice del ticket</span>
          <code className="font-mono text-body-sm text-secondary">
            {ticket.codice.slice(0, 4)}…{ticket.codice.slice(-4)}
          </code>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Apri il ticket per mostrare il QR all'ingresso.</p>
        </div>

        <Button icona="confirmation_number" className="shrink-0" onClick={() => setAperto(true)}>
          Visualizza ticket
        </Button>
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

      <FinestraTicket ticket={aperto ? ticket : null} onChiudi={() => setAperto(false)} />
    </section>
  )
}
