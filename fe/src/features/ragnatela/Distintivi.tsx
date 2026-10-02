import { Icon } from '@/components/ui'
import { cx } from '@/lib/cx'
import { CATEGORIE, STATI, URGENZE, type Categoria, type StatoSegnalazione, type Urgenza } from './tipi'

// Piccoli elementi grafici della Modalita' Ragnatela, presi dalle card delle schermate Stitch.

const soloOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' })

/** "21:04" */
export const oraDi = (istante: number) => soloOra.format(new Date(istante))

/** "ADESSO", "3 MIN FA", "2 H FA" */
export function tempoFa(istante: number, ora: number): string {
  const minuti = Math.floor((ora - istante) / 60_000)
  if (minuti < 1) return 'Adesso'
  if (minuti < 60) return `${minuti} min fa`
  const ore = Math.floor(minuti / 60)
  return ore < 24 ? `${ore} h fa` : `${Math.floor(ore / 24)} g fa`
}

/** Stato: badge obliquo con icona e testo (mai solo il colore). Pensato per le card bianche */
export function BadgeStato({ stato, className }: { stato: StatoSegnalazione; className?: string }) {
  const s = STATI[stato]
  return (
    <span
      className={cx(
        'rg-obliquo inline-flex shrink-0 items-center border px-2 py-0.5',
        s.testo,
        s.sfondo,
        s.bordo,
        className,
      )}
    >
      <span className="rg-dritto rg-titolo gap-1 text-[11px] font-bold tracking-wider">
        <Icon nome={s.icona} size={14} piena={stato === 'IN_ARRIVO'} />
        {stato === 'IN_ARRIVO' ? 'Spider-Man in arrivo' : s.etichetta}
      </span>
    </span>
  )
}

/** Urgenza: tre barrette verticali, con il testo per lo screen reader */
export function BarreUrgenza({ urgenza, spente = 'bg-slate-200' }: { urgenza: Urgenza; spente?: string }) {
  const u = URGENZE[urgenza]
  return (
    <span role="img" aria-label={`Urgenza ${u.etichetta.toLowerCase()}`} title={`Urgenza ${u.etichetta.toLowerCase()}`} className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cx('h-3.5 w-1 rounded-[1px]', i < u.barre ? u.colore : spente, i < u.barre && urgenza === 'ALTA' && 'rg-pulsa')}
        />
      ))}
    </span>
  )
}

/** Categoria in ocra maiuscolo, come gli occhielli delle card ("PERSONA IN PERICOLO") */
export function EtichettaCategoria({ categoria, className }: { categoria: Categoria; className?: string }) {
  return (
    <span className={cx('text-[10px] font-bold uppercase tracking-[0.14em]', className)}>
      {CATEGORIE[categoria].etichetta}
    </span>
  )
}

/** Marker della mappa: rombo colorato dallo stato con l'icona della categoria */
export function RomboSegnalazione({
  stato,
  categoria,
  selezionato = false,
}: {
  stato: StatoSegnalazione
  categoria: Categoria
  selezionato?: boolean
}) {
  const s = STATI[stato]
  return (
    <span className="relative flex size-10 items-center justify-center">
      {(stato === 'APERTA' || selezionato) && (
        <span aria-hidden="true" className={cx('absolute size-9 rounded-full opacity-40 motion-safe:animate-ping', s.rombo)} />
      )}
      <span
        className={cx(
          'flex size-7 rotate-45 items-center justify-center border transition-transform',
          s.rombo,
          // Sull'oro l'icona scura, come il marker "Soccorso civile" di Stitch
          stato === 'IN_ARRIVO' ? 'text-slate-900' : 'text-white',
          selezionato ? 'scale-125 border-2 border-white' : 'border-white/60 hover:scale-125',
        )}
      >
        <Icon nome={CATEGORIE[categoria].icona} size={15} className="-rotate-45" />
      </span>
    </span>
  )
}
