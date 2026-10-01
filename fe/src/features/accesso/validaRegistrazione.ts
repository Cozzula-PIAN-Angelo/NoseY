import { bytePassword, LIMITI_UTENTI } from '@/types/api'
import type { ValoriRegistrazione } from './FormRegistrazione'

// Controlli del form di registrazione (FE1-18, passo 3), con le regole del backend
// (RegisterRequest, progettazione v4 sezione 1) piu' la conferma della password e i termini.

export type ErroriRegistrazione = Partial<Record<keyof ValoriRegistrazione, string>>

/** Ordine dei campi nel form: all'invio si va sul primo sbagliato */
export const ORDINE_CAMPI: (keyof ValoriRegistrazione)[] = [
  'nome',
  'cognome',
  'email',
  'password',
  'conferma',
  'dataNascita',
  'indirizzo',
  'termini',
]

// Formato semplice ma sufficiente (qualcosa@qualcosa.dominio): il controllo vero lo fa il backend
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validaRegistrazione(v: ValoriRegistrazione, oggi = new Date()): ErroriRegistrazione {
  const errori: ErroriRegistrazione = {}

  if (!v.nome.trim()) errori.nome = 'Il nome è obbligatorio.'
  else if (v.nome.trim().length > LIMITI_UTENTI.nome) errori.nome = `Al massimo ${LIMITI_UTENTI.nome} caratteri.`

  if (!v.cognome.trim()) errori.cognome = 'Il cognome è obbligatorio.'
  else if (v.cognome.trim().length > LIMITI_UTENTI.cognome) errori.cognome = `Al massimo ${LIMITI_UTENTI.cognome} caratteri.`

  const email = v.email.trim()
  if (!email) errori.email = "L'email è obbligatoria."
  else if (!EMAIL.test(email)) errori.email = 'Scrivi un indirizzo email valido, es. nome@dominio.it.'
  else if (email.length > LIMITI_UTENTI.email) errori.email = `Al massimo ${LIMITI_UTENTI.email} caratteri.`

  if (!v.password) errori.password = 'La password è obbligatoria.'
  else if (v.password.length < LIMITI_UTENTI.passwordMin) errori.password = `Almeno ${LIMITI_UTENTI.passwordMin} caratteri.`
  else if (bytePassword(v.password) > LIMITI_UTENTI.passwordMaxByte)
    errori.password = `Troppo lunga: al massimo ${LIMITI_UTENTI.passwordMaxByte} byte (lettere accentate ed emoji valgono di più).`

  if (!v.conferma) errori.conferma = 'Riscrivi la password per conferma.'
  else if (v.conferma !== v.password) errori.conferma = 'Le due password non coincidono.'

  if (!v.dataNascita) errori.dataNascita = 'La data di nascita è obbligatoria.'
  else if (new Date(v.dataNascita) >= new Date(oggi.toDateString())) errori.dataNascita = 'Deve essere una data passata.'

  if (v.indirizzo.length > LIMITI_UTENTI.indirizzo) errori.indirizzo = `Al massimo ${LIMITI_UTENTI.indirizzo} caratteri.`

  if (!v.termini) errori.termini = 'Per registrarti devi accettare i termini e l’informativa.'

  return errori
}
