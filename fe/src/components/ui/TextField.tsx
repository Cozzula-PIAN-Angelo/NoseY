import { useId, type ComponentProps, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Campo, classiInput, idDescrizione, type CampoProps } from './Campo'
import { Icon } from './Icon'

type TextFieldProps = Omit<ComponentProps<'input'>, 'required'> &
  CampoProps & {
    /** Icona Material Symbols dentro il campo, a sinistra (es. "search") */
    icona?: string
    /** Elemento dentro il campo, a destra (es. il pulsante per mostrare la password) */
    dopo?: ReactNode
    /** Con maxLength e value: mostra "12 / 100" sotto il campo */
    contatore?: boolean
    /** Testo personalizzato del contatore (es. i byte della password) */
    testoContatore?: string
  }

// Campo di testo a una riga: testo, email, password, numero, ricerca...
export function TextField({
  etichetta,
  aiuto,
  errore,
  obbligatorio,
  icona,
  dopo,
  contatore = false,
  testoContatore,
  id,
  className,
  ...props
}: TextFieldProps) {
  const idAuto = useId()
  const idCampo = id ?? idAuto
  const testo =
    testoContatore ?? (contatore && props.maxLength !== undefined ? `${String(props.value ?? '').length} / ${props.maxLength}` : undefined)

  return (
    <Campo
      id={idCampo}
      etichetta={etichetta}
      aiuto={aiuto}
      errore={errore}
      obbligatorio={obbligatorio}
      className={className}
      extra={testo && <span className="shrink-0 font-label-code-status text-label-code-status text-outline">{testo}</span>}
    >
      <div className="relative">
        {icona && (
          <Icon
            nome={icona}
            className="pointer-events-none absolute left-space-md top-1/2 -translate-y-1/2 text-outline"
          />
        )}
        <input
          id={idCampo}
          required={obbligatorio}
          aria-invalid={errore ? true : undefined}
          aria-describedby={idDescrizione(idCampo, { aiuto, errore })}
          className={cx(classiInput, icona && 'pl-12', dopo != null && 'pr-12')}
          {...props}
        />
        {dopo && <div className="absolute right-space-sm top-1/2 -translate-y-1/2">{dopo}</div>}
      </div>
    </Campo>
  )
}
