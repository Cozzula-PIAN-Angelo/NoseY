// Formattazione in italiano di date e distanze, nel fuso orario di chi guarda.
import type { IstanteIso } from '@/types/api'

const giornoOra = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const giornoOraAnno = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const soloOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' })
const soloGiorno = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const soloGiornoAnno = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const km = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })

/** La data e' in un anno diverso da quello in corso: allora si scrive anche l'anno */
const altroAnno = (data: Date) => data.getFullYear() !== new Date().getFullYear()

/** "sab 4 ott, 21:00", con l'anno se non e' quello in corso: "mer 10 mar 2027, 20:00" */
export function dataOra(istante: IstanteIso): string {
  const data = new Date(istante)
  return (altroAnno(data) ? giornoOraAnno : giornoOra).format(data)
}

/**
 * Inizio e fine di un evento: "sab 4 ott, 21:00 – 03:00" se finisce entro le 24 ore,
 * altrimenti "sab 4 ott, 21:00 – lun 6 ott, 03:00". L'anno compare se inizio e fine sono in anni
 * diversi o se l'evento non e' nell'anno in corso: "dom 4 ott 2026, 21:00 – lun 4 ott 2027, 03:00"
 */
export function intervallo(inizio: IstanteIso, fine: IstanteIso): string {
  const a = new Date(inizio)
  const b = new Date(fine)
  const stessoGiro = b.getTime() - a.getTime() < 24 * 3_600_000
  const formato = altroAnno(a) || altroAnno(b) ? giornoOraAnno : giornoOra
  return `${formato.format(a)} – ${stessoGiro ? soloOra.format(b) : formato.format(b)}`
}

/** "sab 4 ott", con l'anno se non e' quello in corso: "mer 10 mar 2027" */
export function giorno(istante: IstanteIso): string {
  const data = new Date(istante)
  return (altroAnno(data) ? soloGiornoAnno : soloGiorno).format(data)
}

/** "a 3,2 km da te", "a 350 m da te" */
export function distanza(chilometri: number): string {
  if (chilometri < 1) return `a ${Math.max(10, Math.round((chilometri * 1000) / 10) * 10)} m da te`
  return `a ${km.format(chilometri)} km da te`
}
