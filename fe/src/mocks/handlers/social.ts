// Endpoint finti di amicizie, chat e notifiche (progettazione v4, sezioni 8, 9 e 10), con i
// controlli nell'ordine del backend. Dati in datiSocial.ts; chi chiede si ricava dal token.
// L'invio dei messaggi passa dal WebSocket (FE2-11): qui non c'e'.
import { delay, http, HttpResponse } from 'msw'
import { DIMENSIONE_MASSIMA, DIMENSIONE_PAGINA, type PaginaResponse } from '@/lib/pagine'
import { LIMITI_SOCIAL, type AmiciziaResponse, type CategoriaNotifica, type ConteggiNonLette, type MessaggiResponse } from '@/types/api'
import { nuovoId, trovaEvento, utenti } from '../dati'
import {
  allineaAmicizieCorrente,
  amiciziaDellaCoppia,
  amicizie,
  CATEGORIE,
  chat,
  chatDellaCoppia,
  haTicket,
  inAmiciziaResponse,
  inChatResponse,
  inNotificaAmicizia,
  inNotificaEvento,
  messaggi,
  notificheAmicizie,
  notificheChat,
  notificheEventi,
  segnaChatLetta,
  trovaAmicizia,
  trovaChat,
  type AmiciziaFinta,
} from '../datiSocial'
import { errore, leggiJson, nessunContenuto } from '../utili'
import { conLogin } from './auth'
import { api, RITARDO } from './comuni'

const adesso = () => new Date().toISOString()

/** Pagina di una lista gia' ordinata, con ?page=&size= come il backend (size massimo 100) */
function pagina<T>(lista: T[], url: URL): PaginaResponse<T> | null {
  const page = Number(url.searchParams.get('page') ?? 0)
  const size = Number(url.searchParams.get('size') ?? DIMENSIONE_PAGINA)
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > DIMENSIONE_MASSIMA) return null
  return {
    contenuto: lista.slice(page * size, page * size + size),
    pagina: page,
    dimensione: size,
    totaleElementi: lista.length,
    totalePagine: Math.ceil(lista.length / size),
  }
}

/** Amicizia che riguarda chi chiede: 404 se non esiste o e' di altri */
function miaAmicizia(id: unknown, io: string): AmiciziaFinta | null {
  const a = trovaAmicizia(id)
  return a && (a.richiedenteId === io || a.riceventeId === io) ? a : null
}

/** Ricalcola amicizieCorrente (lista dei partecipanti) e risponde */
function dopoCambio<T>(risposta: T): T {
  allineaAmicizieCorrente()
  return risposta
}

const categoriaValida = (c: unknown): c is CategoriaNotifica => CATEGORIE.includes(c as CategoriaNotifica)

export const handlerSocial = [
  // ---------- 8. Amicizie ----------

  http.post(api('/friendships'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const b = await leggiJson(request)
    if (typeof b.riceventeId !== 'string' || typeof b.eventoId !== 'string') {
      return errore('VALIDAZIONE', { riceventeId: 'obbligatorio', eventoId: 'obbligatorio' })
    }
    const io = me.id
    const altro = b.riceventeId
    if (altro === io) return errore('RICHIESTA_A_SE_STESSO')
    const ricevente = utenti.find((u) => u.id === altro)
    if (!ricevente || !trovaEvento(b.eventoId)) return errore('NON_TROVATO')
    if (!haTicket(io, b.eventoId) || !haTicket(altro, b.eventoId)) return errore('NESSUN_TICKET')
    if (!ricevente.attivo) return errore('UTENTE_NON_ATTIVO')

    let a = amiciziaDellaCoppia(io, altro)
    const riapri = !a || a.stato === 'RITIRATA' || ((a.stato === 'RIFIUTATA' || a.stato === 'RIMOSSA') && a.chiusaDa === io)
    if (a && !riapri) {
      if (a.stato === 'RIFIUTATA' && !a.mascherata) {
        // Respinto che ritorna: per lui risulta inviata, l'altro non riceve nulla
        a.mascherata = true
        return dopoCambio(HttpResponse.json(inAmiciziaResponse(a, io), { status: 201 }))
      }
      if (a.stato === 'RIFIUTATA' || (a.stato === 'PENDENTE' && a.richiedenteId === io)) return errore('RICHIESTA_GIA_INVIATA')
      if (a.stato === 'PENDENTE') return errore('RICHIESTA_GIA_RICEVUTA')
      if (a.stato === 'ACCETTATA') return errore('GIA_AMICI')
      return errore('AMICIZIA_NON_DISPONIBILE')
    }
    // Riga nuova o riusata (una sola per coppia)
    if (!a) {
      a = { id: nuovoId('am'), richiedenteId: io, riceventeId: altro, eventoId: b.eventoId, stato: 'PENDENTE', chiusaDa: null, mascherata: false, aggiornataIl: adesso() }
      amicizie.push(a)
    } else {
      Object.assign(a, { richiedenteId: io, riceventeId: altro, eventoId: b.eventoId, stato: 'PENDENTE', chiusaDa: null, mascherata: false, aggiornataIl: adesso() })
    }
    notificheAmicizie.push({ id: nuovoId('na'), destinatarioId: altro, tipo: 'RICHIESTA', amiciziaId: a.id, letta: false, creataIl: adesso() })
    return dopoCambio(HttpResponse.json(inAmiciziaResponse(a, io), { status: 201 }))
  }),

  // ListaAmici: per nome dell'amico
  http.get(api('/friendships'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const lista: AmiciziaResponse[] = amicizie
      .filter((a) => a.stato === 'ACCETTATA' && (a.richiedenteId === me.id || a.riceventeId === me.id))
      .map((a) => inAmiciziaResponse(a, me.id))
      .sort((x, y) => `${x.altroUtente.nome} ${x.altroUtente.cognome}`.localeCompare(`${y.altroUtente.nome} ${y.altroUtente.cognome}`))
    return HttpResponse.json(lista)
  }),

  // ListaRichiesteRicevute e ListaRichiesteInviate: dalla piu' recente
  http.get(api('/friendships/requests'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const lista = amicizie
      .filter((a) => a.stato === 'PENDENTE' && a.riceventeId === me.id)
      .sort((x, y) => y.aggiornataIl.localeCompare(x.aggiornataIl))
      .map((a) => inAmiciziaResponse(a, me.id))
    return HttpResponse.json(lista)
  }),

  http.get(api('/friendships/requests/sent'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const lista = amicizie
      .filter((a) => a.richiedenteId === me.id && (a.stato === 'PENDENTE' || (a.stato === 'RIFIUTATA' && a.mascherata)))
      .sort((x, y) => y.aggiornataIl.localeCompare(x.aggiornataIl))
      .map((a) => inAmiciziaResponse(a, me.id))
    return HttpResponse.json(lista)
  }),

  http.post(api('/friendships/:amiciziaId/accept'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const a = miaAmicizia(params.amiciziaId, me.id)
    if (!a) return errore('NON_TROVATO')
    if (a.riceventeId !== me.id) return errore('NON_RICEVENTE')
    if (a.stato !== 'PENDENTE') return errore('NON_IN_ATTESA')
    if (!utenti.find((u) => u.id === a.richiedenteId)!.attivo) return errore('UTENTE_NON_ATTIVO')
    Object.assign(a, { stato: 'ACCETTATA', aggiornataIl: adesso() })
    // Chat della coppia: si riusa quella vecchia, con lo storico
    if (!chatDellaCoppia(a.richiedenteId, a.riceventeId)) {
      chat.push({ id: nuovoId('c'), membri: [a.richiedenteId, a.riceventeId], creataIl: adesso() })
    }
    for (const n of notificheAmicizie) if (n.amiciziaId === a.id && n.tipo === 'RICHIESTA') n.letta = true
    notificheAmicizie.push({ id: nuovoId('na'), destinatarioId: a.richiedenteId, tipo: 'ACCETTATA', amiciziaId: a.id, letta: false, creataIl: adesso() })
    return dopoCambio(HttpResponse.json(inAmiciziaResponse(a, me.id)))
  }),

  // Rifiuto mascherato: il richiedente continua a vedere la richiesta come inviata
  http.post(api('/friendships/:amiciziaId/reject'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const a = miaAmicizia(params.amiciziaId, me.id)
    if (!a) return errore('NON_TROVATO')
    if (a.riceventeId !== me.id) return errore('NON_RICEVENTE')
    if (a.stato !== 'PENDENTE') return errore('NON_IN_ATTESA')
    Object.assign(a, { stato: 'RIFIUTATA', chiusaDa: me.id, mascherata: true, aggiornataIl: adesso() })
    for (const n of notificheAmicizie) if (n.amiciziaId === a.id && n.tipo === 'RICHIESTA') n.letta = true
    return dopoCambio(nessunContenuto())
  }),

  http.post(api('/friendships/:amiciziaId/withdraw'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const a = miaAmicizia(params.amiciziaId, me.id)
    if (!a) return errore('NON_TROVATO')
    if (a.richiedenteId !== me.id) return errore('NON_RICHIEDENTE')
    if (a.stato === 'PENDENTE') {
      Object.assign(a, { stato: 'RITIRATA', aggiornataIl: adesso() })
      // Le notifiche della richiesta ricevute dall'altro spariscono
      for (let i = notificheAmicizie.length - 1; i >= 0; i--) {
        if (notificheAmicizie[i].amiciziaId === a.id && notificheAmicizie[i].tipo === 'RICHIESTA') notificheAmicizie.splice(i, 1)
      }
    } else if (a.stato === 'RIFIUTATA' && a.mascherata) {
      a.mascherata = false
    } else {
      return errore('NON_IN_ATTESA')
    }
    return dopoCambio(nessunContenuto())
  }),

  // La chat resta, in sola lettura; l'altro vede NON_DISPONIBILE
  http.post(api('/friendships/:amiciziaId/remove'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const a = miaAmicizia(params.amiciziaId, me.id)
    if (!a) return errore('NON_TROVATO')
    if (a.stato !== 'ACCETTATA') return errore('NON_AMICI')
    Object.assign(a, { stato: 'RIMOSSA', chiusaDa: me.id, aggiornataIl: adesso() })
    return dopoCambio(nessunContenuto())
  }),

  // ---------- 9. Chat ----------

  // ListaChat: anche quelle in sola lettura, dall'ultimo messaggio (senza messaggi: creata_il)
  http.get(api('/chats'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const quando = (c: (typeof chat)[number]) => inChatResponse(c, me.id).ultimoMessaggio?.inviatoIl ?? c.creataIl
    const lista = chat
      .filter((c) => c.membri.includes(me.id))
      .sort((x, y) => quando(y).localeCompare(quando(x)))
      .map((c) => inChatResponse(c, me.id))
    return HttpResponse.json(lista)
  }),

  // ListaMessaggi: a cursore (before = id del piu' vecchio gia' caricato), dal piu' recente
  http.get(api('/chats/:chatId/messages'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const url = new URL(request.url)
    const size = Number(url.searchParams.get('size') ?? LIMITI_SOCIAL.messaggiPerPagina)
    if (!Number.isInteger(size) || size < 1 || size > LIMITI_SOCIAL.messaggiPerPaginaMax) return errore('VALIDAZIONE', { size: 'da 1 a 100' })
    const c = trovaChat(params.chatId)
    if (!c) return errore('NON_TROVATO')
    if (!c.membri.includes(me.id)) return errore('NON_MEMBRO')

    const tutti = messaggi
      .filter((m) => m.chatId === c.id)
      .sort((x, y) => y.inviatoIl.localeCompare(x.inviatoIl) || y.id.localeCompare(x.id))
    const before = url.searchParams.get('before')
    let inizio = 0
    if (before) {
      const i = tutti.findIndex((m) => m.id === before)
      if (i < 0) return errore('NON_TROVATO')
      inizio = i + 1
    }
    const corpo: MessaggiResponse = { messaggi: tutti.slice(inizio, inizio + size), altri: tutti.length > inizio + size }
    return HttpResponse.json(corpo)
  }),

  http.patch(api('/chats/:chatId/read'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const c = trovaChat(params.chatId)
    if (!c) return errore('NON_TROVATO')
    if (!c.membri.includes(me.id)) return errore('NON_MEMBRO')
    segnaChatLetta(c.id, me.id)
    return nessunContenuto()
  }),

  // ---------- 10. Notifiche ----------

  http.get(api('/notifications/events'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const lista = notificheEventi
      .filter((n) => n.destinatarioId === me.id)
      .sort((x, y) => y.creataIl.localeCompare(x.creataIl))
      .map(inNotificaEvento)
    const corpo = pagina(lista, new URL(request.url))
    return corpo ? HttpResponse.json(corpo) : errore('VALIDAZIONE', { size: 'da 1 a 100' })
  }),

  http.get(api('/notifications/friendships'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const lista = notificheAmicizie
      .filter((n) => n.destinatarioId === me.id)
      .sort((x, y) => y.creataIl.localeCompare(x.creataIl))
      .map(inNotificaAmicizia)
    const corpo = pagina(lista, new URL(request.url))
    return corpo ? HttpResponse.json(corpo) : errore('VALIDAZIONE', { size: 'da 1 a 100' })
  }),

  // Una per chat con messaggi non letti, senza paginazione
  http.get(api('/notifications/chats'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    return risposta ?? HttpResponse.json(notificheChat(me.id))
  }),

  http.get(api('/notifications/unread-count'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const corpo: ConteggiNonLette = {
      events: notificheEventi.filter((n) => n.destinatarioId === me.id && !n.letta).length,
      friendships: notificheAmicizie.filter((n) => n.destinatarioId === me.id && !n.letta).length,
      chats: notificheChat(me.id).length,
    }
    return HttpResponse.json(corpo)
  }),

  // SegnaTutteLette: senza categoria, tutte; per le chat segna letti anche i messaggi
  http.patch(api('/notifications/read-all'), async ({ request }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const categoria = new URL(request.url).searchParams.get('categoria')
    if (categoria !== null && !categoriaValida(categoria)) return errore('CATEGORIA_NON_VALIDA')
    const tutte = categoria === null
    if (tutte || categoria === 'events') for (const n of notificheEventi) if (n.destinatarioId === me.id) n.letta = true
    if (tutte || categoria === 'friendships') for (const n of notificheAmicizie) if (n.destinatarioId === me.id) n.letta = true
    if (tutte || categoria === 'chats') for (const c of chat) if (c.membri.includes(me.id)) segnaChatLetta(c.id, me.id)
    return nessunContenuto()
  }),

  // SegnaNotificaLetta: la categoria dice dove cercare; per chats = SegnaChatLetta
  http.patch(api('/notifications/:categoria/:notificaId/read'), async ({ request, params }) => {
    await delay(RITARDO)
    const { account: me, risposta } = conLogin(request)
    if (risposta) return risposta
    const { categoria, notificaId } = params
    if (!categoriaValida(categoria)) return errore('CATEGORIA_NON_VALIDA')
    if (categoria === 'chats') {
      const n = notificheChat(me.id).find((x) => x.id === notificaId)
      if (!n) return errore('NON_TROVATO')
      segnaChatLetta(n.riferimentoId, me.id)
      return nessunContenuto()
    }
    const lista = categoria === 'events' ? notificheEventi : notificheAmicizie
    const n = lista.find((x) => x.id === notificaId && x.destinatarioId === me.id)
    if (!n) return errore('NON_TROVATO')
    n.letta = true
    return nessunContenuto()
  }),
]
