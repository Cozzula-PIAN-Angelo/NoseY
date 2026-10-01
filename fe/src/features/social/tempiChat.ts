// Date e ore della chat (FE2-12), in italiano e nel fuso orario di chi guarda.
import type { IstanteIso } from '@/types/api'

const soloOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' })
const giornoSettimana = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
const giornoMese = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
const giornoMeseAnno = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
const giornoLungo = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const giornoLungoAnno = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const GIORNO_MS = 86_400_000

/** Mezzanotte del giorno di una data, per contare i giorni di calendario */
const mezzanotte = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Giorni di calendario fra l'istante e oggi: 0 oggi, 1 ieri... */
function giorniFa(istante: IstanteIso) {
  return Math.round((mezzanotte(new Date()) - mezzanotte(new Date(istante))) / GIORNO_MS)
}

/** "22:40" */
export const ora = (istante: IstanteIso) => soloOra.format(new Date(istante))

/** Elenco delle chat: "22:40" oggi, "Ieri", "lun" nell'ultima settimana, poi "4 ott" (con l'anno se diverso) */
export function quandoBreve(istante: IstanteIso): string {
  const giorni = giorniFa(istante)
  const d = new Date(istante)
  if (giorni <= 0) return soloOra.format(d)
  if (giorni === 1) return 'Ieri'
  if (giorni < 7) return giornoSettimana.format(d)
  return (d.getFullYear() === new Date().getFullYear() ? giornoMese : giornoMeseAnno).format(d)
}

/** Separatore fra i messaggi di giorni diversi: "Oggi", "Ieri", "sabato 4 ottobre" */
export function etichettaGiorno(istante: IstanteIso): string {
  const giorni = giorniFa(istante)
  const d = new Date(istante)
  if (giorni <= 0) return 'Oggi'
  if (giorni === 1) return 'Ieri'
  return (d.getFullYear() === new Date().getFullYear() ? giornoLungo : giornoLungoAnno).format(d)
}

export const stessoGiorno = (a: IstanteIso, b: IstanteIso) => mezzanotte(new Date(a)) === mezzanotte(new Date(b))
