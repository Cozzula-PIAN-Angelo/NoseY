// Utente che ha fatto l'accesso (progettazione v4, "DTO comuni" e sezione 1).

import type { DataIso, IstanteIso, Uuid } from './comuni'

/** Ruoli in ordine crescente: ogni ruolo puo' quello che puo' il precedente */
export type Ruolo = 'USER' | 'ADMIN' | 'SUPERADMIN'

/** L'utente stesso (per gli altri utenti c'e' UtentePubblicoResponse) */
export type UtenteResponse = {
  id: Uuid
  email: string
  nome: string
  cognome: string
  indirizzo: string | null
  dataNascita: DataIso | null
  /** Percorso relativo dell'avatar (decisione 9), null se manca: usare urlImmagine() */
  immagineProfilo: string | null
  ruolo: Ruolo
}

/** Risposta di Login e di Verifica (la verifica fa gia' il login) */
export type LoginResponse = {
  token: string
  /** Scadenza del token (24 ore, nessun refresh token) */
  scadenza: IstanteIso
  utente: UtenteResponse
}
