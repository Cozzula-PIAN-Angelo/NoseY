// Finto server STOMP su /ws (FE2-11): con i dati finti il token e' finto e il backend vero lo
// rifiuterebbe, quindi anche il WebSocket risponde da qui. Stesse regole della sezione 11:
// CONNECT con un token finto valido, SEND solo verso /app/**, SUBSCRIBE solo alle tre code.
// Per far arrivare qualcosa live (chat, notifiche): pubblicaFinto(utenteId, 'messages', corpo).
import { ws } from 'msw'
import type { ErroreWebSocket } from '@/lib/errori'
import type { Uuid } from '@/types/api'
import { accountDaRichiesta } from '../datiSocial'

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
          }
          // Le destinazioni /app/** (es. /app/chats/{chatId}/send) si aggiungono qui con FE2-12
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
