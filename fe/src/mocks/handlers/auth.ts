// Endpoint finti dell'accesso e del profilo (progettazione v4, sezioni 1 e 2). Account di prova
// e codice email in datiSocial.ts. Le richieste senza un token finto valido rispondono 401.
import { delay, http, HttpResponse } from 'msw'
import { bytePassword, LIMITI_UTENTI, type LoginResponse, type RegistrazioneResponse } from '@/types/api'
import { cancellaImmagine, salvaImmagine, trovaUtente, utenti } from '../dati'
import {
  account,
  accountDaRichiesta,
  allineaAmicizieCorrente,
  amicizie,
  accountPerEmail,
  CODICE_FINTO,
  inUtenteResponse,
  nuovoToken,
  revocaToken,
  type AccountFinto,
} from '../datiSocial'
import { errore, leggiJson, nessunContenuto, nonVuoto } from '../utili'
import { api, RITARDO } from './comuni'

type ConLogin = { account: AccountFinto; token: string; risposta?: undefined } | { account?: undefined; token?: undefined; risposta: Response }

/** Chi fa la richiesta, dal token: 401 NON_AUTENTICATO se manca o non e' valido (come il backend) */
export function conLogin(request: Request): ConLogin {
  return accountDaRichiesta(request) ?? { risposta: errore('NON_AUTENTICATO') }
}

const emailValida = (e: unknown): e is string =>
  typeof e === 'string' && e.length <= LIMITI_UTENTI.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim())

/** Errore della password nuova, o undefined se va bene */
function errorePassword(p: unknown): string | undefined {
  if (!nonVuoto(p)) return 'obbligatoria'
  if (p.length < LIMITI_UTENTI.passwordMin) return `almeno ${LIMITI_UTENTI.passwordMin} caratteri`
  if (bytePassword(p) > LIMITI_UTENTI.passwordMaxByte) return 'troppo lunga'
}

const nelPassato = (d: unknown): d is string => typeof d === 'string' && !Number.isNaN(Date.parse(d)) && Date.parse(d) < Date.now()

const testoMax = (t: unknown, max: number) => nonVuoto(t) && t.length <= max

function login(a: AccountFinto): LoginResponse {
  return { ...nuovoToken(a.id), utente: inUtenteResponse(a) }
}

export const handlerAuth = [
  // ---------- 1. Auth ----------

  // Registrazione: un'email non verificata si sovrascrive; mai il codice nella risposta
  http.post(api('/auth/register'), async ({ request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    const campi: Record<string, string> = {}
    if (!emailValida(b.email)) campi.email = 'email non valida'
    const erroreP = errorePassword(b.password)
    if (erroreP) campi.password = erroreP
    if (!testoMax(b.nome, LIMITI_UTENTI.nome)) campi.nome = 'obbligatorio, max 100 caratteri'
    if (!testoMax(b.cognome, LIMITI_UTENTI.cognome)) campi.cognome = 'obbligatorio, max 100 caratteri'
    if (b.indirizzo != null && (typeof b.indirizzo !== 'string' || b.indirizzo.length > LIMITI_UTENTI.indirizzo)) campi.indirizzo = 'max 255 caratteri'
    if (!nelPassato(b.dataNascita)) campi.dataNascita = 'deve essere nel passato'
    if (Object.keys(campi).length) return errore('VALIDAZIONE', campi)

    const email = (b.email as string).trim().toLowerCase()
    const esistente = accountPerEmail(email)
    if (esistente && (esistente.verificato || esistente.stato !== 'ATTIVO')) return errore('EMAIL_GIA_REGISTRATA')

    const a: AccountFinto = esistente ?? {
      id: crypto.randomUUID(),
      email,
      password: '',
      indirizzo: null,
      dataNascita: null,
      ruolo: 'USER',
      verificato: false,
      stato: 'ATTIVO',
    }
    a.password = b.password as string
    a.indirizzo = typeof b.indirizzo === 'string' && b.indirizzo ? b.indirizzo : null
    a.dataNascita = b.dataNascita as string
    if (!esistente) {
      account.push(a)
      utenti.push({ id: a.id, nome: '', cognome: '', immagineProfilo: null, attivo: true })
    }
    Object.assign(trovaUtente(a.id), { nome: (b.nome as string).trim(), cognome: (b.cognome as string).trim() })
    console.info(`[dati finti] codice di verifica per ${email}: ${CODICE_FINTO}`)
    const corpo: RegistrazioneResponse = { id: a.id, email }
    return HttpResponse.json(corpo, { status: 201 })
  }),

  // Verifica: fa gia' il login
  http.post(api('/auth/verify'), async ({ request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    if (!emailValida(b.email) || typeof b.codice !== 'string' || !LIMITI_UTENTI.codice.test(b.codice) || !nonVuoto(b.password)) {
      return errore('VALIDAZIONE', { codice: '6 cifre' })
    }
    const a = accountPerEmail(b.email)
    if (!a || a.stato === 'ANONIMIZZATO') return errore('CODICE_NON_VALIDO')
    if (a.verificato) return errore('GIA_VERIFICATO')
    if (a.stato === 'SOSPESO') return errore('ACCOUNT_SOSPESO')
    if (b.codice !== CODICE_FINTO) return errore('CODICE_NON_VALIDO')
    if (b.password !== a.password) return errore('PASSWORD_ERRATA')
    a.verificato = true
    return HttpResponse.json(login(a))
  }),

  // ReinviaCodice e PasswordDimenticata: sempre 204, non rivelano se l'email esiste
  http.post(api('/auth/resend-code'), async ({ request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    if (!emailValida(b.email)) return errore('VALIDAZIONE', { email: 'email non valida' })
    console.info(`[dati finti] codice di verifica: ${CODICE_FINTO}`)
    return nessunContenuto()
  }),

  http.post(api('/auth/password/forgot'), async ({ request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    if (!emailValida(b.email)) return errore('VALIDAZIONE', { email: 'email non valida' })
    console.info(`[dati finti] codice per reimpostare la password: ${CODICE_FINTO}`)
    return nessunContenuto()
  }),

  http.post(api('/auth/password/reset'), async ({ request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    const erroreP = errorePassword(b.nuovaPassword)
    if (!emailValida(b.email) || typeof b.codice !== 'string' || !LIMITI_UTENTI.codice.test(b.codice) || erroreP) {
      return errore('VALIDAZIONE', erroreP ? { nuovaPassword: erroreP } : { codice: '6 cifre' })
    }
    const a = accountPerEmail(b.email)
    if (!a || !a.verificato || a.stato !== 'ATTIVO' || b.codice !== CODICE_FINTO) return errore('CODICE_NON_VALIDO')
    a.password = b.nuovaPassword as string
    return nessunContenuto()
  }),

  // Login: i 403 solo dopo una password corretta (non rivelano quali email esistono)
  http.post(api('/auth/login'), async ({ request }) => {
    await delay(RITARDO)
    const b = await leggiJson(request)
    if (!emailValida(b.email) || !nonVuoto(b.password)) return errore('VALIDAZIONE', { email: 'email non valida' })
    const a = accountPerEmail(b.email)
    if (!a || a.stato === 'ANONIMIZZATO' || a.password !== b.password) return errore('CREDENZIALI_ERRATE')
    if (!a.verificato) return errore('EMAIL_NON_VERIFICATA')
    if (a.stato === 'SOSPESO') return errore('ACCOUNT_SOSPESO')
    return HttpResponse.json(login(a))
  }),

  http.post(api('/auth/logout'), async ({ request }) => {
    await delay(RITARDO)
    const { token, risposta } = conLogin(request)
    if (risposta) return risposta
    revocaToken(token)
    return nessunContenuto()
  }),

  // ---------- 2. Utente ----------

  http.get(api('/users/me'), async ({ request }) => {
    await delay(RITARDO)
    const { account: a, risposta } = conLogin(request)
    return risposta ?? HttpResponse.json(inUtenteResponse(a))
  }),

  // ModificaProfilo: solo i campi presenti; indirizzo "" = rimuovi
  http.patch(api('/users/me'), async ({ request }) => {
    await delay(RITARDO)
    const { account: a, risposta } = conLogin(request)
    if (risposta) return risposta
    const b = await leggiJson(request)
    const presenti = (['nome', 'cognome', 'indirizzo', 'dataNascita'] as const).filter((k) => b[k] !== undefined)
    if (presenti.length === 0) return errore('RICHIESTA_VUOTA')
    const campi: Record<string, string> = {}
    if (b.nome !== undefined && !testoMax(b.nome, LIMITI_UTENTI.nome)) campi.nome = 'non vuoto, max 100 caratteri'
    if (b.cognome !== undefined && !testoMax(b.cognome, LIMITI_UTENTI.cognome)) campi.cognome = 'non vuoto, max 100 caratteri'
    if (b.indirizzo !== undefined && (typeof b.indirizzo !== 'string' || b.indirizzo.length > LIMITI_UTENTI.indirizzo)) campi.indirizzo = 'max 255 caratteri'
    if (b.dataNascita !== undefined && !nelPassato(b.dataNascita)) campi.dataNascita = 'deve essere nel passato'
    if (Object.keys(campi).length) return errore('VALIDAZIONE', campi)

    const u = trovaUtente(a.id)
    if (b.nome !== undefined) u.nome = (b.nome as string).trim()
    if (b.cognome !== undefined) u.cognome = (b.cognome as string).trim()
    if (b.indirizzo !== undefined) a.indirizzo = (b.indirizzo as string) || null
    if (b.dataNascita !== undefined) a.dataNascita = b.dataNascita as string
    return HttpResponse.json(inUtenteResponse(a))
  }),

  // CaricaImmagineProfilo: multipart con "file", JPEG/PNG/WEBP fino a 2 MB
  http.post(api('/users/me/avatar'), async ({ request }) => {
    await delay(RITARDO)
    const { account: a, risposta } = conLogin(request)
    if (risposta) return risposta
    const dati = await request.formData().catch(() => null)
    const file = dati?.get('file')
    const tipi: readonly string[] = LIMITI_UTENTI.tipiAvatar
    if (!(file instanceof File) || !tipi.includes(file.type) || file.size > LIMITI_UTENTI.byteAvatar) {
      return errore('FILE_NON_VALIDO')
    }
    trovaUtente(a.id).immagineProfilo = salvaImmagine(`/api/users/${a.id}/avatar`, file, file.type)
    return HttpResponse.json(inUtenteResponse(a))
  }),

  http.delete(api('/users/me/avatar'), async ({ request }) => {
    await delay(RITARDO)
    const { account: a, risposta } = conLogin(request)
    if (risposta) return risposta
    const u = trovaUtente(a.id)
    if (!u.immagineProfilo) return errore('NON_TROVATO')
    cancellaImmagine(u.immagineProfilo)
    u.immagineProfilo = null
    return nessunContenuto()
  }),

  http.post(api('/users/me/password'), async ({ request }) => {
    await delay(RITARDO)
    const { account: a, risposta } = conLogin(request)
    if (risposta) return risposta
    const b = await leggiJson(request)
    const erroreP = errorePassword(b.nuovaPassword)
    if (!nonVuoto(b.passwordAttuale) || erroreP) return errore('VALIDAZIONE', erroreP ? { nuovaPassword: erroreP } : { passwordAttuale: 'obbligatoria' })
    if (b.passwordAttuale !== a.password) return errore('PASSWORD_ERRATA')
    if (b.nuovaPassword === a.password) return errore('PASSWORD_UGUALE')
    a.password = b.nuovaPassword as string
    return nessunContenuto()
  }),

  // Anonimizzazione: irreversibile, con la password; mai l'ultimo SUPERADMIN attivo
  http.post(api('/users/me/anonymize'), async ({ request }) => {
    await delay(RITARDO)
    const { account: a, token, risposta } = conLogin(request)
    if (risposta) return risposta
    const b = await leggiJson(request)
    if (b.password !== a.password) return errore('PASSWORD_ERRATA')
    const altriSuperadmin = account.some((x) => x.id !== a.id && x.ruolo === 'SUPERADMIN' && x.stato === 'ATTIVO')
    if (a.ruolo === 'SUPERADMIN' && !altriSuperadmin) return errore('ULTIMO_SUPERADMIN')

    const u = trovaUtente(a.id)
    if (u.immagineProfilo) cancellaImmagine(u.immagineProfilo)
    Object.assign(u, { nome: 'Utente', cognome: 'anonimo', immagineProfilo: null, attivo: false })
    Object.assign(a, { email: `anon-${a.id}@nosey.invalid`, indirizzo: null, dataNascita: null, stato: 'ANONIMIZZATO', ruolo: 'USER' })
    // Richieste in attesa (inviate e ricevute) ritirate; le amicizie accettate restano
    for (const am of amicizie) {
      if (am.stato === 'PENDENTE' && (am.richiedenteId === a.id || am.riceventeId === a.id)) am.stato = 'RITIRATA'
    }
    allineaAmicizieCorrente()
    revocaToken(token)
    return nessunContenuto()
  }),
]
