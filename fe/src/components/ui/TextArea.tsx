import { useId, useState, type ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { Campo, classiInput, idDescrizione, type CampoProps } from './Campo'

type TextAreaProps = Omit<ComponentProps<'textarea'>, 'required'> & CampoProps

// Area di testo su piu' righe. Con maxLength mostra il contatore "12 / 5000"
// (es. descrizione evento 5000, messaggio chat 2000, notifica manuale 500).
export function TextArea({
  etichetta,
  aiuto,
  errore,
  obbligatorio,
  id,
  className,
  rows = 4,
  maxLength,
  value,
  defaultValue,
  onChange,
  ...props
}: TextAreaProps) {
  const idAuto = useId()
  const idCampo = id ?? idAuto
  // Serve solo quando il campo non e' controllato (defaultValue): con value si usa quello.
  const [lunghezzaLibera, setLunghezzaLibera] = useState(String(defaultValue ?? '').length)
  const lunghezza = value !== undefined ? String(value).length : lunghezzaLibera

  const contatore =
    maxLength !== undefined ? (
      <span
        className={cx(
          'shrink-0 font-label-code-status text-label-code-status',
          lunghezza >= maxLength ? 'text-status-annullato' : 'text-outline',
        )}
      >
        {lunghezza} / {maxLength}
      </span>
    ) : undefined

  return (
    <Campo
      id={idCampo}
      etichetta={etichetta}
      aiuto={aiuto}
      errore={errore}
      obbligatorio={obbligatorio}
      extra={contatore}
      className={className}
    >
      <textarea
        id={idCampo}
        rows={rows}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          setLunghezzaLibera(e.target.value.length)
          onChange?.(e)
        }}
        required={obbligatorio}
        aria-invalid={errore ? true : undefined}
        aria-describedby={idDescrizione(idCampo, { aiuto, errore })}
        className={cx(classiInput, 'resize-y')}
        {...props}
      />
    </Campo>
  )
}
