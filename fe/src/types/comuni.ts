// Tipi usati da tutte le aree (progettazione v4, sezione 0 e "DTO comuni").

/**
 * Data e ora in ISO 8601 con fuso orario, come le manda il backend (Instant):
 * "2026-10-03T21:00:00+02:00" oppure "2026-10-03T19:00:00Z". Per usarla: new Date(valore)
 */
export type IstanteIso = string

/** Solo data, "AAAA-MM-GG" (LocalDate): usata soltanto per dataNascita */
export type DataIso = string

/** Id delle risorse: sempre UUID */
export type Uuid = string

/**
 * Un ALTRO utente (partecipanti, amici, chat, proprietario dell'evento).
 * attivo = false per utenti sospesi o anonimizzati: il frontend disattiva "aggiungi" e la chat.
 */
export type UtentePubblicoResponse = {
  id: Uuid
  nome: string
  cognome: string
  /** Percorso relativo "/api/users/{id}/avatar?v=..." (decisione 9), null se manca: usare urlImmagine() */
  immagineProfilo: string | null
  attivo: boolean
}

/**
 * Amicizia come la vede chi fa la richiesta nei confronti di un altro utente (sezione 8).
 * Dice quale pulsante mostrare:
 *   NESSUNA "aggiungi" · INVIATA "in attesa" + "ritira" · RICEVUTA "accetta" / "rifiuta"
 *   AMICI "chat" · NON_DISPONIBILE nessun pulsante
 * Non e' lo stato salvato nel database (PENDENTE, ACCETTATA...): quello il frontend non lo vede.
 */
export type StatoAmicizia = 'NESSUNA' | 'INVIATA' | 'RICEVUTA' | 'AMICI' | 'NON_DISPONIBILE'
