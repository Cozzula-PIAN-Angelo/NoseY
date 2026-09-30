import { useId, type ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { Campo, classiInput, idDescrizione, type CampoProps } from './Campo'
import { Icon } from './Icon'

export type Opzione<V extends string = string> = {
  valore: V
  etichetta: string
  disabilitata?: boolean
}

type SelectProps<V extends string> = Omit<ComponentProps<'select'>, 'required' | 'children'> &
  CampoProps & {
    opzioni: Opzione<V>[]
    /** Prima voce vuota, es. "Scegli un tipo..." */
    segnaposto?: string
  }

// Select nativa: tastiera, mobile e accessibilita' gestiti dal browser.
// Esempio: <Select etichetta="Tipo" opzioni={[{ valore: 'INGRESSO', etichetta: 'Ingresso' }]} />
export function Select<V extends string>({
  etichetta,
  aiuto,
  errore,
  obbligatorio,
  opzioni,
  segnaposto,
  id,
  className,
  ...props
}: SelectProps<V>) {
  const idAuto = useId()
  const idCampo = id ?? idAuto

  return (
    <Campo id={idCampo} etichetta={etichetta} aiuto={aiuto} errore={errore} obbligatorio={obbligatorio} className={className}>
      <div className="relative">
        <select
          id={idCampo}
          required={obbligatorio}
          aria-invalid={errore ? true : undefined}
          aria-describedby={idDescrizione(idCampo, { aiuto, errore })}
          className={cx(classiInput, 'cursor-pointer appearance-none pr-10')}
          {...props}
        >
          {segnaposto !== undefined && <option value="">{segnaposto}</option>}
          {opzioni.map((o) => (
            <option key={o.valore} value={o.valore} disabled={o.disabilitata}>
              {o.etichetta}
            </option>
          ))}
        </select>
        <Icon
          nome="expand_more"
          className="pointer-events-none absolute right-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
      </div>
    </Campo>
  )
}
