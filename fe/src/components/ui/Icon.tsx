import { cx } from '@/lib/cx'

type IconProps = {
  /** Nome dell'icona Material Symbols, es. "notifications", "add_circle" */
  nome: string
  /** Dimensione in pixel (default 20) */
  size?: number
  /** Icona piena invece che a contorno */
  piena?: boolean
  className?: string
}

// Icona decorativa: nascosta agli screen reader. Se l'icona e' l'unico contenuto
// di un pulsante, il pulsante deve avere un aria-label.
export function Icon({ nome, size = 20, piena = false, className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cx('material-symbols-outlined shrink-0', className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${piena ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {nome}
    </span>
  )
}
