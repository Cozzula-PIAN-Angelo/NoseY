// Dati finti con MSW (FE1-03): intercetta nel browser le chiamate agli endpoint degli eventi e
// risponde con i dati di mocks/dati.ts. Le chiamate che non conosce (es. /api/stato) passano
// al backend vero. Si avvia da main.tsx, solo in sviluppo.
import { setupWorker } from 'msw/browser'
import { handlerContenuti } from './handlers/contenuti'
import { handlerEventi } from './handlers/eventi'
import { handlerPartecipanti } from './handlers/partecipanti'

export const worker = setupWorker(...handlerEventi, ...handlerContenuti, ...handlerPartecipanti)

export function avviaDatiFinti() {
  return worker.start({
    onUnhandledFrame: 'bypass',
    // Nella console del browser compare ogni chiamata intercettata: utile per capire cosa succede
    quiet: false,
  })
}
