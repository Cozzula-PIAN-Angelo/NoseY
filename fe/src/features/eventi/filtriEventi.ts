import type { EventoMappaResponse } from '@/types/api'
import type { StatoPosizione } from './usePosizioneUtente'

// Filtri di "Esplora eventi" (FE1-19). ListaEventiMappa restituisce tutti gli eventi in programma e in
// corso, senza pagine e senza ricerca: titolo e periodo si filtrano qui, nel browser. La posizione
// invece la passa il backend, e cambia solo l'ordine.

export type Periodo = 'tutti' | 'in-corso' | 'oggi' | 'weekend'

/** Testo senza maiuscole ne' accenti: "Città" trova anche "citta" */
const semplice = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Inizio del giorno (ora locale) */
function mezzanotte(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const piuGiorni = (d: Date, giorni: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + giorni)

/** [inizio, fine) del periodo, oppure null per "tutti" e "in corso" */
export function intervalloPeriodo(periodo: Periodo, adesso = new Date()): [Date, Date] | null {
  const oggi = mezzanotte(adesso)
  if (periodo === 'oggi') return [oggi, piuGiorni(oggi, 1)]
  if (periodo === 'weekend') {
    // Sabato e domenica di questa settimana; di domenica e' il weekend in corso
    const giorno = oggi.getDay() // 0 domenica, 6 sabato
    const sabato = giorno === 0 ? piuGiorni(oggi, -1) : piuGiorni(oggi, 6 - giorno)
    return [sabato, piuGiorni(sabato, 2)]
  }
  return null
}

/** Eventi che contengono il testo nel titolo e si svolgono (anche in parte) nel periodo */
export function filtraEventi(eventi: EventoMappaResponse[], cerca: string, periodo: Periodo, adesso = new Date()) {
  const testo = semplice(cerca.trim())
  const intervallo = intervalloPeriodo(periodo, adesso)
  return eventi.filter((e) => {
    if (testo && !semplice(e.titolo).includes(testo)) return false
    if (periodo === 'in-corso') return e.stato === 'IN_CORSO'
    if (intervallo) {
      const [da, a] = intervallo
      return new Date(e.dataEvento) < a && new Date(e.dataFine) > da
    }
    return true
  })
}

/** Cosa dire della posizione, nella mappa e in "Esplora eventi" */
export const TESTI_POSIZIONE: Record<StatoPosizione, string> = {
  'non-chiesta': 'Eventi in ordine di data. Condividi la posizione per vederli dal più vicino.',
  'in-attesa': 'Sto cercando la tua posizione…',
  concessa: 'Eventi dal più vicino al più lontano. La posizione resta nel tuo browser.',
  negata: 'Hai negato la posizione: eventi in ordine di data. Puoi riattivarla dalle impostazioni del browser.',
  'non-disponibile': 'Posizione non disponibile: eventi in ordine di data.',
}
