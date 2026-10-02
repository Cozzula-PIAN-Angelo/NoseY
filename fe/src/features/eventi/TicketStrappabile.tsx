import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BadgeStato } from '@/components/eventi'
import TearTicket from '@/components/reactbits/TearTicket'
import { useVediEventoQuery } from '@/features/eventi/apiEventi'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import { giorno, intervallo } from '@/lib/formato'
import type { TicketResponse } from '@/types/api'

// Ticket "da tenere in mano" con il Tear Ticket di React Bits (components/reactbits): QR e codice
// nel corpo, ingresso NoseY nella matrice, la copertina dell'evento come sfondo.
// Il backend non sa nulla di ticket "usati" (la convalida la fa chi scansiona il QR), quindi la
// matrice non si strappa mai a mano: i ticket attivi restano interi, quelli di eventi conclusi
// o annullati compaiono gia' strappati, con il timbro e la copertina in grigio.
// Da telefono il ticket diventa verticale: in orizzontale si rimpicciolirebbe e il QR non si leggerebbe.

const ORIZZONTALE = { width: 680, height: 280, stubSize: 170 }
const VERTICALE = { width: 340, height: 600, stubSize: 140 }

const TIMBRO = { CONCLUSO: 'Evento concluso', ANNULLATO: 'Annullato' } as const

/** true sotto i 640px (breakpoint "sm" di Tailwind) */
function useStretto() {
  const query = '(max-width: 639px)'
  const [stretto, setStretto] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const cambia = () => setStretto(mq.matches)
    mq.addEventListener('change', cambia)
    return () => mq.removeEventListener('change', cambia)
  }, [])
  return stretto
}

export function TicketStrappabile({ ticket }: { ticket: TicketResponse }) {
  const stretto = useStretto()
  const misure = stretto ? VERTICALE : ORIZZONTALE
  const { evento, partecipante, codice } = ticket
  const usato = evento.stato === 'CONCLUSO' || evento.stato === 'ANNULLATO'

  // La copertina sta nel dettaglio dell'evento (TicketResponse non ce l'ha): dalla cache se gia' aperto
  const { currentData: dettaglio } = useVediEventoQuery(evento.id)
  const copertina = urlImmagine(dettaglio?.foto[0]?.url) ?? undefined

  const qr = (
    <div className="shrink-0 rounded-lg bg-white p-1.5 shadow-lg">
      <QRCodeSVG value={codice} size={stretto ? 132 : 112} level="M" title={`Codice QR del ticket ${codice}`} />
    </div>
  )

  const datiEvento = (
    <div className="flex min-w-0 flex-col gap-1">
      <BadgeStato stato={evento.stato} className="self-start" />
      <p className="line-clamp-2 font-headline-sm text-headline-sm leading-tight text-on-surface [text-shadow:0_1px_8px_rgb(0_0_0/0.8)]">
        {evento.titolo}
      </p>
      <p className="font-body-sm text-body-sm text-on-surface-variant [text-shadow:0_1px_6px_rgb(0_0_0/0.8)]">
        {intervallo(evento.dataEvento, evento.dataFine)}
      </p>
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        {partecipante.nome} {partecipante.cognome}
      </p>
    </div>
  )

  return (
    <TearTicket
      {...misure}
      orientation={stretto ? 'vertical' : 'horizontal'}
      // Meno inclinato del default (4°): il ticket resta dentro il suo spazio
      rotate={2}
      // Mai strappabile a mano (vedi sopra); senza questa classe "disabled" lo renderebbe trasparente
      disabled
      className="mx-auto data-[disabled]:opacity-100"
      // Stato iniziale: chi lo mostra usa key={ticket.id}, cosi' cambiando ticket riparte da capo
      defaultTorn={usato}
      image={copertina}
      imageAlt=""
      background="var(--color-surface-card)"
      color="var(--color-on-surface)"
      stubBackground="linear-gradient(160deg, var(--color-inverse-primary), var(--color-primary-container))"
      ariaLabel={`Matrice del ticket per ${evento.titolo}`}
      stub={
        // Matrice: l'ingresso, con l'inizio e la fine del codice come nell'elenco dei pass
        <div className={cx('flex h-full items-center justify-center gap-space-sm p-space-sm text-white', stretto ? 'flex-row' : 'flex-col text-center')}>
          <img src="/logo-nosey.png" alt="" className="size-10 rounded-lg" draggable={false} />
          <div className="flex flex-col gap-0.5">
            <span className="font-label-code-status text-label-code-status uppercase tracking-[0.3em]">Ingresso</span>
            <span className="font-headline-sm text-headline-sm">{giorno(evento.dataEvento)}</span>
            <code className="font-mono text-body-sm opacity-80">
              {codice.slice(0, 4)}…{codice.slice(-4)}
            </code>
          </div>
        </div>
      }
    >
      <div className={cx('relative flex h-full gap-space-sm p-space-md', stretto ? 'flex-col items-center justify-between' : 'items-end justify-between')}>
        {stretto ? (
          <>
            <div className="mt-space-lg">{qr}</div>
            <div className="w-full">{datiEvento}</div>
          </>
        ) : (
          <>
            {datiEvento}
            {qr}
          </>
        )}

        {usato && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-4 border-status-annullato px-space-md py-space-xs font-headline-sm text-headline-sm uppercase tracking-widest text-status-annullato opacity-90"
          >
            {TIMBRO[evento.stato as keyof typeof TIMBRO]}
          </span>
        )}
      </div>
    </TearTicket>
  )
}
