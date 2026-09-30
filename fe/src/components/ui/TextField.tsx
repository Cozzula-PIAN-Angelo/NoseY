import { useId, type ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { Campo, classiInput, idDescrizione, type CampoProps } from './Campo'
import { Icon } from './Icon'

type TextFieldProps = Omit<ComponentProps<'input'>, 'required'> &
  CampoProps & {
    /** Icona Material Symbols dentro il campo, a sinistra (es. "search") */
    icona?: string
  }

// Campo di testo a una riga: testo, email, password, numero, ricerca...
export function TextField({
  etichetta,
  aiuto,
  errore,
  obbligatorio,
  icona,
  id,
  className,
  ...props
}: TextFieldProps) {
  const idAuto = useId()
  const idCampo = id ?? idAuto

  return (
    <Campo id={idCampo} etichetta={etichetta} aiuto={aiuto} errore={errore} obbligatorio={obbligatorio} className={className}>
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
          className={cx(classiInput, icona && 'pl-12')}
          {...props}
        />
      </div>
    </Campo>
  )
}
