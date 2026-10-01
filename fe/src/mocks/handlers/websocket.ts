// Finto server STOMP su /ws (FE2-11): con i dati finti il token e' finto e il backend vero lo
// rifiuterebbe, quindi anche il WebSocket risponde da qui. Stesse regole della sezione 11:
// CONNECT con un token finto valido, SEND solo verso /app/**, SUBSCRIBE solo alle tre code.
// Per far arrivare qualcosa live (chat, notifiche): pubblicaFinto(utenteId, 'messages', corpo).
// InviaMessaggio (FE2-12) salva il messaggio nei dati finti e lo recapita a tutti e due i membri.
import { ws } from 'msw'
import type { ErroreWebSocket } from '@/lib/errori'
import { LIMITI_SOCIAL, type MessaggioResponse, type Uuid } from '@/types/api'
import { nuovoId } from '../dati'
import { accountDaRichiesta, inChatResponse, messaggi, trovaChat, type ChatFinta } from '../datiSocial'

type Frame = { comando: string; header: Record<string, string>; corpo: string }

type Coda = 'messages' | 'notifications' | 'errors'
const CODE = ['/user/queue/messages', '/user/queue/notifications', '/user/queue/errors']

type Connessione = {
  utenteId: Uuid
  token: string
  /** id dell'iscrizione STOMP → destinazione */
  iscrizioni: Map<string, string>
  manda: (frame: Frame) => void
}
const connessioni = new Set<Connessione>()

// Un messaggio WebSocket puo' contenere piu' frame, separati da \0; i \n fra un frame e l'altro
// sono heartbeat. Gli header non usano caratteri da escape, qui non serve gestirli.
function leggiFrame(dati: string): Frame[] {
  return dati
    .split('\0')
    .map((f) => f.replace(/^[\r\n]+/, ''))
    .filter((f) => f.length > 0)
    .map((f) => {
      const fineHeader = f.indexOf('\n\n')
      const [comando, ...righe] = (fineHeader < 0 ? f : f.slice(0, fineHeader)).split('\n')
      const header: Record<string, string> = {}
      for (const riga of righe) {
        const i = riga.indexOf(':')
        if (i > 0 && !(riga.slice(0, i) in header)) header[riga.slice(0, i)] = riga.slice(i + 1)
      }
      return { comando, header, corpo: fineHeader < 0 ? '' : f.slice(fineHeader + 2) }
    })
}

function scriviFrame({ comando, header, corpo }: Frame) {
  const righe = Object.entries(header).map(([k, v]) => `${k}:${v}`)
  return `${comando}\n${righe.join('\n')}\n\n${corpo}\0`
}

// Token del CONNECT valido come per le API finte (non scaduto, non revocato, account ATTIVO)
function utenteDelToken(token: string) {
  const richiesta = new Request(window.location.origin, { headers: { Authorization: `Bearer ${token}` } })
  return accountDaRichiesta(richiesta)?.account.id ?? null
}

function mandaACoda(c: Connessione, coda: Coda, corpo: unknown) {
  const destinazione = `/user/queue/${coda}`
  for (const [id, dest] of c.iscrizioni) {
    if (dest !== destinazione) continue
    c.manda({
      comando: 'MESSAGE',
      header: { destination: dest, subscription: id, 'message-id': crypto.randomUUID(), 'content-type': 'application/json' },
      corpo: JSON.stringify(corpo),
    })
  }
}

const erroreWs = (codice: string): ErroreWebSocket => ({ codice, messaggio: `Dati finti: ${codice}` })

/** Recapita un corpo sulla coda di un utente, a tutte le sue connessioni (come convertAndSendToUser) */
export function pubblicaFinto(utenteId: Uuid, coda: Coda, corpo: unknown) {
  connessioni.forEach((c) => c.utenteId === utenteId && mandaACoda(c, coda, corpo))
}

// ---------------------------------------------------------------- InviaMessaggio (FE2-12)

const INVIO_CHAT = /^\/app\/chats\/([^/]+)\/send$/

/** Istanti degli invii dell'ultimo minuto, per utente (limite MESSAGGI_CHAT) */
const invii = new Map<Uuid, number[]>()

/**
 * Risposte finte dell'amico, per vedere arrivare un messaggio live anche senza backend.
 * Con il prefisso, cosi' nessuno le scambia per messaggi veri.
 */
const RISPOSTE = ['Ci sono! 🎶', 'Perfetto, ci vediamo lì', 'Arrivo tra dieci minuti', 'Ahah, grande!', 'Ti scrivo appena entro'].map(
  (r) => `🤖 Risposta automatica (dati finti): ${r}`,
)
const RITARDO_RISPOSTA = 2500
/** Una risposta in attesa per chat: piu' messaggi di fila ricevono una sola risposta */
const risposteInAttesa = new Map<Uuid, ReturnType<typeof setTimeout>>()

function salvaEPubblica(c: ChatFinta, mittenteId: Uuid, testo: string) {
  const m: MessaggioResponse = {
    id: nuovoId('m'),
    chatId: c.id,
    mittenteId,
    testo,
    letto: false,
    inviatoIl: new Date().toISOString(),
  }
  messaggi.push(m)
  // A tutti e due i membri, come il backend dopo il commit
  c.membri.forEach((id) => pubblicaFinto(id, 'messages', m))
}

// SEND /app/chats/{chatId}/send: controlli nell'ordine della sezione 11 (il token e' gia' verificato)
function inviaMessaggio(connessione: Connessione, chatId: string, corpo: string) {
  const io = connessione.utenteId
  const adesso = Date.now()
  const recenti = (invii.get(io) ?? []).filter((t) => adesso - t < 60_000)
  if (recenti.length >= LIMITI_SOCIAL.messaggiAlMinuto) return mandaACoda(connessione, 'errors', erroreWs('TROPPE_RICHIESTE'))
  invii.set(io, [...recenti, adesso])

  let testo: unknown
  try {
    testo = (JSON.parse(corpo) as { testo?: unknown } | null)?.testo
  } catch {
    testo = undefined
  }
  if (typeof testo !== 'string' || !testo.trim() || testo.length > LIMITI_SOCIAL.testoMessaggio) {
    return mandaACoda(connessione, 'errors', erroreWs('VALIDAZIONE'))
  }

  const c = trovaChat(chatId)
  if (!c || !c.membri.includes(io)) return mandaACoda(connessione, 'errors', erroreWs('NON_MEMBRO'))
  if (!inChatResponse(c, io).puoiScrivere) return mandaACoda(connessione, 'errors', erroreWs('CHAT_SOLA_LETTURA'))

  salvaEPubblica(c, io, testo)

  // L'amico risponde da solo dopo un attimo (solo nei dati finti)
  const amico = c.membri[0] === io ? c.membri[1] : c.membri[0]
  clearTimeout(risposteInAttesa.get(c.id))
  risposteInAttesa.set(
    c.id,
    setTimeout(() => {
      risposteInAttesa.delete(c.id)
      if (!inChatResponse(c, amico).puoiScrivere) return
      salvaEPubblica(c, amico, RISPOSTE[Math.floor(Math.random() * RISPOSTE.length)])
    }, RITARDO_RISPOSTA),
  )
}

const servizio = ws.link('*/ws')

export const handlerWebSocket = [
  servizio.addEventListener('connection', ({ client }) => {
    let connessione: Connessione | null = null
    const manda = (frame: Frame) => client.send(scriviFrame(frame))

    client.addEventListener('message', (evento) => {
      if (typeof evento.data !== 'string') return
      for (const frame of leggiFrame(evento.data)) {
        if (frame.comando === 'CONNECT' || frame.comando === 'STOMP') {
          const token = frame.header.Authorization?.replace(/^Bearer /, '') ?? ''
          const utenteId = utenteDelToken(token)
          if (!utenteId) {
            manda({
              comando: 'ERROR',
              header: { message: 'TOKEN_NON_VALIDO', 'content-type': 'application/json' },
              corpo: JSON.stringify(erroreWs('TOKEN_NON_VALIDO')),
            })
            client.close()
            return
          }
          connessione = { utenteId, token, iscrizioni: new Map(), manda }
          connessioni.add(connessione)
          // Niente heartbeat, come il simple broker di Spring senza scheduler
          manda({ comando: 'CONNECTED', header: { version: '1.2', 'heart-beat': '0,0' }, corpo: '' })
          continue
        }
        if (!connessione) continue

        if (frame.comando === 'SUBSCRIBE') {
          if (CODE.includes(frame.header.destination)) connessione.iscrizioni.set(frame.header.id, frame.header.destination)
          else mandaACoda(connessione, 'errors', erroreWs('ACCESSO_NEGATO'))
        } else if (frame.comando === 'UNSUBSCRIBE') {
          connessione.iscrizioni.delete(frame.header.id)
        } else if (frame.comando === 'SEND') {
          if (!frame.header.destination?.startsWith('/app/')) {
            mandaACoda(connessione, 'errors', erroreWs('ACCESSO_NEGATO'))
          } else if (!utenteDelToken(connessione.token)) {
            // Token revocato o scaduto dopo il CONNECT: controllato a ogni SEND
            mandaACoda(connessione, 'errors', erroreWs('TOKEN_NON_VALIDO'))
          } else {
            const invioChat = INVIO_CHAT.exec(frame.header.destination)
            if (invioChat) inviaMessaggio(connessione, invioChat[1], frame.corpo)
          }
        } else if (frame.comando === 'DISCONNECT') {
          if (frame.header.receipt) manda({ comando: 'RECEIPT', header: { 'receipt-id': frame.header.receipt }, corpo: '' })
          client.close()
        }
      }
    })

    client.addEventListener('close', () => {
      if (connessione) connessioni.delete(connessione)
    })
  }),
]
