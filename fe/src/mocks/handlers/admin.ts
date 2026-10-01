// Endpoint finti del pannello admin (progettazione v4, sezioni 12 e 13): utenti e ruoli.
// Gli account sono quelli di datiSocial.ts (nome e cognome in dati.ts); serve un token di un
// ADMIN o SUPERADMIN, per esempio sofia@nosey.it (ADMIN) o elena@nosey.it (SUPERADMIN).
import { delay, http, HttpResponse } from 'msw'
import type { AdminUtenteResponse, StatoUtente } from '@/types/api'
import { trovaUtente } from '../dati'
import { account, type AccountFinto } from '../datiSocial'
import { errore, pagina } from '../utili'
import { conLogin } from './auth'
import { api, RITARDO } from './comuni'

const STATI: StatoUtente[] = ['ATTIVO', 'SOSPESO', 'ANONIMIZZATO']

/** Solo ADMIN e SUPERADMIN, come /api/admin/** nel backend */
function soloAdmin(request: Request) {
  const esito = conLogin(request)
  if (esito.risposta) return esito
  if (esito.account.ruolo === 'USER') return { risposta: errore('ACCESSO_NEGATO') }
  return esito
}

/** Data di registrazione: gli account non la salvano, si ricava dall'ordine (gli ultimi sono i piu' recenti) */
const creatoIl = (a: AccountFinto) => new Date(Date.UTC(2026, 0, 10) + account.indexOf(a) * 86_400_000).toISOString()

export function inAdminUtente(a: AccountFinto): AdminUtenteResponse {
  const u = trovaUtente(a.id)
  return {
    id: a.id,
    email: a.email,
    nome: u.nome,
    cognome: u.cognome,
    ruolo: a.ruolo,
    stato: a.stato,
    verificato: a.verificato,
    creatoIl: creatoIl(a),
  }
}

export const handlerAdmin = [
  // ListaUtenti: ?search= su email, nome e cognome; ?status=; dal piu' recente
  http.get(api('/admin/users'), async ({ request }) => {
    await delay(RITARDO)
    const { risposta } = soloAdmin(request)
    if (risposta) return risposta
    const url = new URL(request.url)
    const cerca = (url.searchParams.get('search') ?? '').trim().toLowerCase()
    const stato = url.searchParams.get('status')
    if (stato !== null && !STATI.includes(stato as StatoUtente)) return errore('VALIDAZIONE', { status: 'Stato non valido' })

    const lista = account
      .map(inAdminUtente)
      .filter((u) => !stato || u.stato === stato)
      .filter((u) => !cerca || [u.email, u.nome, u.cognome].some((t) => t.toLowerCase().includes(cerca)))
      .sort((x, y) => Date.parse(y.creatoIl) - Date.parse(x.creatoIl))
    const corpo = pagina(lista, url)
    return corpo ? HttpResponse.json(corpo) : errore('VALIDAZIONE', { page: 'Pagina non valida' })
  }),
]
