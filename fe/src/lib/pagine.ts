// Paginazione del backend: ?page=0&size=20 → Page<...> di Spring (NoseY-endpoint.md, sezione 0).
// Le pagine partono da 0 nell'API, da 1 in quello che vede l'utente.

// Spring puo' serializzare Page in due modi: quello classico (campi in cima) e quello
// "VIA_DTO" (Spring Boot 3.3+, campi dentro "page"). Il tipo accetta tutti e due,
// finche' il team backend non ne sceglie uno.
export type Page<T> = {
  content: T[]
} & (
  | { number: number; size: number; totalElements: number; totalPages: number }
  | { page: { number: number; size: number; totalElements: number; totalPages: number } }
)

export type DatiPagina = {
  /** Pagina corrente, da 0 */
  pagina: number
  dimensione: number
  totaleElementi: number
  totalePagine: number
}

export function datiPagina<T>(p: Page<T>): DatiPagina {
  const d = 'page' in p ? p.page : p
  return { pagina: d.number, dimensione: d.size, totaleElementi: d.totalElements, totalePagine: d.totalPages }
}

// Numeri di pagina da mostrare (da 0), con null al posto dei puntini:
// pagina 5 di 20 → [0, null, 4, 5, 6, null, 19]
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
