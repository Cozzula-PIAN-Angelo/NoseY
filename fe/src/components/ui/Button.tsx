import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { Icon } from './Icon'

// Varianti prese dalle schermate Stitch:
//   primary    "Iscriviti Subito", "Esplora Mappa Live"
//   gradient   "Ticket Rapido", "Invia" (azione principale in evidenza)
//   secondary  "Dettagli Evento", "Dettagli & POI"
//   gold       "Crea Evento" nell'header
//   ghost      voci di menu e azioni leggere
//   danger     "Annulla Iscrizione", "Esci"
export type ButtonVariant = 'primary' | 'gradient' | 'secondary' | 'gold' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const varianti: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container shadow-md',
  gradient:
    'bg-gradient-to-r from-inverse-primary to-primary-container text-white shadow-[0_0_20px_rgba(99,102,241,0.45)] hover:shadow-[0_0_28px_rgba(99,102,241,0.7)]',
  secondary: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
  gold: 'bg-surface-container text-tertiary hover:bg-surface-container-high shadow-[0_0_12px_rgba(245,158,11,0.12)]',
  ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
  danger: 'text-status-annullato hover:bg-status-annullato/10',
}

const dimensioni: Record<ButtonSize, string> = {
  sm: 'px-space-sm py-space-xs gap-1',
  md: 'px-space-md py-space-sm gap-space-xs',
  lg: 'px-space-lg py-3 gap-space-xs rounded-xl',
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Icona Material Symbols prima del testo */
  icona?: string
  /** Icona Material Symbols dopo il testo */
  iconaDopo?: string
  /** Mostra la rotellina e disabilita il pulsante (es. durante una chiamata API) */
  inCorso?: boolean
  /** Occupa tutta la larghezza disponibile */
  pieno?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icona,
  iconaDopo,
  inCorso = false,
  pieno = false,
  type = 'button',
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || inCorso}
      aria-busy={inCorso || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-label-btn text-label-btn transition-all cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        varianti[variant],
        dimensioni[size],
        pieno && 'w-full',
        className,
      )}
      {...props}
    >
      {inCorso ? (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icona && <Icon nome={icona} size={18} />
      )}
      {children}
      {iconaDopo && <Icon nome={iconaDopo} size={18} />}
    </button>
  )
}
