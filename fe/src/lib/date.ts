// Conversioni fra il valore dei campi data e ora del browser ("2026-10-03T21:00", ora locale,
// senza fuso) e le date dell'API: ISO 8601 con fuso orario (progettazione v4, sezione 0),
// es. "2026-10-03T21:00:00+02:00".
import { valoreDataOra } from '@/components/ui'
import type { IstanteIso } from '@/types/api'

const due = (n: number) => String(n).padStart(2, '0')

/**
 * Dal campo <input type="datetime-local"> all'API: aggiunge secondi e fuso orario di chi compila.
 * Il fuso e' quello di QUELLA data (ora legale o solare), non quello di oggi.
 */
export function istanteDaLocale(valore: string): IstanteIso {
  const data = new Date(valore)
  const minuti = -data.getTimezoneOffset()
  const segno = minuti >= 0 ? '+' : '-'
  const fuso = `${segno}${due(Math.floor(Math.abs(minuti) / 60))}:${due(Math.abs(minuti) % 60)}`
  const conSecondi = valore.length === 16 ? `${valore}:00` : valore
  return `${conSecondi}${fuso}`
}

/** Dall'API al campo datetime-local: "2026-10-03T21:00" nell'ora locale di chi guarda */
export function localeDaIstante(istante: IstanteIso): string {
  return valoreDataOra(new Date(istante))
}

/** true se il valore del campo datetime-local e' nel futuro */
export const nelFuturo = (valore: string) => new Date(valore).getTime() > Date.now()
