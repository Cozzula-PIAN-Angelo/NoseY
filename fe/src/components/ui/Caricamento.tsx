import { cx } from '@/lib/cx'

type CaricamentoProps = {
  /** Testo accanto alla rotellina (default "Caricamento...") */
  testo?: string
  /** Centra la rotellina in un riquadro alto, al posto del contenuto che sta arrivando */
  riquadro?: boolean
  className?: string
}

// Rotellina di caricamento, es. mentre RTK Query ha isLoading = true.
export function Caricamento({ testo = 'Caricamento...', riquadro = false, className }: CaricamentoProps) {
  return (
    <div
      role="status"
      className={cx(
        'flex items-center gap-space-sm text-on-surface-variant',
        riquadro && 'min-h-48 justify-center rounded-xl bg-surface-card p-space-xl',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-5 shrink-0 animate-spin rounded-full border-2 border-primary-container border-t-transparent"
      />
      <span className="font-body-md text-body-md">{testo}</span>
    </div>
  )
}

// Blocco grigio pulsante che occupa il posto di un contenuto non ancora arrivato
// (es. le card degli eventi). Le dimensioni si danno con className: "h-48 w-full".
export function Scheletro({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx('rounded-xl bg-surface-container motion-safe:animate-pulse', className)}
    />
  )
}
