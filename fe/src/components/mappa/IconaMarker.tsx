import { Icon } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { StatoEvento, TipoPoi } from '@/types/api'

// Icone dei marker (FE1-02), disegnate come nella mappa radar di Stitch.
// Sono componenti normali: si possono usare anche fuori dalla mappa (legenda, card dei POI).

// Classi scritte per intero: Tailwind genera solo le classi che trova cosi' nel codice.
export const STILE_POI: Record<TipoPoi, { icona: string; etichetta: string; testo: string; sfondo: string; bordo: string }> = {
  INGRESSO: {
    icona: 'login',
    etichetta: 'Ingresso',
    testo: 'text-poi-ingresso',
    sfondo: 'bg-poi-ingresso/15',
    bordo: 'ring-poi-ingresso/60',
  },
  USCITA: {
    icona: 'logout',
    etichetta: 'Uscita',
    testo: 'text-poi-uscita',
    sfondo: 'bg-poi-uscita/15',
    bordo: 'ring-poi-uscita/60',
  },
  EMERGENZA: {
    icona: 'medical_services',
    etichetta: 'Emergenza',
    testo: 'text-poi-emergenza',
    sfondo: 'bg-poi-emergenza/15',
    bordo: 'ring-poi-emergenza/60',
  },
}

export const STILE_STATO: Record<StatoEvento, { etichetta: string; pallino: string; alone: string }> = {
  PROGRAMMATO: {
    etichetta: 'Programmato',
    pallino: 'bg-status-programmato shadow-[0_0_10px_var(--color-status-programmato)]',
    alone: 'bg-status-programmato/30',
  },
  IN_CORSO: {
    etichetta: 'In corso',
    pallino: 'bg-status-in-corso shadow-[0_0_10px_var(--color-status-in-corso)]',
    alone: 'bg-status-in-corso/30',
  },
  CONCLUSO: { etichetta: 'Concluso', pallino: 'bg-status-concluso', alone: 'bg-status-concluso/30' },
  ANNULLATO: { etichetta: 'Annullato', pallino: 'bg-status-annullato', alone: 'bg-status-annullato/30' },
}

/** Evento: pallino colorato dallo stato; alone pulsante se e' in corso o selezionato */
export function IconaEvento({ stato, selezionato = false }: { stato: StatoEvento; selezionato?: boolean }) {
  const s = STILE_STATO[stato]
  return (
    <span className="relative flex size-8 items-center justify-center">
      {(stato === 'IN_CORSO' || selezionato) && (
        <span aria-hidden="true" className={cx('absolute inset-0 rounded-full motion-safe:animate-ping', s.alone)} />
      )}
      <span
        className={cx(
          'relative flex size-7 items-center justify-center rounded-full bg-surface-card shadow-lg transition-transform',
          selezionato ? 'scale-125 ring-2 ring-primary' : 'hover:scale-125',
        )}
      >
        <span className={cx('size-3 rounded-full', s.pallino)} />
      </span>
    </span>
  )
}

/** POI: quadratino con l'icona del tipo (ingresso, uscita, emergenza) */
export function IconaPoi({ tipo }: { tipo: TipoPoi }) {
  const s = STILE_POI[tipo]
  return (
    <span
      className={cx(
        'flex size-8 items-center justify-center rounded-lg bg-surface-card shadow-lg ring-2 transition-transform hover:scale-110',
        s.bordo,
      )}
    >
      <span className={cx('flex size-full items-center justify-center rounded-lg', s.sfondo)}>
        <Icon nome={s.icona} size={18} className={s.testo} />
      </span>
    </span>
  )
}
