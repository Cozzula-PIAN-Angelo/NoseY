import { useId, type ComponentProps } from 'react'
import { Campo, classiInput, idDescrizione, type CampoProps } from './Campo'

type DateTimeFieldProps = Omit<ComponentProps<'input'>, 'type' | 'required' | 'min' | 'max'> &
  CampoProps & {
    /** Solo la data (es. dataNascita) invece di data e ora (es. dataEvento, dataFine) */
    soloData?: boolean
    /** Limite minimo, come Date o come stringa nel formato del campo */
    min?: Date | string
    /** Limite massimo, come Date o come stringa nel formato del campo */
    max?: Date | string
  }

// Converte una Date nel formato che si aspettano gli input nativi, nell'ora locale:
// "2026-10-01T21:30" (data e ora) oppure "2026-10-01" (solo data).
export function valoreDataOra(data: Date, soloData = false): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const giorno = `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`
  return soloData ? giorno : `${giorno}T${p(data.getHours())}:${p(data.getMinutes())}`
}

function limite(valore: Date | string | undefined, soloData: boolean): string | undefined {
  return valore instanceof Date ? valoreDataOra(valore, soloData) : valore
}

// Data e ora con il selettore nativo del browser. Il valore e' una stringa
// "AAAA-MM-GGTHH:mm" (o "AAAA-MM-GG" con soloData).
// Esempi: dataEvento @Future → min={new Date()}; dataNascita @Past → soloData max={new Date()}
export function DateTimeField({
  etichetta,
  aiuto,
  errore,
  obbligatorio,
  soloData = false,
  min,
  max,
  id,
  className,
  ...props
}: DateTimeFieldProps) {
  const idAuto = useId()
  const idCampo = id ?? idAuto

  return (
    <Campo id={idCampo} etichetta={etichetta} aiuto={aiuto} errore={errore} obbligatorio={obbligatorio} className={className}>
      <input
        id={idCampo}
        type={soloData ? 'date' : 'datetime-local'}
        min={limite(min, soloData)}
        max={limite(max, soloData)}
        required={obbligatorio}
        aria-invalid={errore ? true : undefined}
        aria-describedby={idDescrizione(idCampo, { aiuto, errore })}
        className={classiInput}
        {...props}
      />
    </Campo>
  )
}
