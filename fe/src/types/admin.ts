// Tipi del pannello admin (progettazione v4, sezioni 12 e 13): utenti e ruoli.
// Import unico: import type { AdminUtenteResponse, StatoUtente } from '@/types/api'

import type { IstanteIso, Uuid } from './comuni'
import type { Ruolo } from './utenti'

/** Stato di un account: ANONIMIZZATO e' definitivo (l'utente ha eliminato i propri dati) */
export type StatoUtente = 'ATTIVO' | 'SOSPESO' | 'ANONIMIZZATO'

/** Utente visto da un admin: ListaUtenti, CambiaStatoUtente, CambiaRuolo */
export type AdminUtenteResponse = {
  id: Uuid
  email: string
  nome: string
  cognome: string
  ruolo: Ruolo
  stato: StatoUtente
  /** false finche' l'utente non inserisce il codice arrivato via email */
  verificato: boolean
  creatoIl: IstanteIso
}

/** ListaUtenti: GET /api/admin/users, dal piu' recente (creatoIl decrescente) */
export type ParametriListaUtenti = {
  /** Contenuto in email, nome o cognome, senza distinzione di maiuscole (max 100) */
  search?: string
  status?: StatoUtente
  /** Da 0 */
  page?: number
  size?: number
}

/** CambiaStatoUtente: PATCH /api/admin/users/{utenteId}/status, solo ATTIVO o SOSPESO */
export type CambiaStatoUtenteRequest = {
  stato: Exclude<StatoUtente, 'ANONIMIZZATO'>
}

/** CambiaRuolo: PATCH /api/superadmin/users/{utenteId}/role (solo SUPERADMIN), solo USER o ADMIN */
export type CambiaRuoloRequest = {
  ruolo: Exclude<Ruolo, 'SUPERADMIN'>
}
