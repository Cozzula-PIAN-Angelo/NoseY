// Tipi del lato utenti (progettazione v4, "DTO comuni" e sezioni 1-2): accesso e profilo.
// Import unico: import type { LoginResponse, UtenteResponse } from '@/types/api'

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

// ---------- 1. Auth ----------

/**
 * Registrazione: POST /api/auth/register → 201 RegistrazioneResponse (MAI il codice).
 * Errori: 409 EMAIL_GIA_REGISTRATA, 429 TROPPE_RICHIESTE.
 * Un'email gia' registrata ma non verificata viene sovrascritta con i nuovi dati.
 */
export type RegistrazioneRequest = {
  /** Max 255 */
  email: string
  /** Da 8 a 72 caratteri (e max 72 byte: occhio a emoji e lettere accentate) */
  password: string
  /** Max 100 */
  nome: string
  /** Max 100 */
  cognome: string
  /** Max 255, facoltativo */
  indirizzo?: string
  /** Nel passato, obbligatoria */
  dataNascita: DataIso
}

export type RegistrazioneResponse = {
  id: Uuid
  email: string
}

/**
 * Verifica: POST /api/auth/verify → 200 LoginResponse (fa gia' il login).
 * Errori: 400 CODICE_NON_VALIDO · CODICE_SCADUTO · PASSWORD_ERRATA, 409 GIA_VERIFICATO,
 * 403 ACCOUNT_SOSPESO.
 */
export type VerificaRequest = {
  email: string
  /** 6 cifre, dalla email */
  codice: string
  /** La stessa scelta alla registrazione */
  password: string
}

/** ReinviaCodice (POST /api/auth/resend-code) e PasswordDimenticata (POST /api/auth/password/forgot): 204 */
export type EmailRequest = {
  email: string
}

/**
 * Login: POST /api/auth/login → 200 LoginResponse.
 * Errori: 401 CREDENZIALI_ERRATE, 403 EMAIL_NON_VERIFICATA · ACCOUNT_SOSPESO,
 * 429 TROPPE_RICHIESTE (10 tentativi falliti in 15 minuti).
 */
export type LoginRequest = {
  email: string
  password: string
}

/**
 * ReimpostaPassword: POST /api/auth/password/reset → 204 (non fa il login).
 * Errori: 400 CODICE_NON_VALIDO · CODICE_SCADUTO. Fa uscire da tutti i dispositivi.
 */
export type ReimpostaPasswordRequest = {
  email: string
  /** 6 cifre, dalla email */
  codice: string
  /** Da 8 a 72 caratteri */
  nuovaPassword: string
}

// ---------- 2. Utente ----------

/**
 * ModificaProfilo: PATCH /api/users/me → 200 UtenteResponse. Si mandano solo i campi cambiati.
 * Errori: 400 VALIDAZIONE, 400 RICHIESTA_VUOTA (nessun campo). Email non modificabile.
 */
export type ModificaUtenteRequest = {
  /** Max 100, non vuoto */
  nome?: string
  /** Max 100, non vuoto */
  cognome?: string
  /** Max 255, "" = rimuovi */
  indirizzo?: string
  /** Nel passato */
  dataNascita?: DataIso
}

/**
 * CambioPassword: POST /api/users/me/password → 204. Gli altri dispositivi escono, questo no.
 * Errori: 400 PASSWORD_ERRATA (attuale sbagliata), 400 PASSWORD_UGUALE.
 */
export type CambioPasswordRequest = {
  passwordAttuale: string
  /** Da 8 a 72 caratteri */
  nuovaPassword: string
}

/**
 * Anonimizzazione: POST /api/users/me/anonymize → 204. Irreversibile: si chiede la password.
 * Errori: 400 PASSWORD_ERRATA, 409 ULTIMO_SUPERADMIN.
 */
export type AnonimizzazioneRequest = {
  password: string
}

/** Limiti dei campi (validazione dei form prima dell'invio, stessi valori del backend) */
export const LIMITI_UTENTI = {
  email: 255,
  passwordMin: 8,
  /** BCrypt legge al massimo 72 byte: vanno contati in UTF-8, non in caratteri */
  passwordMaxByte: 72,
  nome: 100,
  cognome: 100,
  indirizzo: 255,
  /** Codice di verifica e di reset: 6 cifre */
  codice: /^\d{6}$/,
  /** Avvisi del codice: scade dopo 15 minuti, 5 tentativi, nuovo invio dopo 60 secondi */
  secondiTraInvii: 60,
  /** Immagine del profilo */
  byteAvatar: 2 * 1024 * 1024,
  tipiAvatar: ['image/jpeg', 'image/png', 'image/webp'],
} as const

/** Byte della password in UTF-8: il backend rifiuta oltre LIMITI_UTENTI.passwordMaxByte */
export const bytePassword = (password: string) => new TextEncoder().encode(password).length
