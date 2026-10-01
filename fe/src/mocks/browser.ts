// Dati finti con MSW (FE1-03, FE2-03): intercetta nel browser le chiamate agli endpoint (eventi,
// accesso, profilo, amicizie, chat, notifiche, utenti dell'admin, WebSocket STOMP) e risponde con i dati di mocks/dati.ts e
// mocks/datiSocial.ts. Le chiamate che non conosce (es. /api/stato) passano
// al backend vero. Si avvia da main.tsx, solo in sviluppo.
import { setupWorker } from 'msw/browser'
import { handlerAdmin } from './handlers/admin'
import { handlerAuth } from './handlers/auth'
import { handlerContenuti } from './handlers/contenuti'
import { handlerEventi } from './handlers/eventi'
import { handlerImmagini } from './handlers/immagini'
import { handlerPartecipanti } from './handlers/partecipanti'
import { handlerSocial } from './handlers/social'
import { handlerWebSocket } from './handlers/websocket'

export const worker = setupWorker(...handlerImmagini, ...handlerEventi, ...handlerContenuti, ...handlerPartecipanti, ...handlerAuth, ...handlerSocial, ...handlerAdmin, ...handlerWebSocket)

export function avviaDatiFinti() {
  return worker.start({
    onUnhandledFrame: 'bypass',
    // Nella console del browser compare ogni chiamata intercettata: utile per capire cosa succede
    quiet: false,
  })
}
