import { cx } from '@/lib/cx'
import type { StatoEvento } from '@/types/api'

// Pillola dello stato dell'evento (concordata in TEAM-02, docs/interfacce.md), con gli
// stessi colori dei marker della mappa. La usano card, dettaglio, ticket.

const stili: Record<StatoEvento, { etichetta: string; classi: string; pallino: string }> = {
  PROGRAMMATO: { etichetta: 'Programmato', classi: 'bg-status-programmato/20 text-status-programmato', pallino: 'bg-status-programmato' },
  IN_CORSO: { etichetta: 'In corso', classi: 'bg-status-in-corso/20 text-status-in-corso', pallino: 'bg-status-in-corso' },
  CONCLUSO: { etichetta: 'Concluso', classi: 'bg-status-concluso/20 text-on-surface-variant', pallino: 'bg-status-concluso' },
  ANNULLATO: { etichetta: 'Annullato', classi: 'bg-status-annullato/20 text-status-annullato', pallino: 'bg-status-annullato' },
}

export function BadgeStato({ stato, className }: { stato: StatoEvento; className?: string }) {
  const s = stili[stato]
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-space-xs py-0.5 font-label-code-status text-label-code-status uppercase',
        s.classi,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx('size-1.5 rounded-full', s.pallino, stato === 'IN_CORSO' && 'motion-safe:animate-pulse')}
      />
      {s.etichetta}
    </span>
  )
}
