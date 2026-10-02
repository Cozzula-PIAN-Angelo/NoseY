import { useRef, useState } from 'react'
import { BadgeStato } from '@/components/eventi'
import { Link } from 'react-router'
import { Caricamento, Icon, MessaggioErrore, StatoVuoto, stilePulsante } from '@/components/ui'
import { useMieiTicketQuery } from '@/features/eventi/apiEventi'
import { TicketEvento } from '@/features/eventi/TicketEvento'
import { cx } from '@/lib/cx'
import { giorno } from '@/lib/formato'
import type { TicketResponse, Uuid } from '@/types/api'

// I miei ticket (FE1-08), rotta /tickets (solo con il login), come la schermata Stitch
// "I Miei Ticket (Snella & Ordinata)": schede Attivi / Passati, ticket aperto a sinistra (il QR
// solo con "Visualizza ticket", vedi TicketEvento), elenco a destra. Il backend li manda gia'
// ordinati: prima programmati e in corso, poi gli altri.

type Scheda = 'attivi' | 'passati'

const attivo = (t: TicketResponse) => t.evento.stato === 'PROGRAMMATO' || t.evento.stato === 'IN_CORSO'

export default function MieiTicket() {
  const { data: ticket = [], isLoading, error, refetch } = useMieiTicketQuery()
  const [scheda, setScheda] = useState<Scheda>('attivi')
  const [selezionatoId, setSelezionatoId] = useState<Uuid | null>(null)
  const dettaglio = useRef<HTMLDivElement>(null)

  /** Da telefono la lista sta sotto il ticket aperto: dopo la scelta si torna su a mostrarlo */
  function apri(id: Uuid) {
    setSelezionatoId(id)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      dettaglio.current?.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' })
    }
  }

  const gruppi = { attivi: ticket.filter(attivo), passati: ticket.filter((t) => !attivo(t)) }
  const elenco = gruppi[scheda]
  // Senza scelta si apre il primo della scheda
  const aperto = elenco.find((t) => t.id === selezionatoId) ?? elenco[0]

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-md md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">I miei ticket</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            I ticket dei tuoi eventi: mostra il codice all'ingresso.
          </p>
        </div>
        <div role="tablist" aria-label="Ticket" className="flex gap-1.5 self-start rounded-xl bg-surface-container-low p-1">
          {(['attivi', 'passati'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scheda === s}
              onClick={() => setScheda(s)}
              className={cx(
                'flex items-center gap-2 rounded-lg px-space-md py-space-xs font-label-btn text-label-btn transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                scheda === s ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {s === 'attivi' ? 'Attivi e programmati' : 'Passati e annullati'}
              <span className="rounded-full bg-surface-container-high px-1.5 py-0.5 font-label-code-status text-label-code-status">
                {gruppi[s].length}
              </span>
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <Caricamento riquadro testo="Carico i tuoi ticket..." />
      ) : error ? (
        <MessaggioErrore errore={error} onRiprova={refetch} />
      ) : !aperto ? (
        <StatoVuoto
          icona="confirmation_number"
          titolo={scheda === 'attivi' ? 'Nessun ticket attivo' : 'Nessun ticket passato'}
          messaggio={
            scheda === 'attivi'
              ? 'Quando ti iscrivi a un evento il ticket compare qui.'
              : 'Qui trovi i ticket degli eventi conclusi o annullati.'
          }
          azione={
            scheda === 'attivi' && (
              <Link to="/map" className={stilePulsante()}>
                <Icon nome="map" size={18} />
                Trova un evento
              </Link>
            )
          }
        />
      ) : (
        <div className="grid items-start gap-space-lg lg:grid-cols-12">
          <div ref={dettaglio} className="flex scroll-mt-20 flex-col gap-space-sm lg:col-span-7">
            <TicketEvento ticket={aperto} conEvento />
            <Link to={`/events/${aperto.evento.id}`} className={cx(stilePulsante({ variant: 'secondary' }), 'self-start')}>
              <Icon nome="visibility" size={18} />
              Vedi evento
            </Link>
          </div>

          <section aria-labelledby="titolo-pass" className="flex flex-col gap-space-sm lg:col-span-5">
            <h2 id="titolo-pass" className="px-space-xs font-headline-sm text-headline-sm">
              I tuoi pass
            </h2>
            <ul className="flex flex-col gap-space-sm">
              {elenco.map((t) => {
                const selezionato = t.id === aperto.id
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-pressed={selezionato}
                      onClick={() => apri(t.id)}
                      className={cx(
                        'flex w-full flex-col gap-space-xs rounded-xl border-l-2 p-space-md text-left transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                        selezionato ? 'border-primary bg-surface-container' : 'border-transparent bg-surface-card hover:bg-surface-container',
                      )}
                    >
                      <span className="flex items-start justify-between gap-space-sm">
                        <span className="font-headline-sm text-headline-sm leading-snug text-on-surface">{t.evento.titolo}</span>
                        <BadgeStato stato={t.evento.stato} />
                      </span>
                      <span className="flex items-center justify-between gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <Icon nome="calendar_today" size={16} />
                          {giorno(t.evento.dataEvento)}
                        </span>
                        {/* Inizio e fine del codice, come nella schermata Stitch */}
                        <code className="font-mono text-body-sm text-secondary">
                          {t.codice.slice(0, 4)}…{t.codice.slice(-4)}
                        </code>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
