// Endpoint finti delle iscrizioni e dei ticket (progettazione v4, sezione 7, piu' MieiTicket).
import { delay, http, HttpResponse } from 'msw'
import type { PartecipanteResponse, StatoAmicizia } from '@/types/api'
import { amicizieCorrente, eventi, ID_UTENTE_CORRENTE, inTicket, nuovoId, trovaUtente } from '../dati'
import { errore, nessunContenuto, statoDa } from '../utili'
import { api, evento, RITARDO } from './comuni'

export const handlerPartecipanti = [
  // IscrizioneEvento: nessun body, l'utente e' quello "loggato"
  http.post(api('/events/:id/participants'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = evento(params.id)
    if (risposta) return risposta
    if (e.proprietarioId === ID_UTENTE_CORRENTE) return errore('PROPRIETARIO_NON_ISCRIVIBILE')
    const stato = statoDa(e)
    if (stato === 'CONCLUSO') return errore('EVENTO_CONCLUSO')
    if (stato === 'ANNULLATO') return errore('EVENTO_ANNULLATO')
    if (e.partecipanti.some((p) => p.utenteId === ID_UTENTE_CORRENTE)) return errore('GIA_ISCRITTO')

    const iscrizione = {
      utenteId: ID_UTENTE_CORRENTE,
      ticketId: nuovoId('t'),
      codice: crypto.randomUUID(),
      emessoIl: new Date().toISOString(),
    }
    e.partecipanti.push(iscrizione)
    return HttpResponse.json(inTicket(e, iscrizione), { status: 201 })
  }),

  // VediMiaPartecipazione
  http.get(api('/events/:id/participants/me'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = evento(params.id)
    if (risposta) return risposta
    const mia = e.partecipanti.find((p) => p.utenteId === ID_UTENTE_CORRENTE)
    return mia ? HttpResponse.json(inTicket(e, mia)) : errore('NON_TROVATO')
  }),

  // ListaPartecipanti: solo con un ticket o da proprietario; il proprietario in cima; io escluso
  http.get(api('/events/:id/participants'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = evento(params.id)
    if (risposta) return risposta
    const sonoProprietario = e.proprietarioId === ID_UTENTE_CORRENTE
    if (!sonoProprietario && !e.partecipanti.some((p) => p.utenteId === ID_UTENTE_CORRENTE)) return errore('NESSUN_TICKET')

    const riga = (utenteId: string, proprietario: boolean): PartecipanteResponse => {
      const utente = trovaUtente(utenteId)
      const amicizia = amicizieCorrente[utenteId]
      // Un utente non attivo e' NON_DISPONIBILE, tranne che per chi e' gia' amico
      const stato: StatoAmicizia =
        !utente.attivo && amicizia?.stato !== 'AMICI' ? 'NON_DISPONIBILE' : (amicizia?.stato ?? 'NESSUNA')
      const conId = stato === 'INVIATA' || stato === 'RICEVUTA' || stato === 'AMICI'
      return { utente, proprietario, statoAmicizia: stato, amiciziaId: conId ? amicizia!.amiciziaId : null }
    }

    const lista: PartecipanteResponse[] = []
    if (!sonoProprietario) lista.push(riga(e.proprietarioId, true))
    ;[...e.partecipanti]
      .sort((a, b) => Date.parse(a.emessoIl) - Date.parse(b.emessoIl))
      .filter((p) => p.utenteId !== ID_UTENTE_CORRENTE && p.utenteId !== e.proprietarioId)
      .forEach((p) => lista.push(riga(p.utenteId, false)))
    return HttpResponse.json(lista)
  }),

  // CancellaPartecipazione: solo se l'evento e' ancora PROGRAMMATO
  http.delete(api('/events/:id/participants/me'), async ({ params }) => {
    await delay(RITARDO)
    const { evento: e, risposta } = evento(params.id)
    if (risposta) return risposta
    const indice = e.partecipanti.findIndex((p) => p.utenteId === ID_UTENTE_CORRENTE)
    if (indice < 0) return errore('NON_TROVATO')
    const stato = statoDa(e)
    if (stato === 'IN_CORSO') return errore('EVENTO_GIA_INIZIATO')
    if (stato === 'CONCLUSO') return errore('EVENTO_CONCLUSO')
    if (stato === 'ANNULLATO') return errore('EVENTO_ANNULLATO')
    e.partecipanti.splice(indice, 1)
    return nessunContenuto()
  }),

  // MieiTicket: prima PROGRAMMATO e IN_CORSO per dataEvento crescente,
  // poi CONCLUSO e ANNULLATO per dataEvento decrescente
  http.get(api('/users/me/tickets'), async () => {
    await delay(RITARDO)
    const miei = eventi.flatMap((e) =>
      e.partecipanti.filter((p) => p.utenteId === ID_UTENTE_CORRENTE).map((p) => inTicket(e, p)),
    )
    const attivi = miei.filter((t) => t.evento.stato === 'PROGRAMMATO' || t.evento.stato === 'IN_CORSO')
    const chiusi = miei.filter((t) => t.evento.stato === 'CONCLUSO' || t.evento.stato === 'ANNULLATO')
    attivi.sort((a, b) => Date.parse(a.evento.dataEvento) - Date.parse(b.evento.dataEvento))
    chiusi.sort((a, b) => Date.parse(b.evento.dataEvento) - Date.parse(a.evento.dataEvento))
    return HttpResponse.json([...attivi, ...chiusi])
  }),
]
