import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Icon } from '@/components/ui'
import { cx } from '@/lib/cx'

type CampoCodiceOtpProps = {
  /** Le cifre scritte finora, es. "48" (al massimo 6) */
  valore: string
  onChange: (valore: string) => void
  errore?: string
  disabled?: boolean
  /** Il cursore parte dalla prima casella */
  autoFocus?: boolean
}

const CIFRE = 6

// Codice di verifica a 6 cifre in 6 caselle, come nella schermata Stitch "Verifica Codice OTP".
// Si scrive una cifra per casella (il cursore va avanti da solo), Backspace torna indietro,
// e si puo' incollare il codice intero. Sul telefono compare il tastierino numerico, e
// autocomplete="one-time-code" lascia proporre al telefono il codice arrivato.
export function CampoCodiceOtp({ valore, onChange, errore, disabled = false, autoFocus = false }: CampoCodiceOtpProps) {
  const caselle = useRef<(HTMLInputElement | null)[]>([])
  const idEtichetta = useId()
  const idErrore = useId()
  const cifre = Array.from({ length: CIFRE }, (_, i) => valore[i] ?? '')

  const vaiA = (i: number) => caselle.current[Math.max(0, Math.min(CIFRE - 1, i))]?.focus()

  function scrivi(i: number, testo: string) {
    const nuove = testo.replace(/\D/g, '')
    if (!nuove) return
    // Piu' cifre insieme (incolla o suggerimento del telefono): riempiono le caselle da qui in poi
    const codice = (valore.slice(0, i) + nuove).slice(0, CIFRE)
    onChange(codice)
    vaiA(codice.length)
  }

  function tasto(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      // Cancella la cifra di questa casella, oppure (se vuota) quella prima e ci torna
      const da = cifre[i] ? i : i - 1
      if (da < 0) return
      onChange(valore.slice(0, da))
      vaiA(da)
    } else if (e.key === 'ArrowLeft') {
      vaiA(i - 1)
    } else if (e.key === 'ArrowRight') {
      vaiA(i + 1)
    }
  }

  function incolla(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    scrivi(0, e.clipboardData.getData('text'))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span id={idEtichetta} className="flex items-center gap-2 font-label-btn text-label-btn text-on-surface">
          <Icon nome="dialpad" size={18} className="text-secondary" />
          Codice di verifica
        </span>
        <span className="font-label-code-status text-label-code-status uppercase text-outline">6 cifre · vale 15 minuti</span>
      </div>
      <div role="group" aria-labelledby={idEtichetta} aria-describedby={errore ? idErrore : undefined} className="grid grid-cols-6 gap-2 sm:gap-3">
        {cifre.map((cifra, i) => (
          <input
            key={i}
            ref={(el) => {
              caselle.current[i] = el
            }}
            value={cifra}
            onChange={(e) => scrivi(i, e.target.value.slice(-CIFRE))}
            onKeyDown={(e) => tasto(i, e)}
            onPaste={incolla}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={CIFRE}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            aria-label={`Cifra ${i + 1} di ${CIFRE}`}
            aria-invalid={errore ? true : undefined}
            className={cx(
              'h-14 w-full rounded-xl bg-surface-container-low text-center font-display-hero text-headline-lg text-primary-fixed shadow-inner outline-none transition-colors sm:h-16',
              'focus:bg-surface-variant focus:ring-2 focus:ring-primary-container disabled:opacity-50',
              cifra && 'bg-surface-container-high',
              errore && 'ring-2 ring-status-annullato',
            )}
          />
        ))}
      </div>
      {errore && (
        <p id={idErrore} role="alert" className="font-body-sm text-body-sm text-status-annullato">
          {errore}
        </p>
      )}
    </div>
  )
}
