// GET pubblici delle immagini (decisione 9): foto degli eventi, immagini degli artisti, avatar.
// Rispondono con i byte salvati in dati.ts (immagini). Un'immagine che i dati finti non conoscono
// passa al backend vero: cosi' funzionano anche gli avatar degli utenti reali dopo il login.
import { http, HttpResponse, passthrough } from 'msw'
import { immagini } from '../dati'
import { api } from './comuni'

function servi(request: Request) {
  const percorso = new URL(request.url).pathname
  const immagine = immagini.get(percorso)
  if (!immagine) return passthrough()
  return new HttpResponse(immagine.contenuto, {
    headers: { 'Content-Type': immagine.tipo, 'Cache-Control': 'no-cache' },
  })
}

export const handlerImmagini = [
  http.get(api('/events/:id/photos/:fotoId/image'), ({ request }) => servi(request)),
  http.get(api('/artists/:artistaId/image'), ({ request }) => servi(request)),
  http.get(api('/users/:utenteId/avatar'), ({ request }) => servi(request)),
]
