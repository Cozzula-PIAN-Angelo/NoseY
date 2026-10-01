import { bytePassword, LIMITI_UTENTI, type ModificaUtenteRequest, type UtenteResponse } from '@/types/api'

// Controlli dei due form del profilo (FE2-07), con le regole del backend
// (ModificaUtenteRequest e CambioPasswordRequest, progettazione v4 sezione 2).

// ---------------------------------------------------------------- Dati personali

export type ValoriProfilo = {
  nome: string
  cognome: string
  /** "AAAA-MM-GG" come il campo data, "" se manca */
  dataNascita: string
  indirizzo: string
}

export type ErroriProfilo = Partial<Record<keyof ValoriProfilo, string>>

/** Ordine dei campi nel form: all'invio si va sul primo sbagliato (gli id sono prof-<campo>) */
export const ORDINE_PROFILO: (keyof ValoriProfilo)[] = ['nome', 'cognome', 'dataNascita', 'indirizzo']

/** Valori di partenza del form, presi dal profilo salvato */
export const valoriProfilo = (u: UtenteResponse): ValoriProfilo => ({
  nome: u.nome,
  cognome: u.cognome,
  dataNascita: u.dataNascita ?? '',
  indirizzo: u.indirizzo ?? '',
})

export function validaProfilo(v: ValoriProfilo, salvati: ValoriProfilo, oggi = new Date()): ErroriProfilo {
  const errori: ErroriProfilo = {}

  if (!v.nome.trim()) errori.nome = 'Il nome è obbligatorio.'
  else if (v.nome.trim().length > LIMITI_UTENTI.nome) errori.nome = `Al massimo ${LIMITI_UTENTI.nome} caratteri.`

  if (!v.cognome.trim()) errori.cognome = 'Il cognome è obbligatorio.'
  else if (v.cognome.trim().length > LIMITI_UTENTI.cognome) errori.cognome = `Al massimo ${LIMITI_UTENTI.cognome} caratteri.`

  // La data si puo' cambiare ma non togliere: il PATCH non ha un modo per rimuoverla
  if (!v.dataNascita) {
    if (salvati.dataNascita) errori.dataNascita = 'La data di nascita è obbligatoria.'
  } else if (new Date(v.dataNascita) >= new Date(oggi.toDateString())) errori.dataNascita = 'Deve essere una data passata.'

  if (v.indirizzo.trim().length > LIMITI_UTENTI.indirizzo) errori.indirizzo = `Al massimo ${LIMITI_UTENTI.indirizzo} caratteri.`

  return errori
}

/** Solo i campi cambiati (il PATCH senza campi da' 400 RICHIESTA_VUOTA); indirizzo "" = rimuovi */
export function modificheProfilo(v: ValoriProfilo, salvati: ValoriProfilo): ModificaUtenteRequest {
  const modifiche: ModificaUtenteRequest = {}
  if (v.nome.trim() !== salvati.nome) modifiche.nome = v.nome.trim()
  if (v.cognome.trim() !== salvati.cognome) modifiche.cognome = v.cognome.trim()
  if (v.dataNascita && v.dataNascita !== salvati.dataNascita) modifiche.dataNascita = v.dataNascita
  if (v.indirizzo.trim() !== salvati.indirizzo) modifiche.indirizzo = v.indirizzo.trim()
  return modifiche
}

// ---------------------------------------------------------------- Cambio password

export type ValoriPassword = {
  attuale: string
  nuova: string
  conferma: string
}

export type ErroriPassword = Partial<Record<keyof ValoriPassword, string>>

/** Ordine dei campi nel form (gli id sono pwd-<campo>) */
export const ORDINE_PASSWORD: (keyof ValoriPassword)[] = ['attuale', 'nuova', 'conferma']

export const PASSWORD_VUOTE: ValoriPassword = { attuale: '', nuova: '', conferma: '' }

export function validaPassword(v: ValoriPassword): ErroriPassword {
  const errori: ErroriPassword = {}

  if (!v.attuale) errori.attuale = 'Scrivi la password che usi adesso.'

  if (!v.nuova) errori.nuova = 'Scegli la nuova password.'
  else if (v.nuova.length < LIMITI_UTENTI.passwordMin) errori.nuova = `Almeno ${LIMITI_UTENTI.passwordMin} caratteri.`
  else if (bytePassword(v.nuova) > LIMITI_UTENTI.passwordMaxByte)
    errori.nuova = `Troppo lunga: al massimo ${LIMITI_UTENTI.passwordMaxByte} byte (lettere accentate ed emoji valgono di più).`
  else if (v.nuova === v.attuale) errori.nuova = 'La nuova password deve essere diversa da quella attuale.'

  if (!v.conferma) errori.conferma = 'Riscrivi la nuova password per conferma.'
  else if (v.conferma !== v.nuova) errori.conferma = 'Le due password non coincidono.'

  return errori
}
