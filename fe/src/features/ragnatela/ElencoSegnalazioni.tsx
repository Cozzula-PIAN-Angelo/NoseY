import { Icon } from '@/components/ui'
import { cx } from '@/lib/cx'
import { BadgeStato, BarreUrgenza, EtichettaCategoria, tempoFa } from './Distintivi'
import { statoAl } from './sequenza'
import { STATI, type Segnalazione, type StatoSegnalazione } from './tipi'

export type FiltroStato = 'TUTTE' | StatoSegnalazione

const filtri: { valore: FiltroStato; etichetta: string }[] = [
  { valore: 'TUTTE', etichetta: 'Tutte' },
  { valore: 'APERTA', etichetta: 'Aperte' },
  { valore: 'IN_ARRIVO', etichetta: 'In arrivo' },
  { valore: 'RISOLTA', etichetta: 'Risolte' },
]

/** Filtri per stato, pulsanti obliqui come la striscia sotto il radar di Stitch */
export function FiltriStato({
  filtro,
  conteggi,
  onCambia,
  className,
}: {
  filtro: FiltroStato
  conteggi: Record<FiltroStato, number>
  onCambia: (f: FiltroStato) => void
  className?: string
}) {
  return (
    <div role="group" aria-label="Filtra per stato" className={cx('flex flex-wrap items-center gap-1.5', className)}>
      {filtri.map((f) => {
        const attivo = filtro === f.valore
        return (
          <button
            key={f.valore}
            type="button"
            aria-pressed={attivo}
            onClick={() => onCambia(f.valore)}
            className={cx(
              'rg-obliquo cursor-pointer border px-3 py-1 transition-colors',
              attivo
                ? 'border-transparent bg-(--rg-rosso) text-white'
                : 'border-white/5 bg-(--rg-card) text-slate-300 hover:bg-(--rg-rialzata) hover:text-white',
            )}
          >
            <span className="rg-dritto rg-titolo text-xs font-bold tabular-nums">
              {f.etichetta} ({conteggi[f.valore]})
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Card bianca "ad alto contrasto" di una segnalazione, come le card di "Emergenze in corso" */
function CardSegnalazione({ s, ora, onApri }: { s: Segnalazione; ora: number; onApri: () => void }) {
  const stato = statoAl(s, ora)
  return (
    <li>
      <button
        type="button"
        onClick={onApri}
        className={cx(
          'flex w-full cursor-pointer flex-col gap-1.5 border-l-4 bg-(--rg-pannello) p-4 text-left text-(--rg-inchiostro)',
          'shadow-[0_12px_30px_rgba(0,0,0,0.7)] transition-transform hover:-translate-y-0.5',
          STATI[stato].bordo,
          stato === 'RISOLTA' && 'opacity-95',
        )}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-2">
            <BarreUrgenza urgenza={s.urgenza} />
            <EtichettaCategoria categoria={s.categoria} className="text-(--rg-oro-testo)" />
          </span>
          <span className="rg-titolo shrink-0 text-[11px] font-semibold tracking-wider text-slate-500">{tempoFa(s.creata, ora)}</span>
        </span>
        <span className="rg-titolo text-lg leading-snug font-bold">{s.titolo}</span>
        {s.descrizione && <span className="line-clamp-2 text-xs leading-relaxed text-(--rg-inchiostro-tenue)">{s.descrizione}</span>}
        <span className="mt-1 flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5">
          <BadgeStato stato={stato} />
          <span aria-hidden="true" className="rg-obliquo bg-(--rg-inchiostro) px-3 py-1.5 text-white">
            <span className="rg-dritto rg-titolo text-[10px] font-bold tracking-wider">Dettagli</span>
          </span>
        </span>
      </button>
    </li>
  )
}

/** Card bianca della hero di Stitch, mostrata finche' non ci sono segnalazioni */
export function BenvenutoRagnatela({ onNuova }: { onNuova: () => void }) {
  return (
    <div className="relative overflow-hidden border-t-4 border-(--rg-rosso) bg-(--rg-pannello) p-5 text-(--rg-inchiostro) shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
      <div aria-hidden="true" className="rg-obliquo absolute top-0 right-0 h-3 w-24 translate-x-3 bg-(--rg-rosso)" />
      <div aria-hidden="true" className="rg-obliquo absolute top-0 right-20 h-3 w-8 bg-(--rg-oro)" />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rg-obliquo bg-(--rg-rosso) px-2 py-0.5 text-white">
          <span className="rg-dritto rg-titolo text-[10px] font-bold tracking-widest">Ragnatela</span>
        </span>
        <span className="text-[10px] font-bold tracking-[0.16em] text-(--rg-oro-testo) uppercase">Live dispatch • Protocollo 01</span>
      </div>
      <h3 className="rg-titolo mb-2 text-2xl leading-none font-bold">Ragnatela: la rete di protezione urbana</h3>
      <p className="mb-4 text-sm leading-relaxed text-(--rg-inchiostro-tenue)">
        Hai trovato la linea diretta con il tuo amichevole Spider-Man di quartiere. Segna un punto sulla mappa,
        racconta cosa succede e aspetta la sua risposta.
      </p>
      <button type="button" onClick={onNuova} className="rg-obliquo rg-azione cursor-pointer px-5 py-2.5">
        <span className="rg-dritto rg-titolo text-sm font-bold tracking-wider">
          Chiama Spider-Man
          <Icon nome="arrow_forward" size={18} />
        </span>
      </button>
    </div>
  )
}

/** Le mie segnalazioni, gia' filtrate e ordinate dalla piu' recente */
export function ElencoSegnalazioni({
  segnalazioni,
  ora,
  onApri,
}: {
  segnalazioni: Segnalazione[]
  ora: number
  onApri: (s: Segnalazione) => void
}) {
  if (segnalazioni.length === 0) {
    return (
      <p className="border border-dashed border-white/15 p-space-lg text-center font-body-md text-body-md text-(--rg-testo-tenue)">
        Nessuna segnalazione in questo stato.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {segnalazioni.map((s) => (
        <CardSegnalazione key={s.id} s={s} ora={ora} onApri={() => onApri(s)} />
      ))}
    </ul>
  )
}
