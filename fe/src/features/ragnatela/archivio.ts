// Archivio della Modalita' Ragnatela nel localStorage (Decisione 25): niente backend.
// Ogni accesso e' in try/catch: in navigazione privata o con lo spazio pieno il localStorage puo'
// lanciare eccezioni, e allora la modalita' funziona lo stesso, solo senza ricordare nulla.
import type { Categoria, MessaggioRagnatela, Segnalazione, StatoSegnalazione, Urgenza } from './tipi'
import { CATEGORIE, URGENZE } from './tipi'

const CHIAVE = 'nosey.ragnatela.v1'

export type Archivio = {
  segnalazioni: Segnalazione[]
  /** Ultima frase usata per ogni gruppo del repertorio (risposteSpiderMan), per non ripeterla */
  ultimeFrasi: Record<string, string>
}

export const ARCHIVIO_VUOTO: Archivio = { segnalazioni: [], ultimeFrasi: {} }

// ---------- Controlli sui dati letti: il localStorage si puo' modificare a mano ----------

type Oggetto = Record<string, unknown>

const eOggetto = (x: unknown): x is Oggetto => typeof x === 'object' && x !== null && !Array.isArray(x)
const eNumero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const eTesto = (x: unknown): x is string => typeof x === 'string'
const eCategoria = (x: unknown): x is Categoria => eTesto(x) && Object.hasOwn(CATEGORIE, x)
const eUrgenza = (x: unknown): x is Urgenza => eTesto(x) && Object.hasOwn(URGENZE, x)
const eStato = (x: unknown): x is StatoSegnalazione => x === 'APERTA' || x === 'IN_ARRIVO' || x === 'RISOLTA'

function eMessaggio(x: unknown): x is MessaggioRagnatela {
  return (
    eOggetto(x) &&
    eTesto(x.id) &&
    (x.autore === 'UTENTE' || x.autore === 'SPIDERMAN') &&
    eTesto(x.testo) &&
    eNumero(x.quando) &&
    (x.scriveDa === undefined || eNumero(x.scriveDa)) &&
    (x.nuovoStato === undefined || eStato(x.nuovoStato))
  )
}

function eSegnalazione(x: unknown): x is Segnalazione {
  return (
    eOggetto(x) &&
    eTesto(x.id) &&
    eTesto(x.titolo) &&
    eTesto(x.descrizione) &&
    eCategoria(x.categoria) &&
    eUrgenza(x.urgenza) &&
    eOggetto(x.punto) &&
    eNumero(x.punto.lat) &&
    eNumero(x.punto.lng) &&
    eNumero(x.creata) &&
    Array.isArray(x.messaggi) &&
    x.messaggi.every(eMessaggio)
  )
}

/** Legge l'archivio; le segnalazioni rovinate si scartano una per una, non tutto l'archivio */
export function leggiArchivio(): Archivio {
  try {
    const grezzo = localStorage.getItem(CHIAVE)
    if (!grezzo) return ARCHIVIO_VUOTO
    const dati: unknown = JSON.parse(grezzo)
    if (!eOggetto(dati)) return ARCHIVIO_VUOTO
    const segnalazioni = Array.isArray(dati.segnalazioni) ? dati.segnalazioni.filter(eSegnalazione) : []
    const ultimeFrasi: Record<string, string> = {}
    if (eOggetto(dati.ultimeFrasi)) {
      for (const [chiave, frase] of Object.entries(dati.ultimeFrasi)) if (eTesto(frase)) ultimeFrasi[chiave] = frase
    }
    return { segnalazioni, ultimeFrasi }
  } catch {
    return ARCHIVIO_VUOTO
  }
}

export function salvaArchivio(archivio: Archivio): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(archivio))
  } catch {
    // Spazio pieno o storage bloccato: si continua solo in memoria
  }
}
