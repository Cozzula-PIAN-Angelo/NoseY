// Funzioni comuni ai dati finti: errori come il backend, stato dell'evento, distanze, pagine.
import { HttpResponse } from 'msw'
import { DIMENSIONE_MASSIMA, DIMENSIONE_PAGINA, type PaginaResponse } from '@/lib/pagine'
import type { CodiceErrore } from '@/lib/codiciErrore'
import type { ErroreResponse } from '@/lib/errori'
import type { IstanteIso, StatoEvento } from '@/types/api'

// Status HTTP dei codici usati dai dati finti (tabella della progettazione v4, sezione 0)
const STATUS: Partial<Record<CodiceErrore, number>> = {
  VALIDAZIONE: 400,
  RICHIESTA_VUOTA: 400,
  FILE_NON_VALIDO: 400,
  ACCESSO_NEGATO: 403,
  RUOLO_INSUFFICIENTE: 403,
  STATO_NON_AMMESSO: 400,
  UTENTE_ANONIMIZZATO: 409,
  RUOLO_NON_AMMESSO: 400,
  UTENTE_NON_VERIFICATO: 409,
  ARTISTA_NOME_GIA_USATO: 409,
  ARTISTA_IN_USO: 409,
  DATA_NON_FUTURA: 400,
  DATE_NON_VALIDE: 400,
  DESCRIZIONE_MANCANTE: 400,
  COPERTINA_NON_VALIDA: 400,
  POI_TROPPO_LONTANO: 400,
  NON_AUTENTICATO: 401,
  NON_PROPRIETARIO: 403,
  NESSUN_TICKET: 403,
  NON_TROVATO: 404,
  EVENTO_CONCLUSO: 409,
  EVENTO_ANNULLATO: 409,
  EVENTO_GIA_INIZIATO: 409,
  POI_FUORI_RAGGIO: 409,
  LIMITE_FOTO: 409,
  LIMITE_POI: 409,
  ARTISTA_GIA_ASSOCIATO: 409,
  ARTISTA_NON_ATTIVO: 409,
  PROPRIETARIO_NON_ISCRIVIBILE: 409,
  GIA_ISCRITTO: 409,
  SERVIZIO_ESTERNO: 502,
  // Lato utenti e social (FE2-03)
  CATEGORIA_NON_VALIDA: 400,
  TROPPE_RICHIESTE: 429,
  EMAIL_GIA_REGISTRATA: 409,
  GIA_VERIFICATO: 409,
  CODICE_NON_VALIDO: 400,
  CODICE_SCADUTO: 400,
  PASSWORD_ERRATA: 400,
  CREDENZIALI_ERRATE: 401,
  EMAIL_NON_VERIFICATA: 403,
  ACCOUNT_SOSPESO: 403,
  PASSWORD_UGUALE: 400,
  ULTIMO_SUPERADMIN: 409,
  RICHIESTA_A_SE_STESSO: 400,
  UTENTE_NON_ATTIVO: 409,
  RICHIESTA_GIA_INVIATA: 409,
  RICHIESTA_GIA_RICEVUTA: 409,
  GIA_AMICI: 409,
  AMICIZIA_NON_DISPONIBILE: 409,
  NON_RICEVENTE: 403,
  NON_RICHIEDENTE: 403,
  NON_IN_ATTESA: 409,
  NON_AMICI: 409,
  NON_MEMBRO: 403,
}

/** Risposta d'errore nello stesso formato del backend (ErroreResponse) */
export function errore(codice: CodiceErrore, campi: Record<string, string> = {}) {
  const status = STATUS[codice] ?? 400
  const corpo: ErroreResponse = {
    status,
    codice,
    errore: 'Errore (dati finti)',
    messaggio: `Dati finti: ${codice}`,
    campi,
    timestamp: new Date().toISOString(),
  }
  return HttpResponse.json(corpo, { status })
}

/** 204 No Content */
export const nessunContenuto = () => new HttpResponse(null, { status: 204 })

/** Istante a N ore da adesso (negativo = nel passato), in ISO 8601 */
export function traOre(ore: number): IstanteIso {
  return new Date(Date.now() + ore * 3_600_000).toISOString()
}

/** Stato calcolato dalle date, come fa il backend: nel DB ci sono solo PROGRAMMATO e ANNULLATO */
export function statoDa(e: { dataEvento: IstanteIso; dataFine: IstanteIso; annullato: boolean }): StatoEvento {
  if (e.annullato) return 'ANNULLATO'
  const adesso = Date.now()
  if (adesso < Date.parse(e.dataEvento)) return 'PROGRAMMATO'
  if (adesso <= Date.parse(e.dataFine)) return 'IN_CORSO'
  return 'CONCLUSO'
}

/** Distanza in km fra due punti: la stessa funzione del frontend (lib/geo.ts) */
export { distanzaKm } from '@/lib/geo'

/** Testo "non vuoto": almeno un carattere che non sia uno spazio */
export const nonVuoto = (t: unknown): t is string => typeof t === 'string' && t.trim().length > 0

export const latValida = (n: unknown) => typeof n === 'number' && n >= -90 && n <= 90
export const lngValida = (n: unknown) => typeof n === 'number' && n >= -180 && n <= 180

/** Legge il body JSON; se manca o non e' JSON restituisce un oggetto vuoto */
export async function leggiJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const dati = await request.json()
    return typeof dati === 'object' && dati !== null ? (dati as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// Immagine segnaposto (SVG con i colori di Stitch), senza scaricare nulla da internet.
// La servono i GET finti delle immagini (handlers/immagini.ts), come fa il backend.
export function immagineFinta(testo: string, tinta: number): string {
  testo = testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${tinta},70%,30%)"/><stop offset="1" stop-color="#0b0f19"/></linearGradient></defs>
<rect width="800" height="500" fill="url(#g)"/>
<text x="40" y="450" font-family="sans-serif" font-size="36" font-weight="700" fill="#dfe2f1">${testo}</text></svg>`
  return svg
}

/** Pagina di una lista gia' ordinata, con ?page=&size= come il backend (size massimo 100); null se non validi */
export function pagina<T>(lista: T[], url: URL): PaginaResponse<T> | null {
  const page = Number(url.searchParams.get('page') ?? 0)
  const size = Number(url.searchParams.get('size') ?? DIMENSIONE_PAGINA)
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > DIMENSIONE_MASSIMA) return null
  return {
    contenuto: lista.slice(page * size, page * size + size),
    pagina: page,
    dimensione: size,
    totaleElementi: lista.length,
    totalePagine: Math.ceil(lista.length / size),
  }
}
