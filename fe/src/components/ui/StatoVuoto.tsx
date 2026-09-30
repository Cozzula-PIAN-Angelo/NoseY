import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon } from './Icon'

type StatoVuotoProps = {
  /** Icona Material Symbols (default "search_off") */
  icona?: string
  titolo: string
  /** Spiegazione sotto il titolo */
  messaggio?: string
  /** Azione suggerita, es. <Button variant="secondary">Reimposta ricerca</Button> */
  azione?: ReactNode
  className?: string
}

// Quando una lista e' vuota: nessun evento, nessun ticket, nessun amico, nessun risultato.
export function StatoVuoto({ icona = 'search_off', titolo, messaggio, azione, className }: StatoVuotoProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-space-sm rounded-xl bg-surface-card p-space-xl text-center',
        className,
      )}
    >
      <Icon nome={icona} size={48} className="text-outline" />
      <h3 className="font-headline-sm text-headline-sm text-on-surface">{titolo}</h3>
      {messaggio && <p className="max-w-md font-body-md text-body-md text-on-surface-variant">{messaggio}</p>}
      {azione && <div className="mt-space-sm">{azione}</div>}
    </div>
  )
}
