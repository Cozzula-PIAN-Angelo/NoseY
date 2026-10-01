import { cx } from '@/lib/cx'
import { bytePassword, LIMITI_UTENTI } from '@/types/api'
import { robustezzaPassword } from './robustezzaPassword'

const COLORI_ROBUSTEZZA = ['', 'bg-status-annullato', 'bg-accent-gold-piercing', 'bg-secondary', 'bg-status-in-corso']

// Sotto il campo di una password nuova (registrazione FE1-18, reset FE2-06), come nella schermata
// Stitch "Registrazione Account": 4 barrette di robustezza, poi giudizio a sinistra e byte a destra.
export function BarreRobustezza({ password }: { password: string }) {
  const robustezza = robustezzaPassword(password)

  return (
    <>
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={cx(
              'h-1 rounded transition-colors',
              n <= robustezza.livello ? COLORI_ROBUSTEZZA[robustezza.livello] : 'bg-surface-container-highest',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-space-sm">
        <p aria-live="polite" className="font-body-sm text-body-sm text-outline">
          {robustezza.testo}
        </p>
        {/* Il limite vero del backend: 72 byte in UTF-8 (accenti ed emoji pesano di piu') */}
        <span className="shrink-0 font-label-code-status text-label-code-status text-outline">
          {bytePassword(password)} / {LIMITI_UTENTI.passwordMaxByte} byte
        </span>
      </div>
    </>
  )
}
