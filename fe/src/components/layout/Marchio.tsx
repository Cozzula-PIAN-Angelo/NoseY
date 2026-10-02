import { cx } from '@/lib/cx'

type MarchioProps = {
  /** Dimensione del testo, es. "text-[28px]" (barra) o "text-[22px]" (piè di pagina) */
  className?: string
}

/** Le due lettere in Syne extra grassetto, appena piu' grandi per arrivare all'altezza di Righteous */
const LETTERA_SYNE = 'font-marchio-y text-[1.1em] font-extrabold'

// Scritta "NoseY" del marchio: la N e la Y in Syne, "ose" in Righteous (come un'insegna al neon).
// La Y e' dorata come l'anello del logo (sfumatura con i colori oro-anello del tema); il colore della
// N e di "ose" si eredita: nella barra diventa viola al passaggio del mouse sul logo.
export function Marchio({ className }: MarchioProps) {
  return (
    <span className={cx('font-marchio leading-none tracking-[0.01em]', className)}>
      <span className={LETTERA_SYNE}>N</span>
      ose
      <span className={cx(LETTERA_SYNE, 'bg-gradient-to-b from-oro-anello-chiaro via-oro-anello to-oro-anello-scuro bg-clip-text text-transparent')}>
        Y
      </span>
    </span>
  )
}
