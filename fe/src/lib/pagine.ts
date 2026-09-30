// Paginazione del backend (progettazione v4, sezione 0):
//   richiesta  ?page=0&size=20   (size massimo 100)
//   risposta   PaginaResponse<T> (be/.../common/PaginaResponse.java)
// Le pagine partono da 0 nell'API, da 1 in quello che vede l'utente.
// Eccezione: i messaggi della chat usano un cursore (?before=), non questa paginazione.

export type PaginaResponse<T> = {
  contenuto: T[]
  /** Pagina corrente, da 0 */
  pagina: number
  dimensione: number
  totaleElementi: number
  totalePagine: number
}

/** Parametri di query per gli endpoint paginati */
export type ParametriPagina = {
  page: number
  size: number
}

export const DIMENSIONE_PAGINA = 20
export const DIMENSIONE_MASSIMA = 100

// Numeri di pagina da mostrare (da 0), con null al posto dei puntini:
// pagina 10 di 20 → [0, null, 8, 9, 10, null, 19]
export function pagineVisibili(corrente: number, totale: number, vicine = 1): Array<number | null> {
  if (totale <= 0) return []
  // Con poche pagine si mostrano tutte: i puntini servirebbero a nascondere un solo numero
  if (totale <= 5 + vicine * 2) return Array.from({ length: totale }, (_, i) => i)

  let inizio = Math.max(1, corrente - vicine)
  let fine = Math.min(totale - 2, corrente + vicine)
  // I puntini al posto di una sola pagina non fanno risparmiare spazio: meglio il numero
  if (inizio === 2) inizio = 1
  if (fine === totale - 3) fine = totale - 2

  const risultato: Array<number | null> = [0]
  if (inizio > 1) risultato.push(null)
  for (let i = inizio; i <= fine; i++) risultato.push(i)
  if (fine < totale - 2) risultato.push(null)
  risultato.push(totale - 1)
  return risultato
}
