// Endpoint finti del pannello admin (progettazione v4, sezioni 12 e 13): utenti, ruoli e catalogo artisti.
// Gli account sono quelli di datiSocial.ts (nome e cognome in dati.ts); serve un token di un
// ADMIN o SUPERADMIN, per esempio sofia@nosey.it (ADMIN) o elena@nosey.it (SUPERADMIN, l'unica che
// puo' cambiare i ruoli).
import { delay, http, HttpResponse } from 'msw'
import { LIMITI_EVENTI, type AdminUtenteResponse, type Ruolo, type StatoUtente } from '@/types/api'
import { artisti, cancellaImmagine, eventi, nuovoId, salvaImmagine, trovaUtente } from '../dati'
import { account, type AccountFinto } from '../datiSocial'
import { errore, leggiJson, nessunContenuto, pagina } from '../utili'
import { conLogin } from './auth'
import { api, RITARDO } from './comuni'

const STATI: StatoUtente[] = ['ATTIVO', 'SOSPESO', 'ANONIMIZZATO']
const LIVELLO: Record<Ruolo, number> = { USER: 1, ADMIN: 2, SUPERADMIN: 3 }

/** Solo ADMIN e SUPERADMIN, come /api/admin/** nel backend */
function soloAdmin(request: Request) {
  const esito = conLogin(request)
  if (esito.risposta) return esito
  if (esito.account.ruolo === 'USER') return { risposta: errore('ACCESSO_NEGATO') }
  return esito
}

/** Immagine dell'artista dal campo "file": undefined se manca, null se non e' valida (come CreaFoto) */
function immagineArtista(dati: FormData | null): File | null | undefined {
  const file = dati?.get('file')
  if (!(file instanceof File) || file.size === 0) return undefined
  const tipi: readonly string[] = LIMITI_EVENTI.tipiFoto
  return file.size <= LIMITI_EVENTI.byteFoto && tipi.includes(file.type) ? file : null
}

const nomeUsato = (nome: string, tranneId?: string) =>
  artisti.some((x) => x.id !== tranneId && x.nome.toLowerCase() === nome.toLowerCase())

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

  // CambiaStatoUtente: solo ATTIVO o SOSPESO, solo su ruoli inferiori al proprio e mai su se stessi.
  // Con SOSPESO i token dell'utente smettono di valere (accountDaRichiesta vuole ATTIVO) e il login
  // risponde ACCOUNT_SOSPESO
  http.patch(api('/admin/users/:utenteId/status'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: io, risposta } = soloAdmin(request)
    if (risposta) return risposta
    const b = await leggiJson(request)
    if (b.stato !== 'ATTIVO' && b.stato !== 'SOSPESO') return errore('STATO_NON_AMMESSO')
    const a = account.find((x) => x.id === params.utenteId)
    if (!a) return errore('NON_TROVATO')
    if (a.id === io.id || LIVELLO[a.ruolo] >= LIVELLO[io.ruolo]) return errore('RUOLO_INSUFFICIENTE')
    if (a.stato === 'ANONIMIZZATO') return errore('UTENTE_ANONIMIZZATO')
    a.stato = b.stato
    trovaUtente(a.id).attivo = a.stato === 'ATTIVO'
    return HttpResponse.json(inAdminUtente(a))
  }),

  // CambiaRuolo: solo SUPERADMIN; solo USER o ADMIN, mai su se stessi o su un SUPERADMIN, solo account
  // verificati e attivi. Il backend revoca anche i token dell'utente: qui restano validi fino alla scadenza
  http.patch(api('/superadmin/users/:utenteId/role'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: io, risposta } = conLogin(request)
    if (risposta) return risposta
    if (io.ruolo !== 'SUPERADMIN') return errore('ACCESSO_NEGATO')
    const b = await leggiJson(request)
    if (b.ruolo === 'SUPERADMIN') return errore('RUOLO_NON_AMMESSO')
    if (b.ruolo !== 'USER' && b.ruolo !== 'ADMIN') return errore('VALIDAZIONE', { ruolo: 'Ruolo non valido' })
    const a = account.find((x) => x.id === params.utenteId)
    if (!a) return errore('NON_TROVATO')
    if (a.id === io.id || a.ruolo === 'SUPERADMIN') return errore('RUOLO_INSUFFICIENTE')
    if (!a.verificato) return errore('UTENTE_NON_VERIFICATO')
    if (a.stato !== 'ATTIVO') return errore('UTENTE_NON_ATTIVO')
    a.ruolo = b.ruolo
    return HttpResponse.json(inAdminUtente(a))
  }),

  // ---------------------------------------------------------------- Artisti (BE1-19)

  // PROPOSTA (il backend non ce l'ha ancora): catalogo per l'admin, anche i disattivati, alfabetico
  http.get(api('/admin/artists'), async ({ request }) => {
    await delay(RITARDO)
    const { risposta } = soloAdmin(request)
    if (risposta) return risposta
    const cerca = (new URL(request.url).searchParams.get('search') ?? '').trim().toLowerCase()
    const lista = artisti.filter((x) => x.nome.toLowerCase().includes(cerca)).sort((x, y) => x.nome.localeCompare(y.nome, 'it'))
    return HttpResponse.json(lista)
  }),

  // CreaArtista: multipart con "nome" (obbligatorio) e "file" (facoltativo)
  http.post(api('/admin/artists'), async ({ request }) => {
    await delay(RITARDO)
    const { risposta } = soloAdmin(request)
    if (risposta) return risposta
    const dati = await request.formData().catch(() => null)
    const nome = dati?.get('nome')
    if (typeof nome !== 'string' || !nome.trim() || nome.length > LIMITI_EVENTI.nomeArtista)
      return errore('VALIDAZIONE', { nome: 'Obbligatorio, massimo 100 caratteri' })
    const file = immagineArtista(dati)
    if (file === null) return errore('FILE_NON_VALIDO')
    if (nomeUsato(nome.trim())) return errore('ARTISTA_NOME_GIA_USATO')
    const id = nuovoId('a')
    const artista = { id, nome: nome.trim(), immagineUrl: file ? salvaImmagine(`/api/artists/${id}/image`, file, file.type) : null, attivo: true }
    artisti.push(artista)
    return HttpResponse.json(artista, { status: 201 })
  }),

  // ModificaArtista: multipart con i soli campi da cambiare ("nome", "attivo", "file", "rimuoviImmagine")
  http.patch(api('/admin/artists/:artistaId'), async ({ request, params }) => {
    await delay(RITARDO)
    const { risposta } = soloAdmin(request)
    if (risposta) return risposta
    const dati = await request.formData().catch(() => null)
    const nome = dati?.get('nome')
    const attivo = dati?.get('attivo')
    const rimuovi = dati?.get('rimuoviImmagine') === 'true'
    const file = immagineArtista(dati)
    if (typeof nome !== 'string' && attivo == null && file === undefined && !rimuovi) return errore('RICHIESTA_VUOTA')
    if (typeof nome === 'string' && (!nome.trim() || nome.length > LIMITI_EVENTI.nomeArtista))
      return errore('VALIDAZIONE', { nome: 'Non vuoto, massimo 100 caratteri' })
    if (attivo != null && attivo !== 'true' && attivo !== 'false') return errore('VALIDAZIONE', { attivo: 'true o false' })
    if (rimuovi && file !== undefined) return errore('VALIDAZIONE', { rimuoviImmagine: 'Incompatibile con file' })
    if (file === null) return errore('FILE_NON_VALIDO')
    const artista = artisti.find((x) => x.id === params.artistaId)
    if (!artista) return errore('NON_TROVATO')
    if (typeof nome === 'string' && nomeUsato(nome.trim(), artista.id)) return errore('ARTISTA_NOME_GIA_USATO')

    if (typeof nome === 'string') artista.nome = nome.trim()
    if (attivo != null) artista.attivo = attivo === 'true'
    if (rimuovi && artista.immagineUrl) {
      cancellaImmagine(artista.immagineUrl)
      artista.immagineUrl = null
    }
    if (file) artista.immagineUrl = salvaImmagine(`/api/artists/${artista.id}/image`, file, file.type)
    return HttpResponse.json(artista)
  }),

  // EliminaArtista: solo se non e' in nessun evento, altrimenti 409 ARTISTA_IN_USO (va disattivato)
  http.delete(api('/admin/artists/:artistaId'), async ({ request, params }) => {
    await delay(RITARDO)
    const { risposta } = soloAdmin(request)
    if (risposta) return risposta
    const indice = artisti.findIndex((x) => x.id === params.artistaId)
    if (indice < 0) return errore('NON_TROVATO')
    if (eventi.some((e) => e.artistiIds.includes(artisti[indice].id))) return errore('ARTISTA_IN_USO')
    const [tolto] = artisti.splice(indice, 1)
    if (tolto.immagineUrl) cancellaImmagine(tolto.immagineUrl)
    return nessunContenuto()
  }),
]
