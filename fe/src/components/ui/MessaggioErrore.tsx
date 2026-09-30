import { cx } from '@/lib/cx'
import { leggiErrore, type ErroreLeggibile } from '@/lib/errori'
import { Button } from './Button'
import { Icon } from './Icon'

type MessaggioErroreProps = {
  /** L'errore cosi' com'e' (es. error di RTK Query) oppure gia' convertito con leggiErrore */
  errore: unknown
  /** Mostra il pulsante "Riprova" (es. refetch di RTK Query) */
  onRiprova?: () => void
  className?: string
}

function eLeggibile(e: unknown): e is ErroreLeggibile {
  return typeof e === 'object' && e !== null && 'titolo' in e && 'messaggio' in e && 'campi' in e
}

// Riquadro d'errore dentro la pagina, al posto del contenuto che non si e' potuto caricare
// o sopra un modulo inviato con errori. Gli errori dei singoli campi (ErroreResponse.campi)
// vanno invece passati ai campi: <TextField errore={e.campi.email} />
export function MessaggioErrore({ errore, onRiprova, className }: MessaggioErroreProps) {
  const e = eLeggibile(errore) ? errore : leggiErrore(errore)

  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col gap-space-sm rounded-xl bg-status-annullato/10 p-space-md sm:flex-row sm:items-start',
        className,
      )}
    >
      <Icon nome="error" size={22} className="text-status-annullato" />
      <div className="flex flex-1 flex-col">
        <p className="font-label-btn text-label-btn text-on-surface">{e.titolo}</p>
        <p className="font-body-md text-body-md text-on-surface-variant">{e.messaggio}</p>
      </div>
      {onRiprova && (
        <Button variant="secondary" size="sm" icona="refresh" onClick={onRiprova}>
          Riprova
        </Button>
      )}
    </div>
  )
}
