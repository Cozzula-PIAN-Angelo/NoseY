// Formattazione in italiano di date e distanze, nel fuso orario di chi guarda.
import type { IstanteIso } from '@/types/api'

const giornoOra = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const soloOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' })
const soloGiorno = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const km = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })

/** "sab 4 ott, 21:00" */
export const dataOra = (istante: IstanteIso) => giornoOra.format(new Date(istante))

/**
 * Inizio e fine di un evento: "sab 4 ott, 21:00 – 03:00" se finisce entro le 24 ore,
 * altrimenti "sab 4 ott, 21:00 – lun 6 ott, 03:00"
 */
export function intervallo(inizio: IstanteIso, fine: IstanteIso): string {
  const a = new Date(inizio)
  const b = new Date(fine)
  const stessoGiro = b.getTime() - a.getTime() < 24 * 3_600_000
  return `${giornoOra.format(a)} – ${stessoGiro ? soloOra.format(b) : giornoOra.format(b)}`
}

/** "sab 4 ott" */
export const giorno = (istante: IstanteIso) => soloGiorno.format(new Date(istante))

/** "a 3,2 km da te", "a 350 m da te" */
export function distanza(chilometri: number): string {
  if (chilometri < 1) return `a ${Math.max(10, Math.round((chilometri * 1000) / 10) * 10)} m da te`
  return `a ${km.format(chilometri)} km da te`
}
