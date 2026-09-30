import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

// Classi comuni a input, textarea e select (campo di ricerca di Stitch).
export const classiInput = cx(
  'w-full rounded-lg bg-surface-container-lowest px-space-md py-space-sm text-on-surface',
  'font-body-md text-body-md placeholder:text-outline transition-all',
  'focus:outline-none focus:ring-2 focus:ring-primary-container',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:ring-2 aria-invalid:ring-status-annullato',
)

export type CampoProps = {
  /** Etichetta sopra il campo */
  etichetta?: string
  /** Testo d'aiuto sotto il campo */
  aiuto?: string
  /** Messaggio d'errore sotto il campo (es. da ErroreResponse.campi[nomeCampo]) */
  errore?: string
  /** Campo obbligatorio: aggiunge l'asterisco all'etichetta */
  obbligatorio?: boolean
}

type CampoWrapperProps = CampoProps & {
  id: string
  /** Contenuto a destra sotto il campo, es. il contatore "0 / 2000" */
  extra?: ReactNode
  className?: string
  children: ReactNode
}

// Id degli elementi di aiuto ed errore, da collegare al campo con aria-describedby.
export function idDescrizione(id: string, { aiuto, errore }: CampoProps): string | undefined {
  const ids = [aiuto && `${id}-aiuto`, errore && `${id}-errore`].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

// Contenitore comune: etichetta, campo, aiuto ed errore. Lo usano TextField,
// TextArea, Select e DateTimeField; non serve usarlo direttamente nelle pagine.
export function Campo({
  id,
  etichetta,
  aiuto,
  errore,
  obbligatorio,
  extra,
  className,
  children,
}: CampoWrapperProps) {
  return (
    <div className={cx('flex flex-col gap-space-xs', className)}>
      {etichetta && (
        <label
          htmlFor={id}
          className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant"
        >
          {etichetta}
          {obbligatorio && (
            <span aria-hidden="true" className="ml-0.5 text-tertiary">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {(aiuto || errore || extra) && (
        <div className="flex items-start justify-between gap-space-sm font-body-sm text-body-sm">
          <div className="flex flex-col">
            {errore && (
              <p id={`${id}-errore`} className="text-status-annullato">
                {errore}
              </p>
            )}
            {aiuto && (
              <p id={`${id}-aiuto`} className="text-on-surface-variant">
                {aiuto}
              </p>
            )}
          </div>
          {extra}
        </div>
      )}
    </div>
  )
}
