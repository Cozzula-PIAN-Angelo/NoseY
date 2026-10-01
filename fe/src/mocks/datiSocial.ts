// "Database" in memoria del lato utenti e social (FE2-03): account, token, amicizie, chat,
// messaggi e notifiche. Come dati.ts, le modifiche restano finche' non si ricarica la pagina,
// tranne gli account registrati (salvati nel localStorage, vedi salvaIscritti).
//
// Account per provare il login (password uguale per tutti: "password123", codice email "123456"):
//   valentina@nosey.it  USER, verificata: e' l'utente dei dati finti degli eventi (ID_UTENTE_CORRENTE)
//   sofia@nosey.it      ADMIN · elena@nosey.it SUPERADMIN
//   nuovo@nosey.it      non verificato (login → EMAIL_NON_VERIFICATA)
//   sospeso@nosey.it    sospeso (login → ACCOUNT_SOSPESO)
// I dati finti degli eventi rispondono sempre a nome di Valentina, chiunque abbia fatto l'accesso.
import type {
  AmiciziaResponse,
  CategoriaNotifica,
  ChatResponse,
  DataIso,
  IstanteIso,
  MessaggioResponse,
  NotificaResponse,
  Ruolo,
  StatoAmicizia,
  TipoNotificaAmicizia,
  TipoNotificaEvento,
  UtentePubblicoResponse,
  UtenteResponse,
  Uuid,
} from '@/types/api'
import { amicizieCorrente, eventi, ID_UTENTE_CORRENTE, trovaUtente, utenti } from './dati'
import { traOre } from './utili'

export const PASSWORD_FINTA = 'password123'
export const CODICE_FINTO = '123456'

// ---------------------------------------------------------------- Account

export type StatoAccount = 'ATTIVO' | 'SOSPESO' | 'ANONIMIZZATO'

export type AccountFinto = {
  id: Uuid
  email: string
  password: string
  indirizzo: string | null
  dataNascita: DataIso | null
  ruolo: Ruolo
  verificato: boolean
  stato: StatoAccount
}

// Nome, cognome e avatar stanno in utenti (dati.ts), condivisi con i dati degli eventi
const nuovoAccount = (id: Uuid, email: string, ruolo: Ruolo, altro: Partial<AccountFinto> = {}): AccountFinto => ({
  id,
  email,
  password: PASSWORD_FINTA,
  indirizzo: null,
  dataNascita: '1996-01-01',
  ruolo,
  verificato: true,
  stato: 'ATTIVO',
  ...altro,
})

export const account: AccountFinto[] = [
  nuovoAccount(ID_UTENTE_CORRENTE, 'valentina@nosey.it', 'USER', { indirizzo: 'Via Roma 1, Torino', dataNascita: '1997-04-12' }),
  nuovoAccount('u-0001-sofia', 'sofia@nosey.it', 'ADMIN'),
  nuovoAccount('u-0002-matteo', 'matteo@nosey.it', 'USER'),
  nuovoAccount('u-0003-elena', 'elena@nosey.it', 'SUPERADMIN'),
  nuovoAccount('u-0004-dario', 'dario@nosey.it', 'USER'),
  nuovoAccount('u-0005-anonimo', 'anon-u-0005-anonimo@nosey.invalid', 'USER', { dataNascita: null, stato: 'ANONIMIZZATO' }),
  // Solo per il login: non compaiono negli eventi
  nuovoAccount('u-0006-nuovo', 'nuovo@nosey.it', 'USER', { verificato: false }),
  nuovoAccount('u-0007-sospeso', 'sospeso@nosey.it', 'USER', { stato: 'SOSPESO' }),
]
utenti.push(
  { id: 'u-0006-nuovo', nome: 'Nuovo', cognome: 'Iscritto', immagineProfilo: null, attivo: true },
  { id: 'u-0007-sospeso', nome: 'Utente', cognome: 'Sospeso', immagineProfilo: null, attivo: false },
)

// Account creati con la registrazione: salvati nel localStorage, cosi' un refresh fra registrazione e
// verifica non li perde (il codice risulterebbe "non corretto") e le altre schede li riconoscono
// (con un account sconosciuto /users/me risponde 401 e la sessione, condivisa, si chiuderebbe)
const CHIAVE_ISCRITTI = 'nosey.datiFinti.iscritti'
const idIniziali = new Set(account.map((a) => a.id))

type Iscritto = { account: AccountFinto; nome: string; cognome: string }

function leggiIscritti(): Iscritto[] {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_ISCRITTI) ?? '[]') as Iscritto[]
  } catch {
    return []
  }
}

/** Da chiamare dopo una registrazione o una verifica */
export function salvaIscritti() {
  const iscritti: Iscritto[] = account
    .filter((a) => !idIniziali.has(a.id))
    .map((a) => {
      const u = utenti.find((x) => x.id === a.id)
      return { account: a, nome: u?.nome ?? '', cognome: u?.cognome ?? '' }
    })
  try {
    localStorage.setItem(CHIAVE_ISCRITTI, JSON.stringify(iscritti))
  } catch {
    // Spazio pieno o storage bloccato: restano solo in memoria
  }
}

for (const { account: a, nome, cognome } of leggiIscritti()) {
  account.push(a)
  utenti.push({ id: a.id, nome, cognome, immagineProfilo: null, attivo: true })
}

export const trovaAccount = (id: Uuid) => account.find((a) => a.id === id)
export const accountPerEmail = (email: string) => account.find((a) => a.email === email.trim().toLowerCase())

export function inUtenteResponse(a: AccountFinto): UtenteResponse {
  const u = trovaUtente(a.id)
  return {
    id: a.id,
    email: a.email,
    nome: u.nome,
    cognome: u.cognome,
    indirizzo: a.indirizzo,
    dataNascita: a.dataNascita,
    immagineProfilo: u.immagineProfilo,
    ruolo: a.ruolo,
  }
}

// ---------------------------------------------------------------- Token

// Il token finto porta con se' utente e scadenza ("finto.<utenteId>.<scadenza ms>"): resta valido
// dopo un refresh della pagina, quando questi dati in memoria ripartono da zero.
const DURATA_TOKEN_MS = 24 * 3_600_000
const revocati = new Set<string>()

export function nuovoToken(utenteId: Uuid) {
  const scadenza = Date.now() + DURATA_TOKEN_MS
  return { token: `finto.${utenteId}.${scadenza}.${crypto.randomUUID().slice(0, 8)}`, scadenza: new Date(scadenza).toISOString() }
}

export const revocaToken = (token: string) => revocati.add(token)

/** Account del token di una richiesta: null se manca, e' scaduto, revocato o l'account non e' attivo */
export function accountDaRichiesta(request: Request): { account: AccountFinto; token: string } | null {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token || revocati.has(token)) return null
  const [prefisso, utenteId, scadenza] = token.split('.')
  if (prefisso !== 'finto' || Number(scadenza) < Date.now()) return null
  const a = trovaAccount(utenteId)
  return a && a.stato === 'ATTIVO' ? { account: a, token } : null
}

// ---------------------------------------------------------------- Amicizie

/** Stati salvati nel database (sezione 8): il frontend vede solo quelli calcolati */
type StatoSalvato = 'PENDENTE' | 'ACCETTATA' | 'RIFIUTATA' | 'RIMOSSA' | 'RITIRATA'

export type AmiciziaFinta = {
  id: Uuid
  richiedenteId: Uuid
  riceventeId: Uuid
  eventoId: Uuid
  stato: StatoSalvato
  chiusaDa: Uuid | null
  mascherata: boolean
  aggiornataIl: IstanteIso
}

// Stesse amicizie di amicizieCorrente (dati.ts): Sofia amica, a Matteo inviata, da Elena ricevuta
export const amicizie: AmiciziaFinta[] = [
  { id: 'am-01', richiedenteId: 'u-0001-sofia', riceventeId: ID_UTENTE_CORRENTE, eventoId: 'e-01', stato: 'ACCETTATA', chiusaDa: null, mascherata: false, aggiornataIl: traOre(-72) },
  { id: 'am-02', richiedenteId: ID_UTENTE_CORRENTE, riceventeId: 'u-0002-matteo', eventoId: 'e-02', stato: 'PENDENTE', chiusaDa: null, mascherata: false, aggiornataIl: traOre(-20) },
  { id: 'am-03', richiedenteId: 'u-0003-elena', riceventeId: ID_UTENTE_CORRENTE, eventoId: 'e-07', stato: 'PENDENTE', chiusaDa: null, mascherata: false, aggiornataIl: traOre(-3) },
  // Amica poi anonimizzata: la chat resta, in sola lettura
  { id: 'am-04', richiedenteId: ID_UTENTE_CORRENTE, riceventeId: 'u-0005-anonimo', eventoId: 'e-01', stato: 'ACCETTATA', chiusaDa: null, mascherata: false, aggiornataIl: traOre(-400) },
]

export const trovaAmicizia = (id: unknown) => amicizie.find((a) => a.id === id)

/** Riga della coppia (una sola per coppia, come l'indice unico del backend) */
export const amiciziaDellaCoppia = (x: Uuid, y: Uuid) =>
  amicizie.find((a) => (a.richiedenteId === x && a.riceventeId === y) || (a.richiedenteId === y && a.riceventeId === x))

/** statoAmicizia di X nei confronti di Y: tabella della sezione 8 */
export function statoAmicizia(x: Uuid, y: Uuid): StatoAmicizia {
  const a = amiciziaDellaCoppia(x, y)
  let stato: StatoAmicizia = 'NESSUNA'
  if (a?.stato === 'PENDENTE') stato = a.richiedenteId === x ? 'INVIATA' : 'RICEVUTA'
  else if (a?.stato === 'ACCETTATA') stato = 'AMICI'
  else if (a?.stato === 'RIFIUTATA' && a.chiusaDa !== x) stato = a.mascherata ? 'INVIATA' : 'NESSUNA'
  else if (a?.stato === 'RIMOSSA' && a.chiusaDa !== x) stato = 'NON_DISPONIBILE'
  if (stato !== 'AMICI' && !trovaUtente(y).attivo) return 'NON_DISPONIBILE'
  return stato
}

const altroDella = (a: AmiciziaFinta, io: Uuid) => (a.richiedenteId === io ? a.riceventeId : a.richiedenteId)

export function inAmiciziaResponse(a: AmiciziaFinta, io: Uuid): AmiciziaResponse {
  const altro = altroDella(a, io)
  const stato = statoAmicizia(io, altro)
  return {
    id: a.id,
    altroUtente: trovaUtente(altro),
    stato: stato === 'INVIATA' || stato === 'RICEVUTA' ? stato : 'AMICI',
    eventoId: a.eventoId,
    chatId: chatDellaCoppia(io, altro)?.id ?? null,
  }
}

/** Da chiamare dopo ogni cambio: la lista dei partecipanti (dati.ts) legge amicizieCorrente */
export function allineaAmicizieCorrente() {
  for (const chiave of Object.keys(amicizieCorrente)) delete amicizieCorrente[chiave]
  for (const a of amicizie) {
    if (a.richiedenteId !== ID_UTENTE_CORRENTE && a.riceventeId !== ID_UTENTE_CORRENTE) continue
    const altro = altroDella(a, ID_UTENTE_CORRENTE)
    const stato = statoAmicizia(ID_UTENTE_CORRENTE, altro)
    if (stato !== 'NESSUNA') amicizieCorrente[altro] = { stato, amiciziaId: a.id }
  }
}

/** Ticket per l'evento, o proprietario (conta come averlo: decisione D6) */
export function haTicket(utenteId: Uuid, eventoId: Uuid) {
  const e = eventi.find((ev) => ev.id === eventoId)
  return !!e && (e.proprietarioId === utenteId || e.partecipanti.some((p) => p.utenteId === utenteId))
}

// ---------------------------------------------------------------- Chat e messaggi

export type ChatFinta = { id: Uuid; membri: [Uuid, Uuid]; creataIl: IstanteIso }

export const chat: ChatFinta[] = [
  { id: 'c-01', membri: ['u-0001-sofia', ID_UTENTE_CORRENTE], creataIl: traOre(-72) },
  { id: 'c-02', membri: [ID_UTENTE_CORRENTE, 'u-0005-anonimo'], creataIl: traOre(-400) },
]

export const chatDellaCoppia = (x: Uuid, y: Uuid) => chat.find((c) => c.membri.includes(x) && c.membri.includes(y))
export const trovaChat = (id: unknown) => chat.find((c) => c.id === id)

export const messaggi: MessaggioResponse[] = []
// Una conversazione con Sofia: 40 messaggi, cosi' si vede il caricamento dei piu' vecchi (30 per volta)
for (let i = 0; i < 40; i++) {
  const mio = i % 3 === 1
  messaggi.push({
    id: `m-01-${String(i).padStart(3, '0')}`,
    chatId: 'c-01',
    mittenteId: mio ? ID_UTENTE_CORRENTE : 'u-0001-sofia',
    testo: i === 39 ? 'Ci vediamo stasera al Chronos? 🎧' : mio ? `Messaggio mio numero ${i + 1}` : `Messaggio di Sofia numero ${i + 1}`,
    // Gli ultimi due di Sofia non ancora letti
    letto: i < 38 || mio,
    inviatoIl: traOre(-48 + i),
  })
}
messaggi.push({
  id: 'm-02-000',
  chatId: 'c-02',
  mittenteId: 'u-0005-anonimo',
  testo: 'Grazie per la serata!',
  letto: true,
  inviatoIl: traOre(-390),
})

export function inChatResponse(c: ChatFinta, io: Uuid): ChatResponse {
  const altro = c.membri[0] === io ? c.membri[1] : c.membri[0]
  const suoi = messaggi.filter((m) => m.chatId === c.id)
  const ultimo = suoi.reduce<MessaggioResponse | null>((u, m) => (!u || m.inviatoIl > u.inviatoIl ? m : u), null)
  const amici = amiciziaDellaCoppia(io, altro)?.stato === 'ACCETTATA'
  return {
    id: c.id,
    amico: trovaUtente(altro),
    ultimoMessaggio: ultimo && { testo: ultimo.testo, mittenteId: ultimo.mittenteId, inviatoIl: ultimo.inviatoIl },
    nonLetti: suoi.filter((m) => m.mittenteId !== io && !m.letto).length,
    puoiScrivere: amici && trovaUtente(io).attivo && trovaUtente(altro).attivo,
  }
}

/** Messaggi dell'altro letti (SegnaChatLetta) */
export function segnaChatLetta(chatId: Uuid, io: Uuid) {
  for (const m of messaggi) if (m.chatId === chatId && m.mittenteId !== io) m.letto = true
}

// ---------------------------------------------------------------- Notifiche

export type NotificaEventoFinta = {
  id: Uuid
  destinatarioId: Uuid
  tipo: TipoNotificaEvento
  testo: string
  eventoId: Uuid
  letta: boolean
  creataIl: IstanteIso
}

export type NotificaAmiciziaFinta = {
  id: Uuid
  destinatarioId: Uuid
  tipo: TipoNotificaAmicizia
  amiciziaId: Uuid
  letta: boolean
  creataIl: IstanteIso
}

const notificaEvento = (id: string, tipo: TipoNotificaEvento, eventoId: Uuid, testo: string, ore: number, letta = false) =>
  ({ id, destinatarioId: ID_UTENTE_CORRENTE, tipo, testo, eventoId, letta, creataIl: traOre(ore) }) satisfies NotificaEventoFinta

// 25 notifiche degli eventi: piu' di una pagina (20), per provare la paginazione
export const notificheEventi: NotificaEventoFinta[] = [
  notificaEvento('ne-01', 'ISCRIZIONE', 'e-03', 'Nuove iscrizioni a «Subterranean Resonance V»: ora 12 partecipanti', -1),
  notificaEvento('ne-02', 'MODIFICA', 'e-01', "L'evento «Chronos: Parallel Frequencies» è cambiato: date, luogo", -5),
  notificaEvento('ne-03', 'MANUALE', 'e-02', 'Porte aperte alle 21:30, portate un documento!', -9),
  notificaEvento('ne-04', 'ANNULLAMENTO', 'e-06', "L'evento «Warehouse Distortion Live» è stato annullato: maltempo", -30, true),
  notificaEvento('ne-05', 'MODERAZIONE', 'e-05', 'Una foto del tuo evento «Electric Velvet: Sunrise Session» è stata rimossa dalla moderazione', -50, true),
  ...Array.from({ length: 20 }, (_, i) =>
    notificaEvento(`ne-${String(i + 6).padStart(2, '0')}`, 'ISCRIZIONE', 'e-05', `Nuova iscrizione a «Electric Velvet: Sunrise Session»: ora ${i + 1} partecipanti`, -60 - i * 6, true),
  ),
]

export const notificheAmicizie: NotificaAmiciziaFinta[] = [
  { id: 'na-01', destinatarioId: ID_UTENTE_CORRENTE, tipo: 'RICHIESTA', amiciziaId: 'am-03', letta: false, creataIl: traOre(-3) },
  { id: 'na-02', destinatarioId: ID_UTENTE_CORRENTE, tipo: 'ACCETTATA', amiciziaId: 'am-04', letta: true, creataIl: traOre(-400) },
]

const nomeDi = (u: UtentePubblicoResponse) => `${u.nome} ${u.cognome}`

export function inNotificaEvento(n: NotificaEventoFinta): NotificaResponse {
  return { id: n.id, categoria: 'events', tipo: n.tipo, testo: n.testo, riferimentoId: n.eventoId, letta: n.letta, creataIl: n.creataIl }
}

/** Testo generato alla lettura con il nome attuale dell'altro (sezione 10) */
export function inNotificaAmicizia(n: NotificaAmiciziaFinta): NotificaResponse {
  const a = trovaAmicizia(n.amiciziaId)!
  const altro = trovaUtente(altroDella(a, n.destinatarioId))
  const testo = n.tipo === 'RICHIESTA' ? `${nomeDi(altro)} ti ha chiesto l'amicizia` : `${nomeDi(altro)} ha accettato la tua amicizia`
  return { id: n.id, categoria: 'friendships', tipo: n.tipo, testo, riferimentoId: n.amiciziaId, letta: n.letta, creataIl: n.creataIl }
}

/** Notifiche delle chat: una per chat con messaggi dell'altro non letti, dalla piu' recente */
export function notificheChat(io: Uuid): NotificaResponse[] {
  return chat
    .filter((c) => c.membri.includes(io))
    .map((c) => {
      const nonLetti = messaggi.filter((m) => m.chatId === c.id && m.mittenteId !== io && !m.letto)
      if (nonLetti.length === 0) return null
      const altro = trovaUtente(c.membri[0] === io ? c.membri[1] : c.membri[0])
      const ultimo = nonLetti.reduce((u, m) => (m.inviatoIl > u.inviatoIl ? m : u))
      return {
        id: `nc-${c.id}`,
        categoria: 'chats',
        tipo: 'NUOVI_MESSAGGI',
        testo: `Nuovi messaggi da ${nomeDi(altro)}`,
        riferimentoId: c.id,
        letta: false,
        creataIl: ultimo.inviatoIl,
      } satisfies NotificaResponse
    })
    .filter((n) => n !== null)
    .sort((a, b) => b.creataIl.localeCompare(a.creataIl))
}

export const CATEGORIE: CategoriaNotifica[] = ['events', 'friendships', 'chats']

// All'avvio amicizieCorrente (dati.ts) prende anche le amicizie aggiunte qui
allineaAmicizieCorrente()
