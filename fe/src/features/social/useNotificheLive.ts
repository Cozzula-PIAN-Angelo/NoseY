import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { apiEventi } from '@/features/eventi/apiEventi'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { iscriviti } from '@/lib/websocket'
import type { AppDispatch } from '@/store'
import { mostraAvviso } from '@/store/avvisiSlice'
import { selezionaUtente } from '@/store/sessioneSlice'
import { CODE_WEBSOCKET, type MessaggioResponse, type NotificaResponse } from '@/types/api'
import { apiSocial } from './apiSocial'
import { aspettoNotifica } from './notifiche'

// Notifiche live (FE2-13, progettazione v4 sezioni 10 e 11), finche' c'e' la connessione: la usa
// components/layout/ConnessioneLive, in tutta l'app e non solo nella pagina delle notifiche.
// - /user/queue/notifications (solo events e friendships): avviso a comparsa con il testo e si
//   ricaricano il conteggio dei non letti e la lista della categoria. Un id gia' ricevuto e' una
//   notifica accorpata: ricaricando, la lista la sostituisce e il conteggio del backend non cresce.
//   Si ricarica anche cio' a cui la notifica si riferisce: chi sta guardando l'evento lo vede
//   cambiare (modifica, annullamento, nuove iscrizioni, foto rimossa), chi sta guardando gli amici
//   vede comparire la richiesta.
// - /user/queue/messages: per le chat non arrivano notifiche (sezione 10), il badge lo cambia il
//   messaggio dell'amico. In piu' un avviso a comparsa cliccabile che apre la chat (solo frontend),
//   tranne quando quella chat e' gia' aperta.

/** Oltre questa lunghezza il testo del messaggio nell'avviso finisce con "…" */
const ANTEPRIMA = 80

/**
 * Avviso a comparsa per un messaggio dell'amico: cliccandolo si apre la chat. Uno per chat (chiave):
 * con piu' messaggi di fila resta l'ultimo. Il messaggio porta solo l'id del mittente: il nome si
 * prende dall'elenco delle chat in cache, oppure lo si chiede una volta; se manca, senza nome.
 */
const avvisaMessaggio =
  (m: MessaggioResponse) =>
  async (dispatch: AppDispatch) => {
    // Dalla cache se l'elenco c'e' gia' (nessuna richiesta), altrimenti una GET /api/chats
    const elenco = await dispatch(apiSocial.endpoints.listaChat.initiate(undefined, { subscribe: false }))
      .unwrap()
      .catch(() => [])
    const amico = elenco.find((c) => c.id === m.chatId)?.amico
    const testo = m.testo.length > ANTEPRIMA ? `${m.testo.slice(0, ANTEPRIMA).trimEnd()}…` : m.testo
    dispatch(
      mostraAvviso({
        tipo: 'info',
        titolo: amico ? `Nuovo messaggio da ${amico.nome} ${amico.cognome}` : 'Nuovo messaggio',
        messaggio: testo,
        link: `/chat/${m.chatId}`,
        chiave: `chat-${m.chatId}`,
      }),
    )
  }

export function useNotificheLive() {
  const dispatch = useAppDispatch()
  const io = useAppSelector(selezionaUtente)?.id
  // Pagina attuale in un ref: la sottoscrizione resta la stessa anche cambiando pagina
  const { pathname } = useLocation()
  const percorso = useRef(pathname)
  useEffect(() => {
    percorso.current = pathname
  }, [pathname])

  useEffect(() => {
    const annullaNotifiche = iscriviti<NotificaResponse>(CODE_WEBSOCKET.notifiche, (n) => {
      dispatch(apiSocial.util.invalidateTags(['NonLette', { type: 'Notifica', id: n.categoria }]))

      if (n.categoria === 'events' && n.tipo !== 'MANUALE') {
        const id = n.riferimentoId
        dispatch(
          apiEventi.util.invalidateTags([
            { type: 'Evento', id },
            { type: 'Poi', id },
            { type: 'Foto', id },
          ]),
        )
      } else if (n.categoria === 'friendships') {
        // Richiesta ricevuta o accettata: liste, chat nuova e stato nei partecipanti degli eventi
        dispatch(apiSocial.util.invalidateTags(['Amicizia', 'Chat', 'Partecipanti']))
      }

      const { titolo, avviso } = aspettoNotifica(n)
      dispatch(mostraAvviso({ tipo: avviso, titolo, messaggio: n.testo }))
    })

    const annullaMessaggi = iscriviti<MessaggioResponse>(CODE_WEBSOCKET.messaggi, (m) => {
      if (m.mittenteId === io) return
      dispatch(apiSocial.util.invalidateTags(['NonLette', { type: 'Notifica', id: 'chats' }]))
      // Chi sta gia' leggendo quella chat vede il messaggio comparire li': niente avviso doppio
      if (percorso.current === `/chat/${m.chatId}`) return
      dispatch(avvisaMessaggio(m))
    })

    return () => {
      annullaNotifiche()
      annullaMessaggi()
    }
  }, [dispatch, io])
}
